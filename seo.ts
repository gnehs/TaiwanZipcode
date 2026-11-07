import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"

import { createServer, type Plugin } from "vite"

import {
  ABOUT_META,
  BATCH_META,
  FAQ_META,
  GUIDE_META,
  HOME_META,
  SITE_INTRO,
  SITE_ORIGIN,
  SITE_TITLE,
  WEBSITE_DATA,
} from "./src/lib/site.ts"
import { createAddressUrls } from "./src/utils/addressUrls.js"
import { writePageHead } from "./src/utils/pageHead.js"
import { decodeZipcodeData } from "./src/utils/zipcodeCodec.js"

// A sitemap file holds at most 50,000 URLs.
const SITEMAP_SIZE = 50_000

// Pages that do not depend on the address are files, so only address pages
// run the Worker: the batch, guide, FAQ and about pages, robots.txt, and a
// sitemap of every road plus every lane and house on the doorplate lists.
// Each district gets its own gzipped file under one index.
export function seoFiles(): Plugin {
  return {
    name: "seo-files",
    applyToEnvironment: (environment) => environment.name === "client",
    generateBundle: {
      // index.html is emitted by Vite's own post step.
      order: "post",
      async handler(_, bundle) {
        const index = bundle["index.html"]
        if (index?.type !== "asset") throw new Error("index.html was not built")
        const template = String(index.source)
        const pages = await renderPages()
        const faqUrl = `${SITE_ORIGIN}${FAQ_META.path}`
        const faqData = {
          "@context": "https://schema.org",
          "@graph": [
            WEBSITE_DATA,
            {
              "@type": "FAQPage",
              "@id": faqUrl,
              url: faqUrl,
              name: FAQ_META.title,
              inLanguage: "zh-TW",
              isPartOf: { "@id": WEBSITE_DATA["@id"] },
              mainEntity: pages.faq.map(({ id, question, answer }) => ({
                "@type": "Question",
                "@id": `${faqUrl}#${id}`,
                name: question,
                acceptedAnswer: { "@type": "Answer", text: answer },
              })),
            },
          ],
        }
        index.source = writePageHead(template, {
          ...HOME_META,
          url: `${SITE_ORIGIN}/`,
          indexable: true,
          content: pages.html.get("/"),
        })
        for (const meta of [BATCH_META, GUIDE_META, FAQ_META, ABOUT_META]) {
          this.emitFile({
            type: "asset",
            fileName: `${meta.path.slice(1)}.html`,
            source: writePageHead(template, {
              ...meta,
              url: `${SITE_ORIGIN}${meta.path}`,
              indexable: true,
              content: pages.html.get(meta.path),
              structuredData: meta === FAQ_META ? faqData : undefined,
            }),
          })
        }

        const database = decodeZipcodeData(
          readFileSync(new URL("./src/assets/zipcode.txt", import.meta.url), "utf8"),
        ) as Record<string, { areas: Record<string, { roads: Record<string, { scopes: { zipcode: number }[] }> }> }>
        // Each district's roads, lanes and houses, after the pages that are
        // not an address.
        const urls = createAddressUrls(database)
        const sharePath = (slug: string) => {
          const path = urls.sharePath(slug)
          if (!path) throw new Error(`${slug} is not an address in the database`)
          return path
        }
        const groups = new Map<string, string[]>([
          ["pages", ["/", BATCH_META.path, GUIDE_META.path, FAQ_META.path, ABOUT_META.path]],
        ])
        for (const [city, { areas }] of Object.entries(database)) {
          for (const [area, { roads }] of Object.entries(areas)) {
            groups.set(
              `${city}${area}`,
              Object.keys(roads).map((road) => sharePath(`${city}${area}${road}`)),
            )
          }
        }
        for (const district of readDoorplates<string[]>("index.json")) {
          const paths = groups.get(district)
          if (!paths) throw new Error(`${district} is not a district in the database`)
          const roads = new Set(paths)
          for (const [road, lanes] of Object.entries(
            readDoorplates<Record<string, Record<string, string>>>(`${district}.json`),
          )) {
            if (!roads.has(sharePath(`${district}${road}`))) {
              throw new Error(`${district}${road} is not a road in the database`)
            }
            for (const [lane, numbers] of Object.entries(lanes)) {
              if (lane) paths.push(sharePath(`${district}${road}${lane}`))
              for (const number of numbers.split(",")) {
                const [base, branch] = number.split("-")
                const house = branch ? `${base}之${branch}號` : `${base}號`
                paths.push(sharePath(`${district}${road}${lane}${house}`))
              }
            }
          }
        }

        // A district past the limit is split into numbered parts.
        const sitemaps: string[] = []
        for (const [group, paths] of groups) {
          const parts = Math.ceil(paths.length / SITEMAP_SIZE)
          for (let part = 1; part <= parts; part++) {
            const name = parts > 1 ? `${group}-${part}` : group
            sitemaps.push(`/sitemaps/${encodeURIComponent(name)}.xml.gz`)
            this.emitFile({
              type: "asset",
              fileName: `sitemaps/${name}.xml.gz`,
              source: gzipSync(
                [
                  '<?xml version="1.0" encoding="UTF-8"?>',
                  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                  ...paths
                    .slice((part - 1) * SITEMAP_SIZE, part * SITEMAP_SIZE)
                    .map((path) => `<url><loc>${SITE_ORIGIN}${path}</loc></url>`),
                  "</urlset>",
                  "",
                ].join("\n"),
              ),
            })
          }
        }
        this.emitFile({
          type: "asset",
          fileName: "sitemap.xml",
          source: [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...sitemaps.map((path) => `<sitemap><loc>${SITE_ORIGIN}${path}</loc></sitemap>`),
            "</sitemapindex>",
            "",
          ].join("\n"),
        })
        this.emitFile({ type: "asset", fileName: "llms.txt", source: llmsText(urls) })
        this.emitFile({
          type: "asset",
          fileName: "robots.txt",
          source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
        })
      },
    },
  }
}

// The site in brief for language models (llmstxt.org): what it answers, how
// an address's page is named, and where to start.
function llmsText(urls: ReturnType<typeof createAddressUrls>) {
  const page = (slug: string) => {
    const url = urls.shareUrl(SITE_ORIGIN, slug)
    if (!url) throw new Error(`${slug} is not an address in the database`)
    return url
  }
  const examples = [
    ["臺北市信義區信義路五段7號", "門牌，列出 3+3 郵遞區號與英文地址"],
    ["臺北市信義區信義路五段150巷", "巷，列出範圍與巷內各弄、門牌"],
    ["臺北市信義區信義路五段", "道路，列出整條路的郵遞區號範圍"],
  ]
  return [
    `# ${SITE_TITLE}`,
    "",
    `> ${SITE_INTRO}`,
    "",
    "郵遞區號來自中華郵政 3+3 郵遞區號資料，門牌來自各縣市公開的門牌資料，皆每月同步。查詢結果僅供參考，正確資料以中華郵政公告為準。",
    "",
    `每條道路、巷弄與門牌都有自己的頁面，網址為 \`${SITE_ORIGIN}/a/<區段>/<道路與門牌>\`。<區段> 是行政區常用的郵遞區號前三碼，與其他行政區共用時改用縣市加行政區名稱（如「臺北市大安區」）；<道路與門牌> 是去掉縣市與行政區後的地址，使用阿拉伯數字（如「信義路五段7號」）。頁面列出 3+3 郵遞區號、英文地址、該路的郵遞區號範圍，以及往下各巷弄與門牌的連結。只有道路或巷弄時，後三碼依門牌而定。請求時帶上 \`Accept: text/markdown\`，地址頁會改回傳 Markdown。`,
    "",
    "## 頁面",
    "",
    ...[GUIDE_META, FAQ_META, BATCH_META, ABOUT_META].map(
      (meta) => `- [${meta.title.split("｜")[0]}](${SITE_ORIGIN}${meta.path}): ${meta.description}`,
    ),
    "",
    "## 地址頁範例",
    "",
    ...examples.map(([slug, note]) => `- [${slug}](${page(slug)}): ${note}`),
    "",
    "## Optional",
    "",
    `- [Sitemap](${SITE_ORIGIN}/sitemap.xml): 所有道路、巷弄與門牌頁面`,
    "",
  ].join("\n")
}

// What src/prerender.tsx exports, which this config's TypeScript cannot read.
type Prerender = {
  setPageData(data: { doorplateDates: unknown }): void
  renderPage(path: string): Promise<string>
  faqEntries(): { id: string; question: string; answer: string }[]
}

// Renders the fixed pages with the app's own components, loaded through a
// bare Vite server since the build itself only bundles for the browser.
async function renderPages() {
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL(".", import.meta.url)),
    logLevel: "error",
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
  })
  try {
    const { setPageData, renderPage, faqEntries } = (await server.ssrLoadModule(
      "/src/prerender.tsx",
    )) as Prerender
    setPageData({ doorplateDates: readDoorplates("dates.json") })
    const html = new Map<string, string>()
    for (const path of ["/", BATCH_META.path, GUIDE_META.path, FAQ_META.path, ABOUT_META.path]) {
      html.set(path, await renderPage(path))
    }
    return { html, faq: faqEntries() }
  } finally {
    await server.close()
  }
}

function readDoorplates<T>(fileName: string): T {
  return JSON.parse(
    readFileSync(new URL(`./public/doorplates/${fileName}`, import.meta.url), "utf8"),
  )
}

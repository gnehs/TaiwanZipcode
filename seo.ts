import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"

import { createServer, type Plugin } from "vite"

import { HTML_LANG, LOCALES, localePath, type Locale } from "./src/lib/locale.ts"
import {
  alternates,
  FIXED_PAGE_KEYS,
  fixedPageMeta,
  fixedPagePath,
  pageName,
  SITE_INTRO,
  SITE_ORIGIN,
  SITE_TITLE,
  websiteData,
} from "./src/lib/site.ts"
import { createAddressUrls } from "./src/utils/addressUrls.js"
import { writePageHead } from "./src/utils/pageHead.js"
import { decodeZipcodeData } from "./src/utils/zipcodeCodec.js"

// A sitemap file holds at most 50,000 URLs.
const SITEMAP_SIZE = 50_000

// Pages that do not depend on the address are files, so only address pages
// run the Worker: the batch, guide, FAQ and about pages, robots.txt, and a
// sitemap of every road plus every lane and house on the doorplate lists.
// The URLs fill gzipped files of up to 50,000 each under one index.
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
        for (const locale of LOCALES) {
          for (const page of FIXED_PAGE_KEYS) {
            const meta = fixedPageMeta(page, locale)
            const path = fixedPagePath(page)
            const source = writePageHead(template, {
              ...meta,
              url: `${SITE_ORIGIN}${meta.path}`,
              lang: HTML_LANG[locale],
              siteName: SITE_TITLE[locale],
              alternates: alternates(path),
              indexable: true,
              content: pages.html.get(`${locale}${path}`),
              structuredData:
                page === "faq"
                  ? faqData(locale, meta.title, pages.faq[locale])
                  : { "@context": "https://schema.org", ...websiteData(locale) },
            })
            // /en is served from en.html, and the Chinese home is index.html.
            const fileName = meta.path === "/" ? "index.html" : `${meta.path.slice(1)}.html`
            if (fileName === "index.html") index.source = source
            else this.emitFile({ type: "asset", fileName, source })
          }
          // What an unknown path gets, with a 404: the app without a page of
          // its own, kept out of search results.
          const home = fixedPageMeta("home", locale)
          this.emitFile({
            type: "asset",
            fileName: `${localePath(locale, "/404.html").slice(1)}`,
            source: writePageHead(template, {
              ...home,
              url: `${SITE_ORIGIN}${home.path}`,
              lang: HTML_LANG[locale],
              siteName: SITE_TITLE[locale],
              indexable: false,
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
        const placePath = (city: string, area: string | null = null) => {
          const path = urls.placePath(city, area)
          if (!path) throw new Error(`${city}${area ?? ""} is not a place in the database`)
          return path
        }
        // Each language's fixed pages and every city, district and road; the
        // lanes and houses below are listed in Chinese only, since English
        // searches stop at the road.
        const english = (paths: string[]) => paths.map((path) => localePath("en", path))
        const fixedPaths = FIXED_PAGE_KEYS.map(fixedPagePath)
        const groups = new Map<string, string[]>([
          ["pages", fixedPaths],
          ["en", english(fixedPaths)],
        ])
        for (const [city, { areas }] of Object.entries(database)) {
          const places = [placePath(city), ...Object.keys(areas).map((area) => placePath(city, area))]
          groups.set(city, places)
          groups.get("en")!.push(...english(places))
        }
        for (const [city, { areas }] of Object.entries(database)) {
          for (const [area, { roads }] of Object.entries(areas)) {
            const roadPaths = Object.keys(roads).map((road) => sharePath(`${city}${area}${road}`))
            groups.set(`${city}${area}`, roadPaths)
            groups.get("en")!.push(...english(roadPaths))
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

        // Every path in order, split into numbered files at the limit; the
        // English pages go last so the Chinese files keep their contents.
        const { en: englishPaths, ...chinese } = Object.fromEntries(groups)
        const paths = [...Object.values(chinese).flat(), ...englishPaths]
        const sitemaps: string[] = []
        for (let start = 0; start < paths.length; start += SITEMAP_SIZE) {
          const name = `${sitemaps.length + 1}.xml.gz`
          sitemaps.push(`/sitemaps/${name}`)
          this.emitFile({
            type: "asset",
            fileName: `sitemaps/${name}`,
            source: gzipSync(
              [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                ...paths
                  .slice(start, start + SITEMAP_SIZE)
                  .map((path) => `<url><loc>${SITE_ORIGIN}${path}</loc></url>`),
                "</urlset>",
                "",
              ].join("\n"),
            ),
          })
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
    `# ${SITE_TITLE.zh}`,
    "",
    `> ${SITE_INTRO.zh}`,
    "",
    "郵遞區號來自中華郵政 3+3 郵遞區號資料，門牌來自各縣市公開的門牌資料，皆每月同步。查詢結果僅供參考，正確資料以中華郵政公告為準。",
    "",
    `每條道路、巷弄與門牌都有自己的頁面，網址為 \`${SITE_ORIGIN}/a/<區段>/<道路與門牌>\`。<區段> 是行政區常用的郵遞區號前三碼，與其他行政區共用時改用縣市加行政區名稱（如「臺北市大安區」）；<道路與門牌> 是去掉縣市與行政區後的地址，使用阿拉伯數字（如「信義路五段7號」）。頁面列出 3+3 郵遞區號、英文地址、該路的郵遞區號範圍，以及往下各巷弄與門牌的連結。只有道路或巷弄時，後三碼依門牌而定。請求時帶上 \`Accept: text/markdown\`，地址頁會改回傳 Markdown。`,
    "",
    "## 頁面",
    "",
    ...(["zipcodes", "guide", "faq", "batch", "about"] as const).map((page) => {
      const meta = fixedPageMeta(page, "zh")
      return `- [${pageName(meta.title)}](${SITE_ORIGIN}${meta.path}): ${meta.description}`
    }),
    "",
    "## 地址頁範例",
    "",
    ...examples.map(([slug, note]) => `- [${slug}](${page(slug)}): ${note}`),
    "",
    "## Optional",
    "",
    `- [Sitemap](${SITE_ORIGIN}/sitemap.xml): 所有縣市、行政區、道路、巷弄與門牌頁面`,
    `- [English](${SITE_ORIGIN}/en): 英文版；每個頁面在路徑前加上 \`/en\` 即為英文頁面`,
    "",
  ].join("\n")
}

type FaqEntry = { id: string; question: string; answer: string }

function faqData(locale: Locale, title: string, entries: FaqEntry[]) {
  const website = websiteData(locale)
  const faqUrl = `${SITE_ORIGIN}${localePath(locale, fixedPagePath("faq"))}`
  return {
    "@context": "https://schema.org",
    "@graph": [
      website,
      {
        "@type": "FAQPage",
        "@id": faqUrl,
        url: faqUrl,
        name: title,
        inLanguage: HTML_LANG[locale],
        isPartOf: { "@id": website["@id"] },
        mainEntity: entries.map(({ id, question, answer }) => ({
          "@type": "Question",
          "@id": `${faqUrl}#${id}`,
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  }
}

// What src/prerender.tsx exports, which this config's TypeScript cannot read.
type Prerender = {
  setPageData(data: { doorplateDates: unknown }): void
  renderPage(path: string, locale: Locale): Promise<string>
  faqEntries(locale: Locale): FaqEntry[]
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
    // Keyed by language then path, as in "en/faq".
    const html = new Map<string, string>()
    for (const locale of LOCALES) {
      for (const page of FIXED_PAGE_KEYS) {
        html.set(`${locale}${fixedPagePath(page)}`, await renderPage(fixedPagePath(page), locale))
      }
    }
    return {
      html,
      faq: Object.fromEntries(LOCALES.map((locale) => [locale, faqEntries(locale)])) as Record<
        Locale,
        FaqEntry[]
      >,
    }
  } finally {
    await server.close()
  }
}

function readDoorplates<T>(fileName: string): T {
  return JSON.parse(
    readFileSync(new URL(`./public/doorplates/${fileName}`, import.meta.url), "utf8"),
  )
}

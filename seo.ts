import { readFileSync } from "node:fs"

import type { Plugin } from "vite"

import { ABOUT_META, BATCH_META, FAQ_META, GUIDE_META, SITE_ORIGIN } from "./src/lib/site.ts"
import { writePageHead } from "./src/utils/pageHead.js"
import { decodeZipcodeData } from "./src/utils/zipcodeCodec.js"

// Pages that do not depend on the address are files, so only address pages
// run the Worker: the batch, guide, FAQ and about pages, plus a sitemap of every road and
// robots.txt. House numbers are left out of the sitemap; those pages are
// reached from the road.
export function seoFiles(): Plugin {
  return {
    name: "seo-files",
    applyToEnvironment: (environment) => environment.name === "client",
    generateBundle: {
      // index.html is emitted by Vite's own post step.
      order: "post",
      handler(_, bundle) {
        const index = bundle["index.html"]
        if (index?.type !== "asset") throw new Error("index.html was not built")
        for (const meta of [BATCH_META, GUIDE_META, FAQ_META, ABOUT_META]) {
          this.emitFile({
            type: "asset",
            fileName: `${meta.path.slice(1)}.html`,
            source: writePageHead(String(index.source), {
              ...meta,
              url: `${SITE_ORIGIN}${meta.path}`,
              indexable: true,
            }),
          })
        }

        const database = decodeZipcodeData(
          readFileSync(new URL("./src/assets/zipcode.txt", import.meta.url), "utf8"),
        ) as Record<string, { areas: Record<string, { roads: Record<string, unknown> }> }>
        const paths = ["/", BATCH_META.path, GUIDE_META.path, FAQ_META.path, ABOUT_META.path]
        for (const [city, { areas }] of Object.entries(database)) {
          for (const [area, { roads }] of Object.entries(areas)) {
            for (const road of Object.keys(roads)) {
              paths.push(`/a/${encodeURIComponent(`${city}${area}${road}`)}`)
            }
          }
        }
        this.emitFile({
          type: "asset",
          fileName: "sitemap.xml",
          source: [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...paths.map((path) => `<url><loc>${SITE_ORIGIN}${path}</loc></url>`),
            "</urlset>",
            "",
          ].join("\n"),
        })
        this.emitFile({
          type: "asset",
          fileName: "robots.txt",
          source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
        })
      },
    },
  }
}

import { readFileSync } from "node:fs"

import type { Plugin } from "vite"

import { BATCH_META, SITE_ORIGIN } from "./src/lib/site.ts"
import { writePageHead } from "./src/utils/pageHead.js"
import { decodeZipcodeData } from "./src/utils/zipcodeCodec.js"

// Pages that do not depend on the address are files, so only address pages
// run the Worker: the batch page, plus a sitemap of every road and
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
        this.emitFile({
          type: "asset",
          fileName: "batch.html",
          source: writePageHead(String(index.source), {
            ...BATCH_META,
            url: `${SITE_ORIGIN}${BATCH_META.path}`,
            indexable: true,
          }),
        })

        const database = decodeZipcodeData(
          readFileSync(new URL("./src/assets/zipcode.txt", import.meta.url), "utf8"),
        ) as Record<string, { areas: Record<string, { roads: Record<string, unknown> }> }>
        const paths = ["/", BATCH_META.path]
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

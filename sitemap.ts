import { readFileSync } from "node:fs"

import type { Plugin } from "vite"

import { SITE_ORIGIN } from "./src/lib/site.ts"
import { decodeZipcodeData } from "./src/utils/zipcodeCodec.js"

// Lists every road's page for search engines. House numbers are left out;
// those pages are reached from the road.
export function sitemap(): Plugin {
  return {
    name: "sitemap",
    applyToEnvironment: (environment) => environment.name === "client",
    generateBundle() {
      const database = decodeZipcodeData(
        readFileSync(new URL("./src/assets/zipcode.txt", import.meta.url), "utf8"),
      ) as Record<string, { areas: Record<string, { roads: Record<string, unknown> }> }>
      const paths = ["/", "/batch"]
      for (const [city, { areas }] of Object.entries(database)) {
        for (const [area, { roads }] of Object.entries(areas)) {
          for (const road of Object.keys(roads)) {
            paths.push(`/${[city, area, road].map(encodeURIComponent).join("/")}`)
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
  }
}

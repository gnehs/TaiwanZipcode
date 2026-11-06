import { readFileSync } from "node:fs"
import { gzipSync } from "node:zlib"

import type { Plugin } from "vite"

import { ABOUT_META, BATCH_META, FAQ_META, GUIDE_META, SITE_ORIGIN } from "./src/lib/site.ts"
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
        this.emitFile({
          type: "asset",
          fileName: "robots.txt",
          source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
        })
      },
    },
  }
}

function readDoorplates<T>(fileName: string): T {
  return JSON.parse(
    readFileSync(new URL(`./public/doorplates/${fileName}`, import.meta.url), "utf8"),
  )
}

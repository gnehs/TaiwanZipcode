import { addressIndex, type AddressLookup } from "@/lib/addresses"
import { currentSharePath } from "@/lib/address-path"
import { HTML_LANG, localeOfPath, localePath, pathInApp, type Locale } from "@/lib/locale"
import {
  addressMeta,
  addressStructuredData,
  isIndexableAddress,
  lookupForPath,
  placeForPath,
  placePage,
  placeStructuredData,
} from "@/lib/page-meta"
import { SITE_ORIGIN, SITE_TITLE, alternates, fixedPageMeta } from "@/lib/site"
import { writePageHead } from "@/utils/pageHead.js"

import {
  addressPageHtml,
  addressPageMarkdown,
  placePageHtml,
  placePageMarkdown,
  type RoadDoorplates,
} from "./address-page"
import { ogImageResponse } from "./og-image"

const OG_PREFIX = "/og"
const REFERRER_POLICY = "no-referrer"

function withPrivacy(response: Response) {
  const copy = new Response(response.body, response)
  copy.headers.set("Referrer-Policy", REFERRER_POLICY)
  return copy
}

// Address pages run here before the app loads, so crawlers and link previews
// read each address's own title, description and image. Every other path is a
// static file (see run_worker_first in wrangler.jsonc).
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (url.pathname.startsWith(`${OG_PREFIX}/`)) return withPrivacy(await ogImage(request, ctx))

    const locale = localeOfPath(url.pathname)
    const appPath = pathInApp(url.pathname)
    const moved = currentSharePath(appPath)
    if (moved) return withPrivacy(Response.redirect(new URL(localePath(locale, moved), url).href, 301))

    const page = await addressOrPlacePage(env, url, tidyPath(appPath), locale)
    const meta = page?.meta ?? fixedPageMeta("home", locale)
    // One address has one URL: its other spellings move to it.
    if (page && decoded(url.pathname) !== decoded(meta.path)) {
      return withPrivacy(Response.redirect(new URL(meta.path, url).href, 301))
    }

    // Agents that ask for Markdown get the page's text without the app.
    if (page && wantsMarkdown(request)) {
      return new Response(page.markdown(), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Link: `<${SITE_ORIGIN}${meta.path}>; rel="canonical"`,
          Vary: "Accept",
          "Referrer-Policy": REFERRER_POLICY,
        },
      })
    }

    const app = await env.ASSETS.fetch(new URL(localePath(locale, "/"), url))
    const headers = new Headers(app.headers)
    headers.set("Referrer-Policy", REFERRER_POLICY)
    headers.set("Vary", "Accept")
    // The body differs per path, so the index file's validator does not apply.
    headers.delete("ETag")
    // Unknown paths still get the app, which sends visitors home.
    const html = writePageHead(await app.text(), {
      ...meta,
      url: `${SITE_ORIGIN}${meta.path}`,
      lang: HTML_LANG[locale],
      siteName: SITE_TITLE[locale],
      alternates: page ? alternates(appPath) : undefined,
      image: page?.image,
      indexable: Boolean(page?.indexable),
      structuredData: page?.structuredData,
      content: page?.html,
    })
    return new Response(html, { status: page ? 200 : 404, headers })
  },
} satisfies ExportedHandler<Env>

function decoded(path: string) {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

// The path as the site writes it: full-width digits and letters narrowed,
// and no spaces or trailing slash.
function tidyPath(appPath: string) {
  const tidy = decoded(appPath).normalize("NFKC").replace(/\s+/gu, "").replace(/\/+$/, "")
  return tidy.split("/").map(encodeURIComponent).join("/") || "/"
}

// Rendering takes far longer than serving, so each image is rendered once
// per data center and then served from the cache.
async function ogImage(request: Request, ctx: ExecutionContext) {
  const cached = await caches.default.match(request)
  if (cached) return cached
  const path = new URL(request.url).pathname.slice(OG_PREFIX.length)
  const lookup = lookupForPath(pathInApp(path))
  if (!lookup) return new Response("Not found", { status: 404 })
  const response = await ogImageResponse(lookup, localeOfPath(path))
  await response.ready
  ctx.waitUntil(caches.default.put(request, response.clone()))
  return response
}

// An address, or a city or district, at this path inside the app, as what
// the page needs: its head, its HTML and its Markdown.
async function addressOrPlacePage(env: Env, url: URL, appPath: string, locale: Locale) {
  const place = placeForPath(appPath)
  if (place) {
    const page = placePage(locale, place.city, place.area)
    return {
      meta: page.meta,
      indexable: true,
      image: undefined,
      structuredData: placeStructuredData(page, locale),
      html: placePageHtml(page, locale),
      markdown: () => placePageMarkdown(page, locale),
    }
  }
  const lookup = lookupForPath(appPath)
  if (!lookup) return null
  const meta = addressMeta(lookup, locale)
  const doorplates = await roadDoorplates(env, url, lookup)
  const image = `${SITE_ORIGIN}${OG_PREFIX}${meta.path}`
  return {
    meta,
    indexable: isIndexableAddress(lookup),
    image,
    structuredData: addressStructuredData(lookup, locale, image),
    html: addressPageHtml(lookup, doorplates, locale),
    markdown: () => addressPageMarkdown(lookup, doorplates, locale) ?? "",
  }
}

// Browsers never list text/markdown, so naming it at all is asking for it.
function wantsMarkdown(request: Request) {
  return /(^|,)\s*text\/markdown\b(?!\s*;\s*q=0(\.0*)?\s*(,|$))/i.test(
    request.headers.get("Accept") ?? "",
  )
}

type DistrictDoorplates = Record<string, RoadDoorplates>

// Each district's doorplates are read once per isolate. A district without a
// file gets the app instead of JSON, so it has none.
const districtFiles = new Map<string, Promise<DistrictDoorplates | null>>()

async function roadDoorplates(env: Env, url: URL, lookup: AddressLookup) {
  const place = addressIndex.placeByAddress[lookup.road]
  if (!place) return null
  const district = `${place.city}${place.area}`
  let file = districtFiles.get(district)
  if (!file) {
    file = env.ASSETS.fetch(new URL(`/doorplates/${encodeURIComponent(district)}.json`, url)).then(
      (response) =>
        response.ok && response.headers.get("Content-Type")?.includes("json")
          ? response.json<DistrictDoorplates>()
          : null,
    )
    file.catch(() => districtFiles.delete(district))
    districtFiles.set(district, file)
  }
  return (await file.catch(() => null))?.[place.road] ?? null
}

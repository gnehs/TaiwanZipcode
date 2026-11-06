import { currentSharePath } from "@/lib/address-path"
import { addressMeta, lookupForPath } from "@/lib/page-meta"
import { HOME_META, SITE_ORIGIN } from "@/lib/site"
import { writePageHead } from "@/utils/pageHead.js"
import { visitPoint } from "@/utils/visitPoint.js"

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

    const moved = currentSharePath(url.pathname)
    if (moved) return withPrivacy(Response.redirect(new URL(moved, url).href, 301))

    const lookup = lookupForPath(url.pathname)
    const meta = lookup ? addressMeta(lookup) : HOME_META
    if (lookup) env.VISITS.writeDataPoint(visitPoint(request.headers.get("User-Agent"), meta.path))
    const page = await env.ASSETS.fetch(new URL("/", url))
    const headers = new Headers(page.headers)
    headers.set("Referrer-Policy", REFERRER_POLICY)
    // The body differs per path, so the index file's validator does not apply.
    headers.delete("ETag")
    // Unknown paths still get the app, which sends visitors home.
    const html = writePageHead(await page.text(), {
      ...meta,
      url: `${SITE_ORIGIN}${meta.path}`,
      image: lookup ? `${SITE_ORIGIN}${OG_PREFIX}${meta.path}` : undefined,
      indexable: Boolean(lookup),
    })
    return new Response(html, { status: lookup ? 200 : 404, headers })
  },
} satisfies ExportedHandler<Env>

// Rendering takes far longer than serving, so each image is rendered once
// per data center and then served from the cache.
async function ogImage(request: Request, ctx: ExecutionContext) {
  const cached = await caches.default.match(request)
  if (cached) return cached
  const lookup = lookupForPath(new URL(request.url).pathname.slice(OG_PREFIX.length))
  if (!lookup) return new Response("Not found", { status: 404 })
  const response = await ogImageResponse(lookup)
  await response.ready
  ctx.waitUntil(caches.default.put(request, response.clone()))
  return response
}

import { addressMeta, lookupForPath } from "@/lib/page-meta"
import { placePhoto } from "@/lib/place-photos"
import { HOME_META, SITE_ORIGIN } from "@/lib/site"
import { writePageHead } from "@/utils/pageHead.js"

import { ogImageResponse } from "./og-image"

const OG_PREFIX = "/og"

// Address pages run here before the app loads, so crawlers and link previews
// read each address's own title, description and image. Every other path is a
// static file (see run_worker_first in wrangler.jsonc).
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (url.pathname.startsWith(`${OG_PREFIX}/`)) return ogImage(request, env, ctx)

    const lookup = lookupForPath(url.pathname)
    const meta = lookup ? addressMeta(lookup) : HOME_META
    const page = await env.ASSETS.fetch(new URL("/", url))
    const headers = new Headers(page.headers)
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
async function ogImage(request: Request, env: Env, ctx: ExecutionContext) {
  const cached = await caches.default.match(request)
  if (cached) return cached
  const lookup = lookupForPath(new URL(request.url).pathname.slice(OG_PREFIX.length))
  if (!lookup) return new Response("Not found", { status: 404 })
  const photo = await env.ASSETS.fetch(new URL(placePhoto(lookup.road), request.url))
  const response = await ogImageResponse(
    lookup,
    photo.ok ? await dataUrl(photo) : undefined,
  )
  await response.ready
  ctx.waitUntil(caches.default.put(request, response.clone()))
  return response
}

async function dataUrl(response: Response) {
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ""
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000))
  }
  return `data:${response.headers.get("Content-Type") ?? "image/webp"};base64,${btoa(binary)}`
}

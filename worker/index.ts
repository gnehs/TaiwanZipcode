import { metaForPath } from "@/lib/page-meta"
import { HOME_META, SITE_ORIGIN } from "@/lib/site"
import { writePageHead } from "@/utils/pageHead.js"

// Address pages run here before the app loads, so crawlers and link previews
// read each address's own title and description. Every other path is a
// static file (see run_worker_first in wrangler.jsonc).
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const meta = metaForPath(url.pathname)
    const page = await env.ASSETS.fetch(new URL("/", url))
    const headers = new Headers(page.headers)
    // The body differs per path, so the index file's validator does not apply.
    headers.delete("ETag")
    // Unknown paths still get the app, which sends visitors home.
    const html = writePageHead(await page.text(), {
      ...(meta ?? HOME_META),
      url: `${SITE_ORIGIN}${(meta ?? HOME_META).path}`,
      indexable: Boolean(meta),
    })
    return new Response(html, { status: meta ? 200 : 404, headers })
  },
} satisfies ExportedHandler<Env>

import { HOME_META, metaForPath, type PageMeta } from "@/lib/page-meta"
import { SITE_ORIGIN } from "@/lib/site"

// Pages run here before the app loads, so crawlers and link previews read
// each address's own title and description. Files skip the Worker (see
// run_worker_first in wrangler.jsonc).
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const meta = metaForPath(url.pathname)
    const page = await env.ASSETS.fetch(new URL("/", url))
    // Unknown paths still get the app, which sends visitors home.
    return withMeta(page, meta ?? HOME_META, meta ? 200 : 404)
  },
} satisfies ExportedHandler<Env>

function withMeta(page: Response, meta: PageMeta, status: number) {
  const url = `${SITE_ORIGIN}${meta.path}`
  const setContent = (value: string): HTMLRewriterElementContentHandlers => ({
    element: (element) => {
      element.setAttribute("content", value)
    },
  })
  const headers = new Headers(page.headers)
  // The body differs per path, so the index file's validator does not apply.
  headers.delete("ETag")

  let rewriter = new HTMLRewriter()
    .on("title", {
      element: (element) => {
        element.setInnerContent(meta.title)
      },
    })
    .on("head", {
      element: (element) => {
        element.append(
          status === 200
            ? `<link rel="canonical" href="${escapeAttribute(url)}">`
            : `<meta name="robots" content="noindex">`,
          { html: true },
        )
      },
    })
  for (const [selector, value] of [
    ['meta[name="title"]', meta.title],
    ['meta[property="og:title"]', meta.title],
    ['meta[property="twitter:title"]', meta.title],
    ['meta[name="description"]', meta.description],
    ['meta[property="og:description"]', meta.description],
    ['meta[property="twitter:description"]', meta.description],
    ['meta[property="og:url"]', url],
    ['meta[property="twitter:url"]', url],
  ]) {
    rewriter = rewriter.on(selector, setContent(value))
  }
  return rewriter.transform(new Response(page.body, { status, headers }))
}

function escapeAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
}

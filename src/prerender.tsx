import { renderToString } from "react-dom/server"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"

import { knownDoorplateDates, setDoorplateDates, type DoorplateDate } from "@/lib/doorplates"
import { LocaleProvider, localePath, routerBase, type Locale } from "@/lib/locale"
import { questions } from "@/routes/faq"
import { routeTree } from "@/routeTree.gen"

// The build renders each page that is the same for every visitor, so readers
// that do not run the app still get its text and links. The app replaces it
// once it starts (see main.tsx).

export function setPageData({ doorplateDates }: { doorplateDates: Record<string, DoorplateDate> }) {
  setDoorplateDates(doorplateDates)
}

/** The page at this path inside the app, in one language. */
export async function renderPage(path: string, locale: Locale) {
  const router = createRouter({
    routeTree,
    basepath: routerBase(locale),
    // The English home is "/en/" here: the router does not match "/en" alone
    // against its own base.
    history: createMemoryHistory({
      initialEntries: [path === "/" ? `${localePath(locale, "")}/` : localePath(locale, path)],
    }),
  })
  await router.load()
  const html = renderToString(
    <LocaleProvider value={locale}>
      <RouterProvider router={router} />
    </LocaleProvider>,
  )
  if (!html) throw new Error(`${localePath(locale, path)} rendered nothing`)
  // React leaves this mark where a part failed and would be left to the app.
  if (html.includes("<!--$!-->")) throw new Error(`${path} did not render in full`)
  return html
}

const textOf = (html: string) =>
  html
    .replace(/<\/dt>/g, "：")
    .replace(/<\/(p|dd|div)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n+/g, "\n")
    .trim()

/** The FAQ page's questions and answers, as text, for its structured data. */
export function faqEntries(locale: Locale) {
  return questions(knownDoorplateDates(), locale).map(({ id, question, answer }) => ({
    id,
    question,
    answer: textOf(renderToString(<>{answer}</>)),
  }))
}

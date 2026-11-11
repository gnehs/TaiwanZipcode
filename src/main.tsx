import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"

import { LocaleProvider, localeOfPath, routerBase } from "@/lib/locale"
import { initializeTheme } from "@/lib/theme"
import { canViewTransition, pageTransitionType } from "@/lib/view-transition"
import { routeTree } from "@/routeTree.gen"
import "@/index.css"

// The language comes from the path the page was opened at; switching it
// loads the other language's page.
const locale = localeOfPath(window.location.pathname)

const router = createRouter({
  routeTree,
  basepath: routerBase(locale),
  defaultPreload: "intent",
  // Only a change of page animates (see index.css); typing an address
  // replaces the URL on every keystroke.
  defaultViewTransition: canViewTransition() && {
    types: ({ toLocation }) => {
      const type = pageTransitionType(toLocation.pathname)
      if (!type || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false
      return [type]
    },
  },
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

const disposeTheme = initializeTheme()
if (import.meta.hot) import.meta.hot.dispose(disposeTheme)

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <LocaleProvider value={locale}>
      <RouterProvider router={router} />
    </LocaleProvider>
  </StrictMode>,
)

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"

import { initializeTheme } from "@/lib/theme"
import { canViewTransition } from "@/lib/view-transition"
import { routeTree } from "@/routeTree.gen"
import "@/index.css"

const isBatchPath = (pathname: string) => pathname === "/batch"

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // Only a switch between single and batch lookup animates (see index.css);
  // typing an address replaces the URL on every keystroke.
  defaultViewTransition: canViewTransition() && {
    types: ({ fromLocation, toLocation }) => {
      if (!fromLocation || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return false
      }
      const toBatch = isBatchPath(toLocation.pathname)
      if (toBatch === isBatchPath(fromLocation.pathname)) return false
      return [toBatch ? "to-batch" : "to-single"]
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

const app = document.getElementById("app")!
// The build or the Worker already drew this page; see RootLayout.
if (app.hasChildNodes()) document.documentElement.dataset.prerendered = ""

createRoot(app).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

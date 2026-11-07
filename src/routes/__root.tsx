import { useEffect } from "react"
import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router"

import { SiteFooter } from "@/components/site-footer"
import { loadCorrections } from "@/lib/addresses"

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <Navigate to="/" replace />,
})

function RootLayout() {
  useEffect(() => {
    void loadCorrections()
  }, [])
  // Once the app has replaced the server's copy of the page, what mounts
  // later rises in as usual.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      delete document.documentElement.dataset.prerendered
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-x-clip bg-background">
      <Outlet />
      <SiteFooter />
    </div>
  )
}

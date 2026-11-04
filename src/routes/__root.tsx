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

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <Outlet />
      <SiteFooter />
    </div>
  )
}

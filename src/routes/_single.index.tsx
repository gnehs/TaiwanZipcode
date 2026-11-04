import { createFileRoute, redirect } from "@tanstack/react-router"

import { readLegacyHash } from "@/lib/address-path"

export const Route = createFileRoute("/_single/")({
  beforeLoad: ({ location }) => {
    if (!location.hash) return
    if (location.hash.replace(/^#/, "") === "batch") {
      throw redirect({ to: "/batch", replace: true })
    }
    const address = readLegacyHash(location.hash)
    if (address) {
      throw redirect({ to: "/a/$address", params: { address }, replace: true })
    }
  },
})

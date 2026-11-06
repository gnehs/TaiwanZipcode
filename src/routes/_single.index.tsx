import { createFileRoute, redirect } from "@tanstack/react-router"

import { slugOfLegacyHash, hashOfSlug } from "@/lib/address-path"

export const Route = createFileRoute("/_single/")({
  beforeLoad: ({ location }) => {
    if (!location.hash) return
    if (location.hash.replace(/^#/, "") === "batch") {
      throw redirect({ to: "/batch", replace: true })
    }
    const slug = slugOfLegacyHash(location.hash)
    if (slug) throw redirect({ to: "/", hash: hashOfSlug(slug), replace: true })
  },
})

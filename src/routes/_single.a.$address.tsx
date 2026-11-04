import { createFileRoute, redirect } from "@tanstack/react-router"

import { parseAddressSlug } from "@/lib/address-path"

export const Route = createFileRoute("/_single/a/$address")({
  beforeLoad: ({ params }) => {
    if (!parseAddressSlug(params.address)) throw redirect({ to: "/", replace: true })
  },
})

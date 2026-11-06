import { createFileRoute, redirect } from "@tanstack/react-router"

import { slugOfShareParts } from "@/lib/address-path"

export const Route = createFileRoute("/_single/a/$district/$address")({
  beforeLoad: ({ params }) => {
    if (!slugOfShareParts(params.district, params.address)) {
      throw redirect({ to: "/", replace: true })
    }
  },
})

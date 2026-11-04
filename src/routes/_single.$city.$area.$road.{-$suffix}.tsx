import { createFileRoute, redirect } from "@tanstack/react-router"

import { queryFromParams } from "@/lib/address-path"

export const Route = createFileRoute("/_single/$city/$area/$road/{-$suffix}")({
  beforeLoad: ({ params }) => {
    if (!queryFromParams(params)) throw redirect({ to: "/", replace: true })
  },
})

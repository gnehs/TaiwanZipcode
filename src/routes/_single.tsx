import { createFileRoute } from "@tanstack/react-router"

import { SingleLookup } from "@/components/single-lookup"

// The home page and every address share this layout, so typing an address
// changes the URL without remounting the search.
export const Route = createFileRoute("/_single")({
  component: SingleLookup,
})

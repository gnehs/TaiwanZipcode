import { createLazyFileRoute } from "@tanstack/react-router"

import { BatchLookup } from "@/components/batch-lookup"
import { PageShell } from "@/components/page-shell"
import { usePageTitle } from "@/lib/page-title"

// Lazy, so single-lookup visitors never download the spreadsheet. The router
// loads it before switching, so the mode-switch transition captures it.
export const Route = createLazyFileRoute("/batch")({
  component: BatchPage,
})

function BatchPage() {
  usePageTitle("batch")

  return (
    <PageShell page="batch" raised>
      <BatchLookup />
    </PageShell>
  )
}

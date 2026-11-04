import { useEffect } from "react"
import { createLazyFileRoute } from "@tanstack/react-router"

import { BatchLookup } from "@/components/batch-lookup"
import { PageShell } from "@/components/page-shell"
import { BATCH_META } from "@/lib/site"

// Lazy, so single-lookup visitors never download the spreadsheet. The router
// loads it before switching, so the mode-switch transition captures it.
export const Route = createLazyFileRoute("/batch")({
  component: BatchPage,
})

function BatchPage() {
  useEffect(() => {
    document.title = BATCH_META.title
  }, [])

  return (
    <PageShell isBatch raised>
      <BatchLookup />
    </PageShell>
  )
}

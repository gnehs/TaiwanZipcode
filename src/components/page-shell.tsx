import type { ReactNode } from "react"

import { SiteHeader } from "@/components/site-header"
import { cn } from "@/lib/utils"

export type Page = "single" | "batch" | "about" | "faq" | "guide" | "place" | "zipcodes"

export function PageShell({
  page,
  raised,
  onHome,
  children,
}: {
  page: Page
  raised: boolean
  onHome?: () => void
  children: ReactNode
}) {
  // The single lookup always sits on the photo band.
  const onBand = page === "single"
  return (
    <>
      <SiteHeader page={page} onBand={onBand} onHome={onHome} />
      <main
        className={cn(
          "relative mx-auto flex w-full flex-1 flex-col gap-3 px-4 transition-[padding] duration-500 ease-out motion-reduce:transition-none sm:px-6 print:px-0 print:pt-8",
          page === "batch" ? "max-w-6xl" : "max-w-2xl",
          // The search rises once a result appears below it.
          raised ? "pt-6 sm:pt-8" : "pt-10 sm:pt-[9vh]",
        )}
      >
        {/* Each page is its own view-transition layer, so one can leave while
            the other arrives. */}
        <div
          className={cn(
            "flex flex-col gap-3",
            {
              single: "[view-transition-name:page-single]",
              batch: "[view-transition-name:page-batch]",
              about: "[view-transition-name:page-about]",
              faq: "[view-transition-name:page-faq]",
              guide: "[view-transition-name:page-guide]",
              place: "[view-transition-name:page-place]",
              zipcodes: "[view-transition-name:page-zipcodes]",
            }[page],
          )}
        >
          {children}
        </div>
      </main>
    </>
  )
}

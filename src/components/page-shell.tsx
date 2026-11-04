import type { ReactNode } from "react"

import { ModeSwitch } from "@/components/mode-switch"
import { SiteHeader } from "@/components/site-header"
import { cn } from "@/lib/utils"

export function PageShell({
  isBatch,
  raised,
  onHome,
  children,
}: {
  isBatch: boolean
  raised: boolean
  onHome?: () => void
  children: ReactNode
}) {
  return (
    <main
      className={cn(
        "relative mx-auto flex w-full flex-1 flex-col gap-3 px-4 transition-[padding] duration-500 ease-out motion-reduce:transition-none sm:px-6",
        isBatch ? "max-w-6xl" : "max-w-2xl",
        // The search rises once a result appears below it.
        raised ? "pt-4 sm:pt-8" : "pt-14 sm:pt-[16vh]",
      )}
    >
      <SiteHeader compact={raised} onHome={onHome} />
      <ModeSwitch isBatch={isBatch} />
      {/* Each page is its own view-transition layer, so one can leave while
          the other arrives. */}
      <div
        className={cn(
          "flex flex-col gap-3",
          isBatch
            ? "[view-transition-name:page-batch]"
            : "[view-transition-name:page-single]",
        )}
      >
        {children}
      </div>
    </main>
  )
}

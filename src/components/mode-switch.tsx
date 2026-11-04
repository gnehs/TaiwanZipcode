import { Link } from "@tanstack/react-router"

import type { Page } from "@/components/page-shell"
import { cn } from "@/lib/utils"

const MODES = [
  { to: "/", label: "單筆查詢", page: "single" },
  { to: "/batch", label: "批次查詢", page: "batch" },
] as const

// Each mode has its own path, so each link is a real, shareable destination.
// One pill slides under the current mode; the two halves share a width so
// a translate of 100% lands exactly on the other one. During a mode switch
// the switch, pill and labels are view-transition layers in that order, so
// the pill slides across under the labels.
// Pages outside the two modes, like about and the guide, leave both unselected.
export function ModeSwitch({ page, onBand }: { page: Page; onBand: boolean }) {
  const isBatch = page === "batch"
  return (
    <nav aria-label="查詢模式">
      <div
        className={cn(
          "relative grid grid-cols-2 rounded-full p-1 transition-[background-color,box-shadow] duration-500 ease-out [view-transition-name:mode-switch]",
          // On the band it looks the same in both themes.
          onBand ? "bg-white/20 dark:light-scheme" : "bg-card shadow-surface",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full transition-[translate,background-color] duration-300 ease-out [view-transition-name:mode-pill] motion-reduce:transition-none",
            onBand ? "bg-card" : "bg-secondary",
            isBatch && "translate-x-full",
            page !== "single" && !isBatch && "opacity-0",
          )}
        />
        {MODES.map((mode) => {
          const isCurrent = mode.page === page
          return (
            <Link
              key={mode.to}
              to={mode.to}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "relative flex h-8 items-center justify-center rounded-full px-4 text-sm font-medium outline-none transition-colors duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50",
                mode.page === "batch"
                  ? "[view-transition-name:mode-batch]"
                  : "[view-transition-name:mode-single]",
                isCurrent
                  ? "text-foreground"
                  : onBand
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

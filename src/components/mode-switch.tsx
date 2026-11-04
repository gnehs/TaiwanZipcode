import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

const MODES = [
  { to: "/", label: "單筆查詢", batch: false },
  { to: "/batch", label: "批次查詢", batch: true },
] as const

// Each mode has its own path, so each link is a real, shareable destination.
// One pill slides under the current mode; the two halves share a width so
// a translate of 100% lands exactly on the other one. During a mode switch
// the switch, pill and labels are view-transition layers in that order, so
// the pill slides across under the labels.
export function ModeSwitch({ isBatch }: { isBatch: boolean }) {
  return (
    <nav aria-label="查詢模式" className="flex justify-center pb-2">
      <div className="relative grid grid-cols-2 rounded-full bg-card p-1 shadow-surface [view-transition-name:mode-switch]">
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-secondary transition-transform duration-300 ease-out [view-transition-name:mode-pill] motion-reduce:transition-none",
            isBatch && "translate-x-full",
          )}
        />
        {MODES.map((mode) => {
          const isCurrent = mode.batch === isBatch
          return (
            <Link
              key={mode.to}
              to={mode.to}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "relative flex h-8 items-center justify-center rounded-full px-4 text-sm font-medium outline-none transition-colors duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50",
                mode.batch
                  ? "[view-transition-name:mode-batch]"
                  : "[view-transition-name:mode-single]",
                isCurrent
                  ? "text-foreground"
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

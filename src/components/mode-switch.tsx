import { BATCH_HASH } from "@/lib/hash-state"
import { cn } from "@/lib/utils"

const MODES = [
  { href: "#", label: "單筆查詢", batch: false },
  { href: BATCH_HASH, label: "批次查詢", batch: true },
]

// The mode lives in the hash, so each link is a real, shareable destination.
// One pill slides under the current mode; the two halves share a width so
// a translate of 100% lands exactly on the other one.
export function ModeSwitch({ isBatch }: { isBatch: boolean }) {
  return (
    <nav aria-label="查詢模式" className="flex justify-center pb-2">
      <div className="relative grid grid-cols-2 rounded-full bg-card p-1 shadow-surface">
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-secondary transition-transform duration-300 ease-out motion-reduce:transition-none",
            isBatch && "translate-x-full",
          )}
        />
        {MODES.map((mode) => {
          const isCurrent = mode.batch === isBatch
          return (
            <a
              key={mode.href}
              href={mode.href}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "relative flex h-8 items-center justify-center rounded-full px-4 text-sm font-medium outline-none transition-colors duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50",
                isCurrent
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode.label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}

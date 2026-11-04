import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

export function SiteHeader({
  compact,
  onHome,
}: {
  compact: boolean
  onHome?: () => void
}) {
  const transition =
    "duration-500 ease-out motion-reduce:transition-none"
  return (
    <header className="flex justify-center pb-3">
      <Link
        to="/"
        className={cn(
          // Named for the mode switch, so the logo and title scale as one.
          "flex flex-col items-center rounded-3xl p-2 outline-none transition-[gap] [view-transition-name:site-header] focus-visible:ring-3 focus-visible:ring-ring/50",
          transition,
          compact ? "gap-2" : "gap-4",
        )}
        onClick={(event) => {
          // Let modified clicks open a new tab; a plain click resets in place.
          if (!onHome || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          onHome()
        }}
      >
        <img
          src="/icon.svg"
          alt=""
          className={cn(
            "shrink-0 transition-[width,height] [filter:drop-shadow(0_1px_1px_oklch(0.45_0.14_48/0.3))_drop-shadow(0_6px_14px_oklch(0.6_0.16_55/0.35))]",
            transition,
            compact ? "size-11" : "size-16 sm:size-18",
          )}
        />
        <h1
          className={cn(
            "font-semibold tracking-tight text-balance transition-[font-size]",
            transition,
            compact ? "text-lg" : "text-2xl sm:text-3xl",
          )}
        >
          閃電地址
        </h1>
      </Link>
    </header>
  )
}

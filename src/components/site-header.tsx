import { Link } from "@tanstack/react-router"

import { ModeSwitch } from "@/components/mode-switch"
import { ThemeToggle } from "@/components/theme-toggle"

// The outer columns share the leftover width, so the mode switch stays
// centred however wide the logo is.
export function SiteHeader({
  isBatch,
  onHome,
}: {
  isBatch: boolean
  onHome?: () => void
}) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pt-3 sm:px-5 sm:pt-5">
      <Link
        to="/"
        className="flex items-center gap-2.5 justify-self-start rounded-xl p-1 pr-2 outline-none [view-transition-name:site-header] focus-visible:ring-3 focus-visible:ring-ring/50"
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
          className="size-9 shrink-0 [filter:drop-shadow(0_1px_1px_oklch(0.45_0.14_48/0.3))_drop-shadow(0_3px_8px_oklch(0.6_0.16_55/0.3))]"
        />
        {/* Phones keep only the icon; the name still labels the link. */}
        <h1 className="text-base font-semibold tracking-tight max-sm:sr-only">
          閃電地址
        </h1>
      </Link>
      <ModeSwitch isBatch={isBatch} />
      <div className="justify-self-end">
        <ThemeToggle />
      </div>
    </header>
  )
}

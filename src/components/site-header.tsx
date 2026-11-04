import { Link } from "@tanstack/react-router"
import { InfoIcon } from "lucide-react"

import { ModeSwitch } from "@/components/mode-switch"
import type { Page } from "@/components/page-shell"
import { cn } from "@/lib/utils"

// The outer columns share the leftover width, so the mode switch stays
// centred however wide the logo is.
export function SiteHeader({
  page,
  onBand,
  onHome,
}: {
  page: Page
  onBand: boolean
  onHome?: () => void
}) {
  return (
    <>
      {/* Darkens the photo band under the white header text. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(3.5rem+--spacing(4))] bg-linear-to-b from-black/25 to-transparent transition-opacity duration-500 ease-out motion-reduce:transition-none sm:h-[calc(4rem+--spacing(4))]",
          !onBand && "opacity-0",
        )}
      />
      <header className="relative z-10 grid [view-transition-name:site-bar] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pt-3 sm:px-5 sm:pt-5">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2.5 justify-self-start rounded-xl p-1 pr-2 outline-none transition-colors duration-500 ease-out [view-transition-name:site-header] focus-visible:ring-3 focus-visible:ring-ring/50",
            onBand && "text-white",
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
            className="size-9 shrink-0 [filter:drop-shadow(0_1px_1px_oklch(0.2_0_0/0.3))_drop-shadow(0_3px_8px_oklch(0.2_0_0/0.25))]"
          />
          {/* Phones keep only the icon; the name still labels the link. */}
          <h1 className="text-base font-semibold tracking-tight max-sm:sr-only">
            閃電地址
          </h1>
        </Link>
        <ModeSwitch page={page} onBand={onBand} />
        <Link
          to="/about"
          aria-label="關於"
          aria-current={page === "about" ? "page" : undefined}
          className={cn(
            "flex size-11 items-center justify-center justify-self-end rounded-full outline-none transition-[color,background-color,box-shadow] duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50",
            onBand
              ? "text-white hover:bg-white/20"
              : "text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-control aria-[current=page]:text-foreground",
          )}
        >
          <InfoIcon className="size-[1.125rem]" aria-hidden="true" />
        </Link>
      </header>
    </>
  )
}

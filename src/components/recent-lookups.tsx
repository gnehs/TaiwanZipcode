import { useSyncExternalStore } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRightIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { addressSlug, hashOfSlug } from "@/lib/address-path"
import {
  clearRecentLookups,
  forgetLookup,
  getRecentLookups,
  subscribeRecentLookups,
} from "@/lib/recent-lookups"
import { cn } from "@/lib/utils"

// Things appearing on hover sharpen in through a blur, like the copy
// buttons' icons.
const REVEAL =
  "transition-[opacity,filter,scale,color,background-color] duration-200 ease-out motion-reduce:scale-100 motion-reduce:blur-none"

export function RecentLookups() {
  const lookups = useSyncExternalStore(subscribeRecentLookups, getRecentLookups)
    .map((lookup) => ({ ...lookup, address: addressSlug(lookup.road, lookup.suffix) }))
    // A road the database has since dropped has no page to link to.
    .filter((lookup) => lookup.address)
  if (!lookups.length) return null

  return (
    // Pulled up to overlap the home page's orange band (positioned, so it
    // sits above the band's block rather than under it), and light in the
    // dark theme too, like the search above it.
    <Card
      aria-labelledby="recent-title"
      role="region"
      className="enter-rise relative -mt-12 shadow-[0_0_0_1px_oklch(0.2_0.02_60/0.06),0_24px_48px_-16px_oklch(0.4_0.1_45/0.35)] sm:-mt-14 sm:[--card-spacing:--spacing(5)] dark:light-scheme"
    >
      <CardContent className="flex flex-col">
        <div className="flex items-center justify-between -mt-0.5 gap-3 pb-2">
          <h2 id="recent-title" className="text-base font-semibold">
            最近查詢
          </h2>
          <Button
            variant="ghost"
            className="-my-2 -mr-2 min-h-10 px-3 text-muted-foreground"
            onClick={clearRecentLookups}
          >
            <Trash2Icon data-icon="inline-start" aria-hidden="true" />
            全部清除
          </Button>
        </div>
        <ul className="-mx-3 -mb-3 flex flex-col">
          {lookups.map((lookup, index) => (
            <li
              key={`${lookup.road}${lookup.suffix}`}
              // The delete button keeps its own column beside the row, so
              // hovering only fades things in place and never resizes the row.
              className="enter-rise group/item grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1"
              style={{ "--enter-delay": `${60 + index * 40}ms` } as React.CSSProperties}
            >
              <Link
                to="/"
                hash={hashOfSlug(lookup.address!)}
                className="group/row flex min-w-0 items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {/* The zipcode leads, so the codes line up in a column and the
                    right end is left to the arrow and the delete button. */}
                <span className="shrink-0 text-[0.8125rem] text-muted-foreground tabular-nums">
                  {lookup.zipcode}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {lookup.road}
                  {lookup.suffix}
                </span>
                <ArrowRightIcon
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 -translate-x-1 text-foreground opacity-0",
                    REVEAL,
                    "transition-[opacity,translate] motion-reduce:translate-x-0 [@media(hover:hover)]:group-hover/row:translate-x-0 [@media(hover:hover)]:group-hover/row:opacity-100 group-focus-visible/row:translate-x-0 group-focus-visible/row:opacity-100",
                  )}
                />
              </Link>
              <Button
                variant="ghost"
                aria-label={`從最近查詢移除 ${lookup.road}${lookup.suffix}`}
                className={cn(
                  "size-10 p-0 text-muted-foreground hover:text-destructive",
                  REVEAL,
                  // Shown while the pointer is anywhere on the row, or the
                  // keyboard is on it; touch screens always show it.
                  "[@media(hover:hover)]:scale-75 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:blur-[3px] [@media(hover:hover)]:group-hover/item:scale-100 [@media(hover:hover)]:group-hover/item:opacity-100 [@media(hover:hover)]:group-hover/item:blur-none [@media(hover:hover)]:group-has-focus-visible/item:scale-100 [@media(hover:hover)]:group-has-focus-visible/item:opacity-100 [@media(hover:hover)]:group-has-focus-visible/item:blur-none",
                )}
                onClick={() => forgetLookup(lookup)}
              >
                <Trash2Icon aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

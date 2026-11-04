import { useSyncExternalStore } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRightIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { addressSlug } from "@/lib/address-path"
import {
  clearRecentLookups,
  forgetLookup,
  getRecentLookups,
  subscribeRecentLookups,
} from "@/lib/recent-lookups"

export function RecentLookups() {
  const lookups = useSyncExternalStore(subscribeRecentLookups, getRecentLookups)
    .map((lookup) => ({ ...lookup, address: addressSlug(lookup.road, lookup.suffix) }))
    // A road the database has since dropped has no page to link to.
    .filter((lookup) => lookup.address)
  if (!lookups.length) return null

  return (
    <Card aria-labelledby="recent-title" role="region" className="enter-rise sm:[--card-spacing:--spacing(5)]">
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
              // The delete button's column opens on hover, so the row
              // gives it room instead of sitting under it.
              className="enter-rise grid grid-cols-[1fr_0rem] items-center transition-[grid-template-columns] duration-200 ease-out hover:grid-cols-[1fr_2.75rem] focus-within:grid-cols-[1fr_2.75rem] motion-reduce:transition-none [@media(hover:none)]:grid-cols-[1fr_2.75rem]"
              style={{ "--enter-delay": `${60 + index * 40}ms` } as React.CSSProperties}
            >
              <Link
                to="/a/$address"
                params={{ address: lookup.address! }}
                className="group/row flex min-w-0 items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 flex-1 truncate">
                  {lookup.road}
                  {lookup.suffix}
                </span>
                {/* On hover the zipcode gives way to an arrow, since the row
                    opens the address. */}
                <span className="relative shrink-0">
                  <span className="block font-mono text-[0.8125rem] text-muted-foreground tabular-nums transition-opacity duration-150 ease-out [@media(hover:hover)]:group-hover/row:opacity-0">
                    {lookup.zipcode}
                  </span>
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="absolute top-1/2 right-0 size-4 -translate-y-1/2 text-foreground opacity-0 transition-opacity duration-150 ease-out [@media(hover:hover)]:group-hover/row:opacity-100"
                  />
                </span>
              </Link>
              <div className="flex justify-end overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`從最近查詢移除 ${lookup.road}${lookup.suffix}`}
                  className="text-muted-foreground"
                  onClick={() => forgetLookup(lookup)}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

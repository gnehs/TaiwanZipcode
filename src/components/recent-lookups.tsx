import { useSyncExternalStore } from "react"
import { Link } from "@tanstack/react-router"
import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { addressSlug } from "@/lib/address-path"
import {
  clearRecentLookups,
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
              className="enter-rise"
              style={{ "--enter-delay": `${60 + index * 40}ms` } as React.CSSProperties}
            >
              <Link
                to="/a/$address"
                params={{ address: lookup.address! }}
                className="flex w-full items-baseline gap-4 rounded-2xl px-3 py-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 flex-1 truncate">
                  {lookup.road}
                  {lookup.suffix}
                </span>
                <span className="shrink-0 font-mono text-[0.8125rem] text-muted-foreground tabular-nums">
                  {lookup.zipcode}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

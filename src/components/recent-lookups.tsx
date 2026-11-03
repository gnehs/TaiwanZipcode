import { useSyncExternalStore } from "react"
import { ChevronRightIcon, HistoryIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  clearRecentLookups,
  getRecentLookups,
  subscribeRecentLookups,
  type RecentLookup,
} from "@/lib/recent-lookups"

export function RecentLookups({
  onSelect,
}: {
  onSelect: (lookup: RecentLookup) => void
}) {
  const lookups = useSyncExternalStore(subscribeRecentLookups, getRecentLookups)
  if (!lookups.length) return null

  return (
    <Card aria-labelledby="recent-title" role="region">
      <CardContent className="flex flex-col">
        <div className="flex items-center justify-between gap-3 pb-2">
          <h2 id="recent-title" className="text-base font-semibold">
            最近查詢
          </h2>
          <Button
            variant="ghost"
            className="-mr-2 min-h-10 px-3 text-muted-foreground"
            onClick={clearRecentLookups}
          >
            <Trash2Icon data-icon="inline-start" aria-hidden="true" />
            全部清除
          </Button>
        </div>
        <ul className="-mx-3 flex flex-col">
          {lookups.map((lookup) => (
            <li key={`${lookup.road}${lookup.suffix}`}>
              <button
                type="button"
                className="group flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={() => onSelect(lookup)}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"
                  aria-hidden="true"
                >
                  <HistoryIcon className="size-[1.125rem]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate">
                    {lookup.road}
                    {lookup.suffix}
                  </span>
                  <span className="font-mono text-[0.8125rem] text-muted-foreground">
                    {lookup.zipcode}
                  </span>
                </span>
                <ChevronRightIcon
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

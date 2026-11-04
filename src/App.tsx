import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

import { AddressResult } from "@/components/address-result"
import { AddressSearch } from "@/components/address-search"
import { FeatureCards } from "@/components/feature-cards"
import { ModeSwitch } from "@/components/mode-switch"
import { RecentLookups } from "@/components/recent-lookups"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  getCorrectionsVersion,
  loadCorrections,
  lookupCleanedAddress,
  subscribeCorrections,
  type AddressLookup,
} from "@/lib/addresses"
import { isBatchHash, readHashQuery, writeHashState } from "@/lib/hash-state"
import { cn } from "@/lib/utils"
import { rememberLookup } from "@/lib/recent-lookups"

// One shell stays mounted across both modes, so the header, width and mode
// switch animate between them instead of jumping.
type BatchLookupComponent = typeof import("@/components/batch-lookup").BatchLookup

// The spreadsheet only serves batch lookups, so single-lookup visitors never
// download it. It is rendered once loaded rather than through Suspense, which
// would mount the grid inside a suspended tree.
function useBatchLookup(isBatch: boolean) {
  const [component, setComponent] = useState<BatchLookupComponent | null>(null)
  useEffect(() => {
    if (!isBatch || component) return
    void import("@/components/batch-lookup").then((module) =>
      setComponent(() => module.BatchLookup),
    )
  }, [isBatch, component])
  return component
}

export default function App() {
  const [isBatch, setIsBatch] = useState(() => isBatchHash())
  const BatchLookup = useBatchLookup(isBatch)
  const [query, setQuery] = useState(() => readHashQuery())
  const correctionsVersion = useSyncExternalStore(
    subscribeCorrections,
    getCorrectionsVersion,
  )
  const lookup = useMemo(
    () => lookupCleanedAddress(query),
    // A new version means the correction tables arrived; read the query again.
    [query, correctionsVersion],
  )

  useEffect(() => {
    void loadCorrections()
  }, [])

  useEffect(() => {
    const syncFromHash = () => {
      const batch = isBatchHash()
      setIsBatch(batch)
      if (!batch) setQuery(readHashQuery())
    }
    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [])

  const raised = isBatch || Boolean(lookup.road)

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5">
        <ThemeToggle />
      </div>
      <main
        className={cn(
          "relative mx-auto flex w-full flex-1 flex-col gap-3 px-4 transition-[padding,max-width] duration-500 ease-out motion-reduce:transition-none sm:px-6",
          isBatch ? "max-w-6xl" : "max-w-2xl",
          // The search rises once a result appears below it.
          raised ? "pt-4 sm:pt-8" : "pt-14 sm:pt-[16vh]",
        )}
      >
        <SiteHeader
          compact={raised}
          onHome={() => {
            if (isBatch) window.location.hash = ""
            else setQuery("")
            window.scrollTo({ top: 0 })
          }}
        />
        <ModeSwitch isBatch={isBatch} />
        {isBatch ? (
          BatchLookup && <BatchLookup />
        ) : (
          <SinglePage query={query} lookup={lookup} onQueryChange={setQuery} />
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

function SinglePage({
  query,
  lookup,
  onQueryChange: setQuery,
}: {
  query: string
  lookup: AddressLookup
  onQueryChange: (query: string) => void
}) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const {
    road,
    addressSuffix,
    scopes,
    scopeResolution,
    resolvedScope,
    baseZipcodePrefixes,
    displayedZipcode,
    matchedRuleBasis,
  } = lookup

  useEffect(() => {
    writeHashState(road, addressSuffix, resolvedScope?.zipcode)
  }, [road, addressSuffix, resolvedScope?.zipcode])

  useEffect(() => {
    if (!road || displayedZipcode.length !== 6) return
    // Wait for typing to settle so partial house numbers are not remembered.
    const timer = window.setTimeout(
      () =>
        rememberLookup({
          road,
          suffix: addressSuffix.trim(),
          zipcode: displayedZipcode,
        }),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [road, addressSuffix, displayedZipcode])

  useEffect(() => {
    const isDesktop = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches
    const input = searchInputRef.current
    if (!isDesktop || !input) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [])

  return (
    <>
      <AddressSearch
        query={query}
        road={road}
        addressSuffix={addressSuffix}
        isUnmatched={scopeResolution.status === "unmatched"}
        inputRef={searchInputRef}
        onQueryChange={setQuery}
        onPopupOpenChange={setIsSuggesting}
      />
      {/* Fades back while suggestions are open so the list reads on its own. */}
      <div
        className={cn(
          "flex flex-col gap-3 transition-opacity duration-200 ease-out motion-reduce:transition-none",
          isSuggesting && "opacity-40",
        )}
      >
        {road ? (
          <AddressResult
            address={road}
            addressSuffix={addressSuffix}
            baseZipcodePrefixes={baseZipcodePrefixes}
            displayedZipcode={displayedZipcode}
            matchedRuleBasis={matchedRuleBasis}
            resolvedScope={resolvedScope}
            scopeResolution={scopeResolution}
            scopes={scopes}
          />
        ) : (
          <>
            <RecentLookups
              onSelect={(lookup) => setQuery(`${lookup.road}${lookup.suffix}`)}
            />
            <FeatureCards />
          </>
        )}
      </div>
    </>
  )
}

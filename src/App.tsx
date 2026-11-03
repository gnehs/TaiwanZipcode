import { useEffect, useMemo, useRef, useState } from "react"

import { AddressResult } from "@/components/address-result"
import { AddressSearch } from "@/components/address-search"
import { RecentLookups } from "@/components/recent-lookups"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  addressIndex,
  findAddressPrefix,
  type ZipcodeScope,
} from "@/lib/addresses"
import { readHashQuery, writeHashState } from "@/lib/hash-state"
import { cn } from "@/lib/utils"
import { rememberLookup } from "@/lib/recent-lookups"
import {
  getZipcodeScopeMatchBasis,
  resolveZipcodeScopes,
} from "@/utils/zipcodeScopeMatcher.js"

type ScopeResolution = {
  status: "empty" | "incomplete" | "unmatched" | "ambiguous" | "matched"
  matches: ZipcodeScope[]
  pending?: ZipcodeScope[]
}

const EMPTY_SCOPES: ZipcodeScope[] = []

export default function App() {
  const [query, setQuery] = useState(() => readHashQuery())
  const searchInputRef = useRef<HTMLInputElement>(null)

  // The single input is the source of truth; the road and house number are
  // read from it on every keystroke.
  const lookup = useMemo(() => findAddressPrefix(query), [query])
  const road = lookup?.address ?? ""
  const addressSuffix = lookup?.suffix ?? ""

  const scopes = addressIndex.scopesByAddress[road] || EMPTY_SCOPES
  const scopeResolution = useMemo<ScopeResolution>(
    () =>
      !road
        ? { status: "empty" as const, matches: [], pending: [] }
        : (resolveZipcodeScopes(scopes, addressSuffix) as ScopeResolution),
    [road, addressSuffix, scopes],
  )
  const resolvedScope =
    scopeResolution.status === "matched"
      ? scopeResolution.matches[0] || null
      : null
  const baseZipcodePrefixes = useMemo(
    () => [
      ...new Set(
        scopes
          .map((scope) => String(scope.zipcode || "").slice(0, 3))
          .filter(Boolean),
      ),
    ],
    [scopes],
  )
  const displayedZipcode = addressSuffix.trim()
    ? resolvedScope?.zipcode
      ? String(resolvedScope.zipcode)
      : ""
    : baseZipcodePrefixes.length === 1
      ? baseZipcodePrefixes[0]
      : ""
  const matchedRuleBasis =
    resolvedScope && addressSuffix.trim()
      ? getZipcodeScopeMatchBasis(resolvedScope, addressSuffix)?.text || ""
      : ""

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
    const syncFromHash = () => setQuery(readHashQuery())
    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [])

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
    <div className="relative flex min-h-svh flex-col bg-background">
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5">
        <ThemeToggle />
      </div>
      <main
        className={cn(
          "relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 transition-[padding] duration-500 ease-out motion-reduce:transition-none sm:px-6",
          // The search rises once a result appears below it.
          road ? "pt-4 sm:pt-8" : "pt-14 sm:pt-[16vh]",
        )}
      >
        <SiteHeader
          compact={Boolean(road)}
          onHome={() => {
            setQuery("")
            window.scrollTo({ top: 0 })
          }}
        />
        <AddressSearch
          query={query}
          road={road}
          addressSuffix={addressSuffix}
          isUnmatched={scopeResolution.status === "unmatched"}
          inputRef={searchInputRef}
          onQueryChange={setQuery}
        />
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
          <RecentLookups
            onSelect={(lookup) => setQuery(`${lookup.road}${lookup.suffix}`)}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

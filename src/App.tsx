import { useEffect, useMemo, useRef, useState } from "react"

import { AddressResult } from "@/components/address-result"
import { AddressSearch } from "@/components/address-search"
import { SiteFooter } from "@/components/site-footer"
import {
  addressIndex,
  findAddressPrefix,
  type ZipcodeScope,
} from "@/lib/addresses"
import { readHashQuery, writeHashState } from "@/lib/hash-state"
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
    <div className="min-h-svh bg-muted/30">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-6 sm:px-6 sm:pt-12">
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
        ) : null}
        <SiteFooter />
      </main>
    </div>
  )
}

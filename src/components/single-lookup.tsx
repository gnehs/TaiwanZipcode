import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useNavigate, useParams, useRouter } from "@tanstack/react-router"

import { AddressResult } from "@/components/address-result"
import { AddressSearch } from "@/components/address-search"
import { FeatureCards } from "@/components/feature-cards"
import { PageShell } from "@/components/page-shell"
import { RecentLookups } from "@/components/recent-lookups"
import {
  getCorrectionsVersion,
  lookupCleanedAddress,
  subscribeCorrections,
} from "@/lib/addresses"
import { addressParams, queryFromParams } from "@/lib/address-path"
import { rememberLookup } from "@/lib/recent-lookups"
import { cn } from "@/lib/utils"

export function SingleLookup() {
  const router = useRouter()
  const navigate = useNavigate()
  const urlQuery = queryFromParams(useParams({ strict: false }))
  // The typed text stays the source of truth; the URL only names the road
  // and house number read from it, so a messy spelling is not rewritten.
  const [query, setQuery] = useState(urlQuery)
  const correctionsVersion = useSyncExternalStore(
    subscribeCorrections,
    getCorrectionsVersion,
  )
  const lookup = useMemo(
    () => lookupCleanedAddress(query),
    // A new version means the correction tables arrived; read the query again.
    [query, correctionsVersion],
  )
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

  // Typing replaces the URL as it goes; only a link, back or forward moves
  // the input. Commits of the input's own writes can land after later
  // keystrokes, so they must never be read back into it.
  const followUrl = useRef(false)
  useEffect(
    () =>
      router.history.subscribe(({ action }) => {
        if (action.type !== "REPLACE") followUrl.current = true
      }),
    [router],
  )
  useEffect(() => {
    if (!followUrl.current) return
    followUrl.current = false
    setQuery(urlQuery)
  }, [urlQuery])

  const params = addressParams(road, addressSuffix)
  const targetQuery = params ? queryFromParams(params) : ""
  useEffect(() => {
    if (targetQuery === urlQuery) return
    followUrl.current = false
    void navigate(
      params
        ? { to: "/$city/$area/$road/{-$suffix}", params, replace: true, resetScroll: false }
        : { to: "/", replace: true, resetScroll: false },
    )
  }, [targetQuery])

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
    <PageShell
      isBatch={false}
      raised={Boolean(road)}
      onHome={() => {
        setQuery("")
        window.scrollTo({ top: 0 })
      }}
    >
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
            <RecentLookups />
            <FeatureCards />
          </>
        )}
      </div>
    </PageShell>
  )
}

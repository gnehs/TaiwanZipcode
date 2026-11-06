import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useNavigate, useParams, useRouter } from "@tanstack/react-router"

import { AddressResult } from "@/components/address-result"
import { AsciiPhoto } from "@/components/ascii-photo"
import { AddressSearch } from "@/components/address-search"
import { FeatureCards } from "@/components/feature-cards"
import { PageShell } from "@/components/page-shell"
import { RecentLookups } from "@/components/recent-lookups"
import {
  formatAddress,
  getCorrectionsVersion,
  lookupCleanedAddress,
  lookupForRecipient,
  subscribeCorrections,
  type ZipcodeScope,
} from "@/lib/addresses"
import { addressSlug, parseAddressSlug } from "@/lib/address-path"
import { addressMeta } from "@/lib/page-meta"
import { placePhoto } from "@/lib/place-photos"
import { rememberLookup } from "@/lib/recent-lookups"
import { cn } from "@/lib/utils"

export function SingleLookup() {
  const router = useRouter()
  const navigate = useNavigate()
  const { address: urlAddress = "" } = useParams({ strict: false })
  const urlQuery = parseAddressSlug(urlAddress) ? urlAddress : ""
  // The typed text stays the source of truth; the URL only names the road
  // and house number read from it, so a messy spelling is not rewritten.
  const [query, setQuery] = useState(urlQuery)
  const correctionsVersion = useSyncExternalStore(
    subscribeCorrections,
    getCorrectionsVersion,
  )
  const typedLookup = useMemo(
    () => lookupCleanedAddress(query),
    // A new version means the correction tables arrived; read the query again.
    [query, correctionsVersion],
  )
  // A bulk recipient picked for this address; another address forgets it.
  const addressKey = `${typedLookup.road}${typedLookup.addressSuffix.trim()}`
  const [recipient, setRecipient] = useState<{
    addressKey: string
    scope: ZipcodeScope
  } | null>(null)
  const lookup =
    recipient?.addressKey === addressKey
      ? lookupForRecipient(typedLookup, recipient.scope)
      : typedLookup
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

  const targetQuery = addressSlug(road, addressSuffix) ?? ""
  useEffect(() => {
    if (targetQuery === urlQuery) return
    followUrl.current = false
    void navigate(
      targetQuery
        ? { to: "/a/$address", params: { address: targetQuery }, replace: true, resetScroll: false }
        : { to: "/", replace: true, resetScroll: false },
    )
  }, [targetQuery])

  const photo = placePhoto(road)
  // Only the words, so the band spells names rather than numbers and commas.
  const englishAddress = road
    ? `${formatAddress(road, addressSuffix, "")
        .en.toUpperCase()
        .split(/[\s,.()]+/)
        .filter((word) => /^[A-Z]{2,}$/.test(word))
        .join(" ")} `
    : undefined
  const title = addressMeta(lookup).title
  useEffect(() => {
    document.title = title
  }, [title])

  useEffect(() => {
    if (!road || typedLookup.displayedZipcode.length !== 6) return
    // Wait for typing to settle so partial house numbers are not remembered.
    const timer = window.setTimeout(
      () =>
        rememberLookup({
          road,
          suffix: addressSuffix.trim(),
          // The general code, which is what reopening the address shows.
          zipcode: typedLookup.displayedZipcode,
        }),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [road, addressSuffix, typedLookup.displayedZipcode])

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
      page="single"
      raised={Boolean(road)}
      onHome={() => {
        setQuery("")
        window.scrollTo({ top: 0 })
      }}
    >
      {/* The band runs edge to edge and up behind the header to the page top
          (the header's height plus the page's top padding), and ends with
          this block. It stays mounted so the search never loses focus. */}
      <div className="relative pb-16 sm:pb-18">
        <div
          aria-hidden="true"
          className={cn(
            "hero-band pointer-events-none absolute inset-x-[calc(50%-50vw)] bottom-0 -z-10 overflow-hidden transition-[top] duration-500 ease-out motion-reduce:transition-none",
            road
              ? "-top-[calc(3.5rem+--spacing(6))] sm:-top-[calc(4rem+--spacing(8))]"
              : "-top-[calc(3.5rem+--spacing(10))] sm:-top-[calc(4rem+9vh)]",
          )}
        >
          {/* The address's city, spelled out in its English address, or the
              whole island before one is typed. Blurred at the top so the
              header reads over it. */}
          <AsciiPhoto
            src={photo}
            text={englishAddress}
            blurTop={road ? 80 : 112}
            className="absolute inset-0 size-full"
          />
        </div>
        {/* Folds away with the band rather than vanishing, so the search glides
            up into place instead of jumping there. */}
        <div
          aria-hidden={road ? true : undefined}
          className={cn(
            "grid transition-[grid-template-rows] duration-500 ease-out motion-reduce:transition-none",
            road ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <h2
              className={cn(
                "enter-rise pb-8 text-center text-[2.75rem] leading-[1.1] font-extrabold tracking-tight text-white [text-shadow:0_2px_20px_oklch(0.45_0.15_45/0.3)] transition-[opacity,scale] ease-out motion-reduce:transition-none sm:pb-10 sm:text-7xl",
                road ? "scale-95 opacity-0 duration-200" : "duration-500",
              )}
            >
              填表不卡關
              <br />
              <span className="text-[oklch(0.99_0.04_90)]">地址閃電查</span>
            </h2>
          </div>
        </div>
        <AddressSearch
          onBand
          query={query}
          road={road}
          addressSuffix={addressSuffix}
          isUnmatched={scopeResolution.status === "unmatched"}
          inputRef={searchInputRef}
          onQueryChange={setQuery}
          onPopupOpenChange={setIsSuggesting}
        />
      </div>
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
            onRecipientChange={(scope) =>
              setRecipient(scope ? { addressKey, scope } : null)
            }
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

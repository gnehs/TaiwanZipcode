import { useEffect, useMemo, useRef, useState } from "react"

import { AddressDetail } from "@/components/address-detail"
import { AddressSearch } from "@/components/address-search"
import { SiteFooter } from "@/components/site-footer"
import { addressIndex, type ZipcodeScope } from "@/lib/addresses"
import { readHashState, writeHashState } from "@/lib/hash-state"
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
  const initialState = useMemo(() => readHashState(), [])
  const [addressInput, setAddressInput] = useState(initialState.address)
  const [searchQuery, setSearchQuery] = useState(initialState.address)
  const [addressSuffix, setAddressSuffix] = useState(initialState.addressSuffix)
  const [isDetailOpen, setIsDetailOpen] = useState(initialState.isDetailOpen)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const hasDetailHistoryRef = useRef(false)

  const scopes = addressIndex.scopesByAddress[addressInput] || EMPTY_SCOPES
  const scopeResolution = useMemo<ScopeResolution>(
    () =>
      !isDetailOpen || !addressInput
        ? { status: "empty" as const, matches: [], pending: [] }
        : (resolveZipcodeScopes(scopes, addressSuffix) as ScopeResolution),
    [addressInput, addressSuffix, isDetailOpen, scopes],
  )
  // A saved zipcode is only a URL hint; always resolve the current input.
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
    writeHashState(
      isDetailOpen ? addressInput : "",
      isDetailOpen ? addressSuffix : "",
      resolvedScope?.zipcode,
    )
  }, [addressInput, addressSuffix, isDetailOpen, resolvedScope?.zipcode])

  useEffect(() => {
    const syncFromHash = () => {
      const nextState = readHashState()
      setAddressInput(nextState.address)
      // Going back to search keeps whatever the user had typed there.
      if (nextState.isDetailOpen) setSearchQuery(nextState.address)
      else hasDetailHistoryRef.current = false
      setAddressSuffix(nextState.addressSuffix)
      setIsDetailOpen(nextState.isDetailOpen)
    }

    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [])

  useEffect(() => {
    const isDesktop = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches
    const target = isDesktop
      ? isDetailOpen
        ? addressInputRef.current
        : searchInputRef.current
      : document.getElementById(isDetailOpen ? "detail-title" : "search-title")
    if (!target) return
    const frame = window.requestAnimationFrame(() => {
      target.focus()
      if (target instanceof HTMLInputElement) {
        target.setSelectionRange(target.value.length, target.value.length)
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isDetailOpen])

  function openDetail(address: string, suffix?: string) {
    if (!isDetailOpen) {
      // Give the detail view its own history entry so the browser back
      // gesture returns to search instead of leaving the site.
      window.history.pushState(null, "", window.location.href)
      hasDetailHistoryRef.current = true
    }
    setAddressInput(address)
    setAddressSuffix(suffix ?? (address === addressInput ? addressSuffix : ""))
    setIsDetailOpen(true)
  }

  function returnToSearch() {
    setSearchQuery(addressInput)
    if (hasDetailHistoryRef.current) {
      window.history.back()
      return
    }
    setIsDetailOpen(false)
  }

  return (
    <div className="min-h-svh bg-muted/30">
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-12">
        {isDetailOpen ? (
          <AddressDetail
            address={addressInput}
            addressSuffix={addressSuffix}
            addressInputRef={addressInputRef}
            baseZipcodePrefixes={baseZipcodePrefixes}
            displayedZipcode={displayedZipcode}
            matchedRuleBasis={matchedRuleBasis}
            resolvedScope={resolvedScope}
            scopeResolution={scopeResolution}
            scopes={scopes}
            onAddressSuffixChange={setAddressSuffix}
            onBack={returnToSearch}
          />
        ) : (
          <AddressSearch
            addressInput={searchQuery}
            inputRef={searchInputRef}
            onAddressInputChange={setSearchQuery}
            onOpenDetail={openDetail}
          />
        )}
        <SiteFooter />
      </main>
    </div>
  )
}

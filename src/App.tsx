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

export default function App() {
  const initialState = useMemo(() => readHashState(), [])
  const [addressInput, setAddressInput] = useState(initialState.address)
  const [addressSuffix, setAddressSuffix] = useState(
    initialState.addressSuffix,
  )
  const [isDetailOpen, setIsDetailOpen] = useState(
    initialState.isDetailOpen,
  )
  const [manuallySelectedScope, setManuallySelectedScope] =
    useState<ZipcodeScope | null>(initialState.manuallySelectedScope)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)

  const scopes = addressIndex.scopesByAddress[addressInput] || []
  const scopeResolution = useMemo<ScopeResolution>(
    () =>
      !isDetailOpen || !addressInput
        ? { status: "empty" as const, matches: [], pending: [] }
        : (resolveZipcodeScopes(scopes, addressSuffix) as ScopeResolution),
    [addressInput, addressSuffix, isDetailOpen, scopes],
  )
  const resolvedScope = useMemo(() => {
    if (
      manuallySelectedScope &&
      scopeResolution.matches?.includes(manuallySelectedScope)
    ) {
      return manuallySelectedScope
    }
    if (scopeResolution.status === "matched") {
      return (scopeResolution.matches[0] as ZipcodeScope | undefined) || null
    }
    if (scopeResolution.status === "empty") {
      if (manuallySelectedScope) return manuallySelectedScope
      if (
        scopes.length === 1 &&
        scopes[0].scope.normalize("NFKC").replace(/\s+/gu, "") === "全"
      ) {
        return scopes[0]
      }
    }
    return null
  }, [manuallySelectedScope, scopeResolution, scopes])
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
      setAddressSuffix(nextState.addressSuffix)
      setIsDetailOpen(nextState.isDetailOpen)
      setManuallySelectedScope(nextState.manuallySelectedScope)
    }

    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [])

  useEffect(() => {
    const target = isDetailOpen ? addressInputRef.current : searchInputRef.current
    if (!target) return
    const frame = window.requestAnimationFrame(() => {
      target.focus()
      target.setSelectionRange?.(target.value.length, target.value.length)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isDetailOpen])

  function openDetail(address: string, scope: ZipcodeScope | null = null) {
    setAddressInput(address)
    setAddressSuffix("")
    setManuallySelectedScope(scope)
    setIsDetailOpen(true)
  }

  function returnToSearch() {
    setIsDetailOpen(false)
    setManuallySelectedScope(null)
    setAddressSuffix("")
  }

  return (
    <div className="min-h-svh bg-muted/30">
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-16">
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
            addressInput={addressInput}
            inputRef={searchInputRef}
            onAddressInputChange={setAddressInput}
            onOpenDetail={openDetail}
          />
        )}
        <SiteFooter />
      </main>
    </div>
  )
}

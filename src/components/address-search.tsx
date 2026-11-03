import { useMemo, useState, useSyncExternalStore } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group"
import { addressIndex, searchAddresses } from "@/lib/addresses"
import {
  getRecentLookups,
  subscribeRecentLookups,
} from "@/lib/recent-lookups"
import { getAddressSelection, getMatchRanges } from "@/utils/addressSearch.js"

type AddressSearchProps = {
  query: string
  road: string
  addressSuffix: string
  isUnmatched: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onQueryChange: (value: string) => void
}

function HighlightedAddress({
  address,
  query,
}: {
  address: string
  query: string
}) {
  const parts: React.ReactNode[] = []
  let cursor = 0
  for (const [start, end] of getMatchRanges(query, address)) {
    if (start > cursor) parts.push(address.slice(cursor, start))
    parts.push(
      <mark key={start} className="bg-transparent font-semibold text-primary">
        {address.slice(start, end)}
      </mark>,
    )
    cursor = end
  }
  parts.push(address.slice(cursor))
  return <>{parts}</>
}

const ROAD_KEYWORD_EXAMPLES = ["中山北路", "忠孝東路", "和平東路"]
const MIN_QUERY_LENGTH = 2

export function AddressSearch({
  query,
  road,
  addressSuffix,
  isUnmatched,
  inputRef,
  onQueryChange,
}: AddressSearchProps) {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  // Examples only help first-time visitors; returning ones get their history.
  const hasHistory =
    useSyncExternalStore(subscribeRecentLookups, getRecentLookups).length > 0
  const [highlightedAddress, setHighlightedAddress] = useState<string | null>(
    null,
  )
  const comboboxAnchor = useComboboxAnchor()
  const searchResult = useMemo(
    () =>
      query.trim().length >= MIN_QUERY_LENGTH
        ? searchAddresses(query)
        : { matches: [], hasMore: false, prefixMatch: null },
    [query],
  )
  // Once the road is recognized, only offer suggestions that would change it.
  const suggestions = searchResult.prefixMatch
    ? []
    : searchResult.matches.filter((address) => address !== road)
  const isPopupOpen = isSuggestionsOpen && suggestions.length > 0
  // Only a dead end is shown on screen; the other hints are for screen readers.
  const hasNoMatch =
    !road && query.trim().length >= MIN_QUERY_LENGTH && !suggestions.length
  const helperText = (() => {
    const trimmedQuery = query.trim()
    if (road) {
      return addressSuffix.trim()
        ? "請使用阿拉伯數字；附號可用「之」或「-」。"
        : "已辨識道路，請在同一欄接著輸入巷、弄、號與樓層。"
    }
    if (!trimmedQuery) {
      return "輸入道路後接著輸入門牌，也可以直接貼上完整地址。"
    }
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      return "再輸入 1 個字元開始搜尋。"
    }
    if (!suggestions.length) {
      return "找不到相符道路，請縮短關鍵字或確認縣市、行政區。"
    }
    if (searchResult.hasMore) {
      return `顯示前 ${suggestions.length} 條相符道路，請加入縣市或行政區縮小範圍。`
    }
    return `找到 ${suggestions.length} 條相符道路，選擇後即可接著輸入門牌。`
  })()

  function updateQuery(value: string, openSuggestions: boolean) {
    onQueryChange(value)
    setHighlightedAddress(null)
    setIsSuggestionsOpen(openSuggestions)
    const input = inputRef.current
    if (!input) return
    input.focus()
    window.requestAnimationFrame(() =>
      input.setSelectionRange(value.length, value.length),
    )
  }

  function selectAddress(address: string) {
    const selection = getAddressSelection(query, address)
    updateQuery(`${address}${selection?.suffix || ""}`, false)
  }

  return (
    <section role="search" aria-label="地址查詢">
      <FieldGroup>
        <Field data-invalid={isUnmatched || undefined}>
          <FieldLabel htmlFor="address-search" className="sr-only">
            輸入地址
          </FieldLabel>
          <Combobox
            items={addressIndex.addresses}
            filteredItems={suggestions}
            filter={null}
            value={null}
            open={isPopupOpen}
            onOpenChange={(open) => setIsSuggestionsOpen(open)}
            inputValue={query}
            onInputValueChange={(value, details) => {
              // Keep the search text when the popup blurs or changes selection.
              if (
                details.reason !== "input-change" &&
                details.reason !== "clear-press"
              )
                return
              onQueryChange(value)
              setHighlightedAddress(null)
              setIsSuggestionsOpen(value.trim().length >= MIN_QUERY_LENGTH)
            }}
            onItemHighlighted={(address) =>
              setHighlightedAddress(
                typeof address === "string" ? address : null,
              )
            }
            onValueChange={(address) => {
              if (typeof address !== "string") return
              selectAddress(address)
            }}
            autoHighlight
          >
            <div ref={comboboxAnchor} className="w-full">
              <ComboboxInput
                ref={inputRef}
                id="address-search"
                name="address"
                className="h-14 w-full rounded-full border-0 bg-card pr-2 pl-3 text-base shadow-surface [&_input]:text-base"
                placeholder="例如：臺北市中山區中山北路一段100號3樓…"
                aria-describedby="address-search-help"
                aria-invalid={isUnmatched || undefined}
                autoComplete="off"
                spellCheck={false}
                showTrigger={false}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventBaseUIHandler()
                  event.preventDefault()
                  if (
                    event.nativeEvent.isComposing ||
                    event.nativeEvent.keyCode === 229
                  )
                    return
                  const selection =
                    highlightedAddress &&
                    suggestions.includes(highlightedAddress)
                      ? highlightedAddress
                      : suggestions[0]
                  if (isPopupOpen && selection) selectAddress(selection)
                }}
              >
                <InputGroupAddon align="inline-start">
                  <SearchIcon aria-hidden="true" />
                </InputGroupAddon>
                {query ? (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="清除搜尋內容"
                      onClick={() => updateQuery("", false)}
                    >
                      <XIcon aria-hidden="true" />
                    </InputGroupButton>
                  </InputGroupAddon>
                ) : null}
              </ComboboxInput>
            </div>
            <ComboboxContent anchor={comboboxAnchor}>
              <ComboboxEmpty>找不到符合的道路，請調整關鍵字</ComboboxEmpty>
              <ComboboxList>
                {(address: string) => (
                  <ComboboxItem
                    key={address}
                    value={address}
                    className="min-h-11 px-3 whitespace-normal break-words"
                  >
                    <span className="min-w-0 whitespace-normal break-words">
                      <HighlightedAddress address={address} query={query} />
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <FieldDescription
            id="address-search-help"
            aria-live="polite"
            className={hasNoMatch ? "px-4" : "sr-only"}
          >
            {helperText}
          </FieldDescription>
          <div
            className="flex flex-wrap items-center justify-center gap-2 pt-1"
            hidden={Boolean(road) || hasHistory}
          >
            {ROAD_KEYWORD_EXAMPLES.map((keyword) => (
              <Button
                key={keyword}
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 px-3.5 text-muted-foreground hover:text-foreground"
                onClick={() => updateQuery(keyword, true)}
              >
                {keyword}
              </Button>
            ))}
          </div>
        </Field>
      </FieldGroup>
    </section>
  )
}

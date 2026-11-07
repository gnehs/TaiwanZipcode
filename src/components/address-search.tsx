import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { LoaderCircleIcon, SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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
import { useRoadDoorplates } from "@/lib/doorplates"
import {
  getRecentLookups,
  subscribeRecentLookups,
} from "@/lib/recent-lookups"
import {
  getAddressSelection,
  getMatchRanges,
  getUnitCompletions,
} from "@/utils/addressSearch.js"
import { suggestDoors } from "@/utils/doorplates.js"
import { getFloorChoices } from "@/utils/floorChoices.js"
import { parseAddressSuffix } from "@/utils/zipcodeScopeMatcher.js"

type AddressSearchProps = {
  onBand: boolean
  query: string
  road: string
  addressSuffix: string
  isUnmatched: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onQueryChange: (value: string) => void
  onPopupOpenChange: (open: boolean) => void
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

type FloorChoice = {
  floor: string
  label: string
  zipcode: number
  department: string | null
}

const ROAD_KEYWORD_EXAMPLES = ["中山北路", "忠孝東路", "和平東路"]
const MIN_QUERY_LENGTH = 2

export function AddressSearch({
  onBand,
  query,
  road,
  addressSuffix,
  isUnmatched,
  inputRef,
  onQueryChange,
  onPopupOpenChange,
}: AddressSearchProps) {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  // A picked lane or alley keeps the list open for its house numbers.
  const keepOpenAfterPick = useRef(false)
  // Examples only help first-time visitors; returning ones get their history.
  const hasHistory =
    useSyncExternalStore(subscribeRecentLookups, getRecentLookups).length > 0
  const [highlightedAddress, setHighlightedAddress] = useState<string | null>(
    null,
  )
  // While the arrow keys walk the list, the input shows the highlighted
  // suggestion so typing carries on after it; the list still follows `query`.
  const [inlineValue, setInlineValue] = useState<string | null>(null)
  const comboboxAnchor = useComboboxAnchor()
  const searchResult = useMemo(
    () =>
      query.trim().length >= MIN_QUERY_LENGTH
        ? searchAddresses(query)
        : { matches: [], hasMore: false, prefixMatch: null },
    [query],
  )
  // Once the road is recognized, only offer suggestions that would change it.
  // The road may come from the cleaned text ("1段" → 一段), which the raw
  // search does not see, so a house number after it also ends the list.
  const hasHouseNumber = Boolean(road) && /^\s*(?:\d|地下)/u.test(addressSuffix)
  const roadSuggestions = searchResult.prefixMatch || hasHouseNumber
    ? []
    : searchResult.matches.filter((address) => address !== road)
  // Where the county lists the road's doors, the lanes, alleys and houses
  // that exist are offered; elsewhere a number typed after the road is
  // offered with the units that can follow. Once the house number is
  // complete, the address itself is the one choice, so picking it puts the
  // list away.
  const { doorplates, isLoading: areDoorplatesLoading } = useRoadDoorplates(road)
  const hasRoadSuggestions = roadSuggestions.length > 0
  const { completions, areDoors, floorByCompletion } = useMemo(() => {
    const floorByCompletion = new Map<string, FloorChoice>()
    if (!road) return { completions: [], areDoors: false, floorByCompletion }
    // A house whose zipcode turns on the floor offers its floors.
    const floors: FloorChoice[] = getFloorChoices(
      addressIndex.scopesByAddress[road] ?? [],
      addressSuffix,
    )
    if (floors.length) {
      for (const choice of floors)
        floorByCompletion.set(`${query.trimEnd()}${choice.floor}`, choice)
      return { completions: [...floorByCompletion.keys()], areDoors: false, floorByCompletion }
    }
    const doors = suggestDoors(doorplates, query, addressSuffix)
    // A bare road still lists the longer roads it is the start of.
    if (doors.length && (addressSuffix.trim() || !hasRoadSuggestions))
      return { completions: doors, areDoors: true, floorByCompletion }
    const units = getUnitCompletions(query)
    if (units.length) return { completions: units, areDoors: false, floorByCompletion }
    return {
      completions:
        hasHouseNumber && parseAddressSuffix(addressSuffix).complete
          ? [query.trimEnd()]
          : [],
      areDoors: false,
      floorByCompletion,
    }
  }, [road, query, hasHouseNumber, addressSuffix, doorplates, hasRoadSuggestions])
  const suggestions = completions.length ? completions : roadSuggestions
  const isPopupOpen = isSuggestionsOpen && suggestions.length > 0
  useEffect(() => onPopupOpenChange(isPopupOpen), [isPopupOpen, onPopupOpenChange])
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
    setInlineValue(null)
    setIsSuggestionsOpen(openSuggestions)
    const input = inputRef.current
    if (!input) return
    input.focus()
    window.requestAnimationFrame(() =>
      input.setSelectionRange(value.length, value.length),
    )
  }

  // What choosing a suggestion writes: a completion as is, a road with the
  // house number already typed after it.
  function filledText(address: string) {
    if (completions.includes(address)) return address
    const selection = getAddressSelection(query, address)
    return `${address}${selection?.suffix || ""}`
  }

  function selectAddress(address: string) {
    const text = filledText(address)
    // A listed lane or alley has listed houses, so the list stays open for them.
    const needsHouse = areDoors && /[巷弄]$/u.test(text)
    keepOpenAfterPick.current = needsHouse
    updateQuery(text, needsHouse)
  }

  return (
    <section role="search" aria-label="地址查詢">
      <FieldGroup>
        <Field data-invalid={isUnmatched || undefined}>
          <FieldLabel htmlFor="address-search" className="sr-only">
            輸入地址
          </FieldLabel>
          <Combobox
            items={completions.length ? completions : addressIndex.addresses}
            filteredItems={suggestions}
            filter={null}
            value={null}
            open={isPopupOpen}
            onOpenChange={(open, details) => {
              if (!open && details.reason === "item-press" && keepOpenAfterPick.current) {
                keepOpenAfterPick.current = false
                return
              }
              setIsSuggestionsOpen(open)
              // Closing the list (Escape, a click away) returns to what was typed.
              if (!open) setInlineValue(null)
            }}
            inputValue={inlineValue ?? query}
            onInputValueChange={(value, details) => {
              // Keep the search text when the popup blurs or changes selection.
              if (
                details.reason !== "input-change" &&
                details.reason !== "clear-press"
              )
                return
              onQueryChange(value)
              setHighlightedAddress(null)
              setInlineValue(null)
              setIsSuggestionsOpen(value.trim().length >= MIN_QUERY_LENGTH)
            }}
            onItemHighlighted={(address, details) => {
              const item = typeof address === "string" ? address : null
              setHighlightedAddress(item)
              // Only the arrow keys fill the input; the pointer leaves the
              // typed text alone. Nothing starts highlighted, so the first
              // arrow press lands on the first suggestion and arrowing back
              // above it returns to what was typed.
              if (details.reason === "keyboard") {
                setInlineValue(item ? filledText(item) : null)
              }
            }}
            onValueChange={(address) => {
              if (typeof address !== "string") return
              selectAddress(address)
            }}
          >
            {/* On the band the search and its suggestions stay light in
                the dark theme too. */}
            <div
              ref={comboboxAnchor}
              className={cn("w-full", onBand && "dark:light-scheme")}
            >
              <ComboboxInput
                ref={inputRef}
                id="address-search"
                name="address"
                className={cn(
                  "h-14 w-full rounded-full border-0 bg-card pr-2 pl-3 text-base text-foreground [&_input]:text-base",
                  onBand
                    ? "shadow-[0_20px_40px_-12px_oklch(0.4_0.15_45/0.45)] sm:h-16"
                    : "shadow-surface",
                )}
                placeholder="例如：中山北路一段100號3樓"
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
            <ComboboxContent
              anchor={comboboxAnchor}
              // Close to the pill search above: 26px, with 22px items 4px in.
              className={cn("rounded-4xl", onBand && "dark:light-scheme")}
            >
              <ComboboxEmpty>找不到符合的道路，請調整關鍵字</ComboboxEmpty>
              <ComboboxList>
                {(address: string) => {
                  const floor = floorByCompletion.get(address)
                  return (
                    <ComboboxItem
                      key={address}
                      value={address}
                      className="min-h-11 rounded-3xl px-4 whitespace-normal break-words"
                    >
                      {floor ? (
                        <>
                          <span className="flex min-w-0 flex-1 flex-col py-0.5">
                            <span>{floor.label}</span>
                            {floor.department ? (
                              <span className="text-xs text-muted-foreground">
                                {floor.department}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 font-medium text-primary tabular-nums">
                            {floor.zipcode}
                          </span>
                        </>
                      ) : (
                        <span className="min-w-0 whitespace-normal break-words">
                          {completions.includes(address) ? (
                            <>
                              <mark className="bg-transparent font-semibold text-primary">
                                {query.trimEnd()}
                              </mark>
                              {address.slice(query.trimEnd().length)}
                            </>
                          ) : (
                            <HighlightedAddress address={address} query={query} />
                          )}
                        </span>
                      )}
                    </ComboboxItem>
                  )
                }}
              </ComboboxList>
              {areDoorplatesLoading ? (
                // Delayed so a cached or quick load never flashes it.
                <span
                  role="status"
                  aria-label="正在載入門牌"
                  className="pointer-events-none absolute right-2 bottom-2 flex size-9 animate-in items-center justify-center rounded-full bg-popover text-muted-foreground shadow-popover delay-200 duration-200 fill-mode-both fade-in-0 zoom-in-90"
                >
                  <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                </span>
              ) : null}
            </ComboboxContent>
          </Combobox>
          <FieldDescription
            id="address-search-help"
            aria-live="polite"
            className={hasNoMatch ? cn("px-4", onBand && "text-white") : "sr-only"}
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
                className={cn(
                  "h-8 px-3.5",
                  onBand
                    ? "bg-white/22 text-white hover:bg-white/32"
                    : "text-muted-foreground hover:text-foreground",
                )}
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

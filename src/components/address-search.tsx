import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { LoaderCircleIcon, SearchIcon, XIcon } from "lucide-react"

import { useText } from "@/lib/locale"
import { cn } from "@/lib/utils"
import {
  Combobox,
  ComboboxContent,
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
import {
  addressIndex,
  formatAddress,
  isEnglishAddress,
  searchAddresses,
  searchEnglishAddresses,
} from "@/lib/addresses"
import { placePath } from "@/lib/address-path"
import { useRoadDoorplates } from "@/lib/doorplates"
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

const MIN_QUERY_LENGTH = 2

const COUNTRY = /, Taiwan \(R\.O\.C\.\)$/

// A Chinese completion of the road as English: the whole address to write,
// and the part before the road to list ("No. 12", "45 Ln", "3F, No. 7").
function englishCompletion(road: string, completion: string) {
  const { en, enFields } = formatAddress(road, completion.slice(road.length))
  const roadEn = addressIndex.englishByAddress[road]?.road ?? ""
  const house = enFields?.line1.endsWith(roadEn)
    ? enFields.line1.slice(0, -roadEn.length).replace(/,\s*$/u, "")
    : ""
  return {
    text: en.replace(COUNTRY, ""),
    label: [enFields?.line2, house].filter(Boolean).join(", ") || en.replace(COUNTRY, ""),
  }
}

// "2樓以上" → "2F and above", "地下1樓" → "B1F".
function englishFloorLabel(label: string) {
  if (label === "其他樓層") return "Other floors"
  return label
    .replace(/地下(\d+)樓/gu, "B$1F")
    .replace(/(\d+)樓/gu, "$1F")
    .replace("以上", " and above")
    .replace("以下", " and below")
    .replace("至", "–")
}

const TEXT = {
  zh: {
    search: "地址查詢",
    label: "輸入地址",
    placeholder: "搜尋地址",
    clear: "清除搜尋內容",
    loadingDoors: "正在載入門牌",
    digits: "請使用阿拉伯數字；附號可用「之」或「-」。",
    recognized: "已辨識道路，請在同一欄接著輸入巷、弄、號與樓層。",
    empty: "輸入道路後接著輸入門牌，也可以直接貼上完整地址。",
    oneMore: "再輸入 1 個字元開始搜尋。",
    noMatch: "找不到相符道路",
    showingFirst: (count: number) =>
      `顯示前 ${count} 條相符道路，請加入縣市或行政區縮小範圍。`,
    found: (count: number) => `找到 ${count} 條相符道路，選擇後即可接著輸入門牌。`,
  },
  en: {
    search: "Address lookup",
    label: "Enter an address",
    placeholder: "Search an address, e.g. Songren Road, Taipei",
    clear: "Clear search",
    loadingDoors: "Loading house numbers",
    digits: "Use Arabic numerals. Write a sub-number with 之 or a hyphen.",
    recognized: "Road found. Keep typing the lane, alley, number and floor in the same field.",
    empty: "Type a road, then the house number. You can also paste a full address.",
    oneMore: "Type 1 more character to search.",
    noMatch: "No matching road",
    showingFirst: (count: number) =>
      `Showing the first ${count} matching roads. Add a city or district to narrow them down.`,
    found: (count: number) => `${count} matching roads. Pick one, then type the house number.`,
  },
}

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
  const text = useText(TEXT)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  // A picked lane or alley keeps the list open for its house numbers.
  const keepOpenAfterPick = useRef(false)
  const [highlightedAddress, setHighlightedAddress] = useState<string | null>(
    null,
  )
  // While the arrow keys walk the list, the input shows the highlighted
  // suggestion so typing carries on after it; the list still follows `query`.
  const [inlineValue, setInlineValue] = useState<string | null>(null)
  const comboboxAnchor = useComboboxAnchor()
  const navigate = useNavigate()
  const isLongEnough = query.trim().length >= MIN_QUERY_LENGTH
  // English is matched by its own index, and what a pick writes stays in
  // English, read back through the same index.
  const isEnglish = useMemo(() => isEnglishAddress(query), [query])
  const englishByAddress = useMemo(
    () =>
      new Map(
        isEnglish && isLongEnough
          ? searchEnglishAddresses(query).map((item) => [item.address, item])
          : [],
      ),
    [isEnglish, isLongEnough, query],
  )
  const searchResult = useMemo(
    () =>
      isLongEnough && !isEnglish
        ? searchAddresses(query)
        : { matches: [...englishByAddress.keys()], hasMore: false, prefixMatch: null, query },
    [query, isLongEnough, isEnglish, englishByAddress],
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
  // Completions are worked out on Chinese text. English is read as the
  // Chinese it stands for, ending in the number still being typed, so
  // "…, No. 1" completes like "…仁愛路四段1".
  const typedChinese = useMemo(() => {
    if (!isEnglish) return query.trimEnd()
    const chinese = `${road}${addressSuffix.trim()}`
    // A number after a unit word ("Sec. 4", "Ln 45", "3F") is that unit, not
    // a house number being typed.
    const typing = query.trimEnd().match(/\d+$/u)?.[0]
    const afterUnit = /\b(?:sec|section|ln|lane|aly|alley|fl|floor|rm|room|unit)\.?\s*\d+$/iu.test(query.trimEnd())
    if (!road || !typing || afterUnit) return chinese
    if (chinese.endsWith(`${typing}號`)) return chinese.slice(0, -1)
    return chinese.endsWith(typing) ? chinese : `${chinese}${typing}`
  }, [isEnglish, query, road, addressSuffix])
  const { chineseCompletions, areDoors, floorByCompletion } = useMemo<{
    chineseCompletions: string[]
    areDoors: boolean
    floorByCompletion: Map<string, FloorChoice>
  }>(() => {
    const floorByCompletion = new Map<string, FloorChoice>()
    if (!road) return { chineseCompletions: [], areDoors: false, floorByCompletion }
    // A house whose zipcode turns on the floor offers its floors.
    const floors: FloorChoice[] = getFloorChoices(
      addressIndex.scopesByAddress[road] ?? [],
      addressSuffix,
    )
    if (floors.length) {
      const house = isEnglish ? `${road}${addressSuffix.trim()}` : typedChinese
      for (const choice of floors) floorByCompletion.set(`${house}${choice.floor}`, choice)
      return { chineseCompletions: [...floorByCompletion.keys()], areDoors: false, floorByCompletion }
    }
    const doors = suggestDoors(doorplates, typedChinese, addressSuffix)
    // A bare road still lists the longer roads it is the start of.
    if (doors.length && (addressSuffix.trim() || !hasRoadSuggestions))
      return { chineseCompletions: doors, areDoors: true, floorByCompletion }
    const units = getUnitCompletions(typedChinese)
    if (units.length) return { chineseCompletions: units, areDoors: false, floorByCompletion }
    return {
      chineseCompletions:
        hasHouseNumber && parseAddressSuffix(addressSuffix).complete ? [typedChinese] : [],
      areDoors: false,
      floorByCompletion,
    }
  }, [road, typedChinese, hasHouseNumber, addressSuffix, doorplates, hasRoadSuggestions, isEnglish])
  // In English each completion is listed and written as English, keyed back
  // to the Chinese it stands for.
  const englishCompletions = useMemo(
    () =>
      isEnglish
        ? new Map(
            chineseCompletions.map((chinese): [string, { chinese: string; label: string }] => {
              const { text, label } = englishCompletion(road, chinese)
              return [text, { chinese, label }]
            }),
          )
        : null,
    [isEnglish, chineseCompletions, road],
  )
  const completions = englishCompletions ? [...englishCompletions.keys()] : chineseCompletions
  const chineseOf = (completion: string) => englishCompletions?.get(completion)?.chinese ?? completion
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
        ? text.digits
        : text.recognized
    }
    if (!trimmedQuery) {
      return text.empty
    }
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      return text.oneMore
    }
    if (!suggestions.length) {
      return text.noMatch
    }
    if (searchResult.hasMore) {
      return text.showingFirst(suggestions.length)
    }
    return text.found(suggestions.length)
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
    const english = englishByAddress.get(address)
    if (english) return english.en
    const selection = getAddressSelection(searchResult.query, address)
    return `${address}${selection?.suffix || ""}`
  }

  function selectAddress(address: string) {
    const english = englishByAddress.get(address)
    // A city or district has its own page, listing its districts or roads.
    if (english && english.kind !== "road") {
      const place = addressIndex.places.find(({ city, area }) =>
        english.kind === "city" ? city === address : `${city}${area}` === address,
      )
      if (place) {
        void navigate({ to: placePath(place.city, english.kind === "city" ? null : place.area) })
        return
      }
    }
    const text = filledText(address)
    // A listed lane or alley has listed houses, so the list stays open for them.
    const needsHouse = areDoors && /[巷弄]$/u.test(chineseOf(text))
    keepOpenAfterPick.current = needsHouse
    updateQuery(text, needsHouse)
  }

  return (
    <section role="search" aria-label={text.search}>
      <FieldGroup>
        <Field data-invalid={isUnmatched || undefined}>
          <FieldLabel htmlFor="address-search" className="sr-only">
            {text.label}
          </FieldLabel>
          <Combobox
            items={completions.length ? completions : isEnglish ? suggestions : addressIndex.addresses}
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
            <div ref={comboboxAnchor} className="w-full">
              <ComboboxInput
                ref={inputRef}
                id="address-search"
                name="address"
                className={cn(
                  "h-14 w-full rounded-full border-0 bg-card pr-2 pl-3 text-base text-foreground [&_input]:text-base",
                  onBand
                    ? // Over the dark theme's photo, a tinted frosted glass
                      // rather than a white slab outshining the result.
                      "shadow-[0_20px_40px_-12px_oklch(0.4_0.15_45/0.45)] sm:h-16 dark:bg-[oklch(0.2_0.01_55/0.55)] dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/0.14),0_20px_40px_-12px_oklch(0_0_0/0.5)] dark:backdrop-blur-xl dark:backdrop-saturate-150"
                    : "shadow-surface",
                )}
                placeholder={text.placeholder}
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
                      aria-label={text.clear}
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
              className="rounded-4xl"
            >
              <ComboboxList>
                {(address: string) => {
                  const floor = floorByCompletion.get(chineseOf(address))
                  const english = englishCompletions?.get(address)
                  return (
                    <ComboboxItem
                      key={address}
                      value={address}
                      className="min-h-11 rounded-3xl px-4 whitespace-normal break-words"
                    >
                      {floor ? (
                        <>
                          <span className="flex min-w-0 flex-1 flex-col py-0.5">
                            <span>{english ? englishFloorLabel(floor.label) : floor.label}</span>
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
                          {english ? (
                            english.label
                          ) : completions.includes(address) ? (
                            <>
                              <mark className="bg-transparent font-semibold text-primary">
                                {query.trimEnd()}
                              </mark>
                              {address.slice(query.trimEnd().length)}
                            </>
                          ) : englishByAddress.has(address) ? (
                            <span className="flex flex-col py-0.5">
                              <span>{englishByAddress.get(address)!.en}</span>
                              <span lang="zh-TW" className="text-xs text-muted-foreground">
                                {address}
                              </span>
                            </span>
                          ) : (
                            <HighlightedAddress address={address} query={searchResult.query} />
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
                  aria-label={text.loadingDoors}
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
        </Field>
      </FieldGroup>
    </section>
  )
}

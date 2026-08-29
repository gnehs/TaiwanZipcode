import { useMemo, useState } from "react"
import { ArrowRightIcon, InfoIcon, SearchIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { InputGroupAddon } from "@/components/ui/input-group"
import {
  addressIndex,
  filterAddresses,
  type ZipcodeScope,
} from "@/lib/addresses"

type AddressSearchProps = {
  addressInput: string
  inputRef: React.RefObject<HTMLInputElement | null>
  onAddressInputChange: (value: string) => void
  onOpenDetail: (address: string, scope?: ZipcodeScope | null) => void
}

export function AddressSearch({
  addressInput,
  inputRef,
  onAddressInputChange,
  onOpenDetail,
}: AddressSearchProps) {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [highlightedAddress, setHighlightedAddress] = useState<string | null>(
    null,
  )
  const comboboxAnchor = useComboboxAnchor()
  const suggestions = useMemo(
    () =>
      addressInput.trim().length >= 2
        ? filterAddresses(addressInput)
        : [],
    [addressInput],
  )
  const resultList = addressIndex.scopesByAddress[addressInput] || []

  return (
    <section className="flex flex-col gap-6" aria-labelledby="search-title">
      <header className="flex flex-col gap-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <span className="text-lg font-semibold" aria-hidden="true">
            3+3
          </span>
        </div>
        <h1
          id="search-title"
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          台灣 3+3 郵遞區號查詢
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          即時查詢完整郵遞區號，無需驗證碼。
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Combobox
          items={addressIndex.addresses}
          filteredItems={suggestions}
          filter={null}
          open={isSuggestionsOpen && suggestions.length > 0}
          onOpenChange={(open, eventDetails) => {
            if (open) {
              setIsSuggestionsOpen(true)
              return
            }
            if (
              [
                "escape-key",
                "outside-press",
                "focus-out",
                "close-press",
                "clear-press",
                "cancel-open",
              ].includes(eventDetails.reason)
            ) {
              setIsSuggestionsOpen(false)
            }
          }}
          onItemHighlighted={(address) => {
            setHighlightedAddress(
              typeof address === "string" ? address : null,
            )
          }}
          inputValue={addressInput}
          onInputValueChange={(value) => {
            onAddressInputChange(value)
            setHighlightedAddress(null)
            setIsSuggestionsOpen(value.trim().length >= 2)
          }}
          onValueChange={(address) => {
            if (typeof address === "string") {
              onOpenDetail(address)
            }
          }}
          autoHighlight
        >
          <div ref={comboboxAnchor} className="w-full">
            <ComboboxInput
              ref={inputRef}
              className="h-12 w-full"
              placeholder="輸入縣市、行政區或道路名稱…"
              aria-label="搜尋台灣地址"
              autoComplete="off"
              onKeyDown={(event) => {
                const tabSelection = highlightedAddress || suggestions[0]
                if (event.key === "Tab" && tabSelection) {
                  event.preventDefault()
                  onOpenDetail(tabSelection)
                }
              }}
              showTrigger={false}
              showClear={Boolean(addressInput)}
            >
              <InputGroupAddon align="inline-start">
                <SearchIcon />
              </InputGroupAddon>
            </ComboboxInput>
          </div>
          <ComboboxContent anchor={comboboxAnchor}>
            <ComboboxEmpty>找不到符合的道路</ComboboxEmpty>
            <ComboboxList>
              {(address: string) => (
                <ComboboxItem key={address} value={address}>
                  {address}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <Alert>
          <InfoIcon />
          <AlertDescription>
            {addressInput
              ? suggestions.length
                ? `找到 ${suggestions.length} 條相符道路；選擇後即可輸入門牌。`
                : "找不到相符道路，請嘗試縮短關鍵字或調整空白。"
              : "可輸入「中山北路」、「信義區松山路」或「台北 忠孝東路」。"}
          </AlertDescription>
        </Alert>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>查詢結果</CardTitle>
          <CardDescription>
            {resultList.length
              ? `找到 ${resultList.length} 筆郵遞區號規則`
              : "請先從搜尋建議中選擇道路"}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {resultList.length ? (
            <div className="flex flex-col">
              {resultList.map((item, index) => (
                <Button
                  key={`${item.zipcode}-${item.scope}-${index}`}
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-none px-4 py-3 text-left"
                  onClick={() => onOpenDetail(addressInput, item)}
                >
                  <span className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                    <Badge variant="outline">{item.zipcode}</Badge>
                    <span className="min-w-0 whitespace-normal">
                      {item.department ? (
                        <span className="block font-medium">
                          {item.department}
                        </span>
                      ) : null}
                      <span className="text-muted-foreground">{item.scope}</span>
                    </span>
                    <ArrowRightIcon data-icon="inline-end" />
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              尚無結果
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

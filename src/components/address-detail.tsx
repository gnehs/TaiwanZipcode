import {
  ArrowLeftIcon,
  CircleAlertIcon,
  InfoIcon,
  MapPinIcon,
} from "lucide-react"

import { CopyButton } from "@/components/copy-button"
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  formatAddress,
  formatScopeRule,
  type ZipcodeScope,
} from "@/lib/addresses"
import { parseAddressSuffix } from "@/utils/zipcodeScopeMatcher.js"

type ScopeResolution = {
  status: "empty" | "incomplete" | "unmatched" | "ambiguous" | "matched"
  matches: ZipcodeScope[]
  pending?: ZipcodeScope[]
}

type AddressDetailProps = {
  address: string
  addressSuffix: string
  addressInputRef: React.RefObject<HTMLInputElement | null>
  baseZipcodePrefixes: string[]
  displayedZipcode: string
  matchedRuleBasis: string
  resolvedScope: ZipcodeScope | null
  scopeResolution: ScopeResolution
  scopes: ZipcodeScope[]
  onAddressSuffixChange: (value: string) => void
  onBack: () => void
}

export function AddressDetail({
  address,
  addressSuffix,
  addressInputRef,
  baseZipcodePrefixes,
  displayedZipcode,
  matchedRuleBasis,
  resolvedScope,
  scopeResolution,
  scopes,
  onAddressSuffixChange,
  onBack,
}: AddressDetailProps) {
  const hasSuffix = Boolean(addressSuffix.trim())
  const isSuffixIncomplete =
    hasSuffix && !parseAddressSuffix(addressSuffix).complete
  const isComplete = displayedZipcode.length === 6
  const fullZipcode = isComplete ? displayedZipcode : ""
  const parsedAddress = formatAddress(address, addressSuffix, fullZipcode)
  const isUnmatched = scopeResolution.status === "unmatched"
  const chineseAddress = `${fullZipcode}${address}${addressSuffix.trim()}`
  const message = !hasSuffix
    ? "補上門牌即可查詢完整六碼；有巷、弄或樓層時請一併填寫。"
    : isUnmatched
      ? "找不到符合的門牌範圍。請確認道路、巷弄與門牌，或查看下方道路規則。"
      : !resolvedScope && scopeResolution.status === "ambiguous"
        ? "此地址對應多個區號，請補上附號或樓層，協助縮小範圍。"
        : !resolvedScope && scopeResolution.status === "incomplete"
          ? "還需要更完整的門牌資訊。請確認已填寫「號」，並補上適用的附號或樓層。"
          : ""

  return (
    <section className="flex flex-col gap-5" aria-labelledby="detail-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" className="min-h-11" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          更換道路
        </Button>
        <p className="text-xs text-muted-foreground">
          已選道路 → 補上門牌 → 複製區號
        </p>
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPinIcon className="size-4" aria-hidden="true" />
          查詢地址
        </div>
        <h1
          id="detail-title"
          tabIndex={-1}
          className="break-words text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {address}
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>補上門牌，立即查詢</CardTitle>
          <CardDescription>輸入時自動更新結果，不必再按查詢。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={isUnmatched || undefined}>
              <FieldLabel htmlFor="address-suffix">
                巷、弄、門牌與樓層
              </FieldLabel>
              <Input
                ref={addressInputRef}
                id="address-suffix"
                name="address-suffix"
                className="h-12"
                value={addressSuffix}
                onChange={(event) => onAddressSuffixChange(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={isUnmatched || undefined}
                aria-describedby="suffix-help suffix-status"
                placeholder="例如：12巷3號之1 2樓…"
              />
              <FieldDescription id="suffix-help">
                請使用阿拉伯數字；附號可用「之」或「-」。
              </FieldDescription>
            </Field>
          </FieldGroup>
          <div
            id="suffix-status"
            className={message ? undefined : "sr-only"}
            aria-live="polite"
            aria-atomic="true"
          >
            {message ? (
              <Alert variant={isUnmatched ? "destructive" : "default"}>
                {isUnmatched ? (
                  <CircleAlertIcon aria-hidden="true" />
                ) : (
                  <InfoIcon aria-hidden="true" />
                )}
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}
          </div>
          <Separator />
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium">3+3 郵遞區號</h2>
              <Badge variant={isComplete ? "default" : "secondary"}>
                {isComplete ? "完整六碼" : hasSuffix ? "尚未確認" : "待補門牌"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p
                className="select-all text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl"
                aria-live="polite"
                aria-atomic="true"
                aria-label={
                  isComplete
                    ? `郵遞區號 ${displayedZipcode}`
                    : displayedZipcode
                      ? `前三碼 ${displayedZipcode}，後三碼待確認`
                      : "郵遞區號待確認"
                }
              >
                {isComplete ? (
                  displayedZipcode
                ) : (
                  <>
                    {displayedZipcode || "···"}
                    <span
                      className="ml-2 text-muted-foreground"
                      aria-hidden="true"
                    >
                      ···
                    </span>
                  </>
                )}
              </p>
              <CopyButton
                text={isComplete ? displayedZipcode : ""}
                label="複製郵遞區號"
                disabled={!isComplete}
                variant="default"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {isComplete && resolvedScope
                ? `符合規則：${formatScopeRule(resolvedScope.scope)}${matchedRuleBasis ? `（依 ${matchedRuleBasis} 判斷）` : ""}`
                : !hasSuffix && baseZipcodePrefixes.length === 1
                  ? "目前僅顯示前三碼，完整六碼確認後即可複製。"
                  : "確認完整門牌後，這裡會顯示可複製的六碼郵遞區號。"}
            </p>
            <Popover>
              <PopoverTrigger
                render={<Button variant="outline" className="min-h-11 w-fit" />}
              >
                <InfoIcon data-icon="inline-start" aria-hidden="true" />
                查看此道路的 {scopes.length} 筆規則
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="max-h-80 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain sm:w-96"
              >
                <PopoverHeader>
                  <PopoverTitle>此道路的郵遞區號規則</PopoverTitle>
                  <PopoverDescription>
                    請依巷弄、門牌範圍與樓層確認；符合的規則會標示於下方。
                  </PopoverDescription>
                </PopoverHeader>
                <div className="flex flex-col gap-2">
                  {scopes.map((rule, index) => (
                    <div
                      key={`${rule.zipcode}-${rule.scope}-${index}`}
                      className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-md py-2 text-sm"
                    >
                      <Badge
                        variant={
                          isComplete && rule === resolvedScope
                            ? "default"
                            : "outline"
                        }
                      >
                        {rule.zipcode}
                      </Badge>
                      <div className="min-w-0 break-words">
                        {isComplete && rule === resolvedScope ? (
                          <p className="font-medium">目前符合</p>
                        ) : null}
                        {rule.department ? (
                          <p className="font-medium">{rule.department}</p>
                        ) : null}
                        <p>{formatScopeRule(rule.scope)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>地址資訊</CardTitle>
          <CardDescription>
            {isComplete
              ? "已附上郵遞區號，可直接貼到寄件資料。"
              : "確認內容後，可分別複製中文地址或英文地址。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {resolvedScope?.department && isComplete ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                大宗戶
              </p>
              <p>{resolvedScope.department}</p>
              <Separator className="mt-3" />
            </div>
          ) : null}
          <div className="flex flex-col items-start gap-3">
            <h2 className="text-sm font-medium">中文地址</h2>
            <p className="w-full break-words select-all">{chineseAddress}</p>
            <CopyButton text={chineseAddress} label="複製中文地址" />
          </div>
          <Separator />
          <div className="flex flex-col items-start gap-3">
            <h2 className="text-sm font-medium">英文地址</h2>
            <p lang="en" className="w-full break-words select-all">
              {parsedAddress.en}
            </p>
            <p className="text-xs text-muted-foreground">
              英文地址依已辨識的內容轉換，使用前請與中文地址核對。
            </p>
            {isSuffixIncomplete ? (
              <p className="text-sm text-muted-foreground" role="status">
                門牌尚未辨識完整，補齊後即可複製英文地址。
              </p>
            ) : null}
            {parsedAddress.warns.length ? (
              <Alert variant="destructive">
                <CircleAlertIcon aria-hidden="true" />
                <AlertDescription>
                  {parsedAddress.warns.join("；")}。請修正後再複製英文地址。
                </AlertDescription>
              </Alert>
            ) : null}
            <CopyButton
              text={parsedAddress.en}
              label="複製英文地址"
              disabled={isSuffixIncomplete || parsedAddress.warns.length > 0}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

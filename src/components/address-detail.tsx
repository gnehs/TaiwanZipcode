import {
  ArrowLeftIcon,
  CircleAlertIcon,
  InfoIcon,
  MapPinIcon,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
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

function AddressAlerts({
  addressSuffix,
  parsedAddress,
  resolvedScope,
  scopeResolution,
}: {
  addressSuffix: string
  parsedAddress: ReturnType<typeof formatAddress>
  resolvedScope: ZipcodeScope | null
  scopeResolution: ScopeResolution
}) {
  const needsMoreInput =
    !resolvedScope &&
    (scopeResolution.status === "empty" ||
      scopeResolution.status === "incomplete")

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {needsMoreInput ? (
        <Alert>
          <InfoIcon />
          <AlertDescription>
            請輸入完整巷、弄、門牌、附號或樓層，系統會自動判斷郵遞區號。
          </AlertDescription>
        </Alert>
      ) : null}
      {scopeResolution.status === "unmatched" ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            找不到符合此後續地址的郵遞區號範圍，請確認門牌是否正確。
          </AlertDescription>
        </Alert>
      ) : null}
      {!resolvedScope && scopeResolution.status === "ambiguous" ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            此地址仍對應多個郵遞區號，請補上附號或樓層等完整資訊。
          </AlertDescription>
        </Alert>
      ) : null}
      {parsedAddress.warns.map((warning) => (
        <Alert key={warning} variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ))}
      {!addressSuffix ? (
        <p className="text-xs text-muted-foreground">
          地址轉換仍可能有誤，使用前請確認中文地址內容。
        </p>
      ) : null}
    </div>
  )
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
  const parsedAddress = formatAddress(address, addressSuffix)
  const hasParsedParts = Object.values(parsedAddress.form).some(Boolean)

  return (
    <section className="flex flex-col gap-5" aria-labelledby="detail-title">
      <div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回搜尋
        </Button>
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPinIcon className="size-4" aria-hidden="true" />
          查詢地址
        </div>
        <h1
          id="detail-title"
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {address}
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>輸入後續地址</CardTitle>
          <CardDescription>
            系統會依郵局規則即時判斷完整的 3+3 郵遞區號。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="address-suffix">巷、弄、門牌與樓層</FieldLabel>
              <Input
                ref={addressInputRef}
                id="address-suffix"
                value={addressSuffix}
                onChange={(event) => onAddressSuffixChange(event.target.value)}
                autoComplete="off"
                placeholder="例如：31巷12號之5 5樓、31號404室"
              />
              <FieldDescription>
                請使用阿拉伯數字；附號可輸入「之」或連字號。
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="mt-4 flex flex-col gap-3">
            <AddressAlerts
              addressSuffix={addressSuffix}
              parsedAddress={parsedAddress}
              resolvedScope={resolvedScope}
              scopeResolution={scopeResolution}
            />
            {hasParsedParts ? (
              <div className="flex flex-wrap gap-2" aria-label="已辨識的地址部分">
                {parsedAddress.form.ln ? (
                  <Badge variant="secondary">{parsedAddress.form.ln}巷</Badge>
                ) : null}
                {parsedAddress.form.aly ? (
                  <Badge variant="secondary">{parsedAddress.form.aly}弄</Badge>
                ) : null}
                {parsedAddress.form.no ? (
                  <Badge variant="secondary">
                    {parsedAddress.form.no}號
                    {parsedAddress.form.noDash
                      ? `之${parsedAddress.form.noDash}`
                      : ""}
                  </Badge>
                ) : null}
                {parsedAddress.form.floor ? (
                  <Badge variant="secondary">
                    {parsedAddress.form.basement ? "地下" : ""}
                    {parsedAddress.form.floor}樓
                    {parsedAddress.form.floorDash
                      ? `之${parsedAddress.form.floorDash}`
                      : ""}
                  </Badge>
                ) : null}
                {parsedAddress.form.room ? (
                  <Badge variant="secondary">{parsedAddress.form.room}室</Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>郵遞區號</CardTitle>
          <CardDescription>
            {displayedZipcode || "待輸入完整門牌後自動判斷"}
          </CardDescription>
          <CardAction>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="顯示此道路的所有郵遞區號規則"
                  />
                }
              >
                <InfoIcon />
              </PopoverTrigger>
              <PopoverContent align="end" className="max-h-80 w-80 overflow-y-auto sm:w-96">
                <PopoverHeader>
                  <PopoverTitle>此道路的所有郵遞區號規則</PopoverTitle>
                  <PopoverDescription>
                    共 {scopes.length} 筆；目前符合的規則會標示為「已匹配」。
                  </PopoverDescription>
                </PopoverHeader>
                <div className="flex flex-col gap-1">
                  {scopes.map((rule, index) => (
                    <div
                      key={`${rule.zipcode}-${rule.scope}-${index}`}
                      className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-md px-2 py-1.5 text-sm"
                    >
                      <Badge
                        variant={rule === resolvedScope ? "default" : "outline"}
                      >
                        {addressSuffix
                          ? rule.zipcode
                          : String(rule.zipcode).slice(0, 3)}
                      </Badge>
                      <span className="min-w-0">
                        {rule === resolvedScope ? (
                          <span className="block text-xs font-medium text-muted-foreground">
                            已匹配
                          </span>
                        ) : null}
                        {rule.department ? (
                          <span className="block font-medium">
                            {rule.department}
                          </span>
                        ) : null}
                        {formatScopeRule(rule.scope)}
                      </span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            {displayedZipcode || "— — — — — —"}
          </p>
          {!addressSuffix ? (
            <p className="text-sm text-muted-foreground">
              {baseZipcodePrefixes.length === 1
                ? "尚未輸入後續地址，後三碼暫不顯示。"
                : "此道路包含不同前三碼，請輸入後續地址後判斷。"}
            </p>
          ) : resolvedScope ? (
            <p className="text-sm text-muted-foreground">
              匹配規則：{formatScopeRule(resolvedScope.scope)}
              {matchedRuleBasis ? `（以 ${matchedRuleBasis}判斷）` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>地址資訊</CardTitle>
          <CardDescription>中文地址與英文地址會隨輸入即時更新。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {resolvedScope?.department ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">大宗戶</p>
              <p>{resolvedScope.department}</p>
              <Separator className="mt-3" />
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">中文地址</p>
            <p>{parsedAddress.zh}</p>
          </div>
          <Separator />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">英文地址</p>
            <p className="break-words">{parsedAddress.en}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

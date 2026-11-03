import {
  Building2Icon,
  CircleAlertIcon,
  InfoIcon,
  ListIcon,
  type LucideIcon,
} from "lucide-react"

import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  formatAddress,
  formatScopeRule,
  type ZipcodeScope,
} from "@/lib/addresses"
import { cn } from "@/lib/utils"
import { parseAddressSuffix } from "@/utils/zipcodeScopeMatcher.js"

type ScopeResolution = {
  status: "empty" | "incomplete" | "unmatched" | "ambiguous" | "matched"
  matches: ZipcodeScope[]
  pending?: ZipcodeScope[]
}

type AddressResultProps = {
  address: string
  addressSuffix: string
  baseZipcodePrefixes: string[]
  displayedZipcode: string
  matchedRuleBasis: string
  resolvedScope: ZipcodeScope | null
  scopeResolution: ScopeResolution
  scopes: ZipcodeScope[]
}

type Tone = "success" | "warning" | "neutral" | "destructive"

const TONE_CLASSES: Record<Tone, string> = {
  success:
    "bg-[color-mix(in_oklab,var(--success)_14%,var(--card))] text-success",
  warning:
    "bg-[color-mix(in_oklab,var(--warning)_16%,var(--card))] text-warning",
  neutral: "bg-secondary text-muted-foreground",
  destructive:
    "bg-[color-mix(in_oklab,var(--destructive)_12%,var(--card))] text-destructive",
}

const STATUS = {
  complete: { label: "完整六碼", tone: "success" },
  pending: { label: "尚未確認", tone: "warning" },
  awaiting: { label: "待補門牌", tone: "neutral" },
  unmatched: { label: "找不到範圍", tone: "destructive" },
} as const satisfies Record<string, { label: string; tone: Tone }>

function StatusPill({ status }: { status: keyof typeof STATUS }) {
  const { label, tone } = STATUS[status]
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
        TONE_CLASSES[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  )
}

function IconTile({
  icon: Icon,
  text,
  color,
}: {
  icon?: LucideIcon
  text?: string
  color: string
}) {
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
      style={{
        color: `var(${color})`,
        backgroundColor: `color-mix(in oklab, var(${color}) 13%, var(--card))`,
      }}
      aria-hidden="true"
    >
      {Icon ? <Icon className="size-[1.125rem]" /> : text}
    </span>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 font-mono text-[0.8125rem] break-words">
        {value}
      </span>
    </span>
  )
}

export function AddressResult({
  address,
  addressSuffix,
  baseZipcodePrefixes,
  displayedZipcode,
  matchedRuleBasis,
  resolvedScope,
  scopeResolution,
  scopes,
}: AddressResultProps) {
  const hasSuffix = Boolean(addressSuffix.trim())
  const isSuffixIncomplete =
    hasSuffix && !parseAddressSuffix(addressSuffix).complete
  const isComplete = displayedZipcode.length === 6
  const fullZipcode = isComplete ? displayedZipcode : ""
  const parsedAddress = formatAddress(address, addressSuffix, fullZipcode)
  const isUnmatched = scopeResolution.status === "unmatched"
  const chineseAddress = `${fullZipcode}${address}${addressSuffix.trim()}`
  const status = isComplete
    ? "complete"
    : isUnmatched
      ? "unmatched"
      : hasSuffix
        ? "pending"
        : "awaiting"
  const message = !hasSuffix
    ? ""
    : isUnmatched
      ? "找不到符合的門牌範圍。請確認道路、巷弄與門牌，或查看此道路的規則。"
      : !resolvedScope && scopeResolution.status === "ambiguous"
        ? "此地址對應多個區號，請補上附號或樓層，協助縮小範圍。"
        : !resolvedScope && scopeResolution.status === "incomplete"
          ? "還需要更完整的門牌資訊。請確認已填寫「號」，並補上適用的附號或樓層。"
          : ""
  const zipcodeLabel = isComplete
    ? `郵遞區號 ${displayedZipcode}`
    : displayedZipcode
      ? `前三碼 ${displayedZipcode}，後三碼待確認`
      : "郵遞區號待確認"
  const ruleSummary =
    isComplete && resolvedScope
      ? formatScopeRule(resolvedScope.scope)
      : !hasSuffix && baseZipcodePrefixes.length === 1
        ? "補上門牌後確認後三碼"
        : "確認完整門牌後顯示"

  return (
    <section className="flex flex-col gap-3" aria-label="查詢結果">
      <Card>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-xs tracking-wide text-muted-foreground">
                3+3 郵遞區號
              </h2>
              <p className="text-lg font-semibold tracking-tight break-words">
                {address}
              </p>
            </div>
            <StatusPill status={status} />
          </div>

          <div
            className="h-3 bg-[repeating-linear-gradient(to_right,var(--border)_0_1px,transparent_1px_7px)]"
            aria-hidden="true"
          />

          <p
            className="flex items-baseline gap-3 text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl"
            aria-live="polite"
            aria-atomic="true"
            aria-label={zipcodeLabel}
          >
            <span>{displayedZipcode.slice(0, 3) || "···"}</span>
            <span className={isComplete ? undefined : "text-muted-foreground"}>
              {isComplete ? displayedZipcode.slice(3) : "···"}
            </span>
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <MetaItem label="規則" value={ruleSummary} />
            {matchedRuleBasis && isComplete ? (
              <MetaItem label="依據" value={matchedRuleBasis} />
            ) : null}
          </div>

          <div
            id="suffix-status"
            className={message ? undefined : "sr-only"}
            aria-live="polite"
            aria-atomic="true"
          >
            {message ? (
              <p
                className={cn(
                  "flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm",
                  isUnmatched ? TONE_CLASSES.destructive : "bg-muted",
                )}
              >
                {isUnmatched ? (
                  <CircleAlertIcon
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <InfoIcon
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                {message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <Popover>
              <PopoverTrigger
                render={<Button variant="secondary" className="min-h-11 px-4" />}
              >
                <ListIcon data-icon="inline-start" aria-hidden="true" />
                {scopes.length} 筆道路規則
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="max-h-96 w-80 max-w-[calc(100vw-2rem)] gap-3 overflow-y-auto overscroll-contain rounded-2xl p-4 sm:w-[26rem]"
              >
                <PopoverHeader>
                  <PopoverTitle>此道路的郵遞區號規則</PopoverTitle>
                  <PopoverDescription>
                    依巷弄、門牌範圍與樓層判斷，符合的規則會標示出來。
                  </PopoverDescription>
                </PopoverHeader>
                <ul className="flex flex-col divide-y">
                  {scopes.map((rule, index) => {
                    const isCurrent = isComplete && rule === resolvedScope
                    return (
                      <li
                        key={`${rule.zipcode}-${rule.scope}-${index}`}
                        className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 py-2.5 text-sm"
                      >
                        <span
                          className={cn(
                            "font-mono text-[0.8125rem]",
                            isCurrent ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {rule.zipcode}
                        </span>
                        <div className="flex min-w-0 flex-col gap-1 break-words">
                          {rule.department ? (
                            <span className="font-medium">{rule.department}</span>
                          ) : null}
                          <span>{formatScopeRule(rule.scope)}</span>
                          {isCurrent ? (
                            <span
                              className={cn(
                                "w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                                TONE_CLASSES.success,
                              )}
                            >
                              目前符合
                            </span>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </PopoverContent>
            </Popover>
            <CopyButton
              text={isComplete ? displayedZipcode : ""}
              label="複製郵遞區號"
              disabled={!isComplete}
              variant="default"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col">
          <div className="flex flex-col gap-0.5 pb-4">
            <h2 className="text-base font-semibold">地址資訊</h2>
            <p className="text-sm text-muted-foreground">
              {isComplete
                ? "已附上郵遞區號，可直接貼到寄件資料。"
                : "確認內容後，可分別複製中文地址或英文地址。"}
            </p>
          </div>
          <ul className="flex flex-col divide-y">
            {resolvedScope?.department && isComplete ? (
              <li className="flex items-center gap-3.5 py-4">
                <IconTile icon={Building2Icon} color="--warning" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">大宗戶</span>
                  <span className="break-words">{resolvedScope.department}</span>
                </div>
              </li>
            ) : null}
            <li className="flex items-center gap-3.5 py-4">
              <IconTile text="中" color="--primary" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h3 className="text-xs text-muted-foreground">中文地址</h3>
                <p className="break-words select-all">{chineseAddress}</p>
              </div>
              <CopyButton
                text={chineseAddress}
                label="複製中文地址"
                visibleLabel="複製"
              />
            </li>
            <li className="flex flex-col gap-3 py-4 last:pb-0">
              <div className="flex items-center gap-3.5">
                <IconTile text="EN" color="--success" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h3 className="text-xs text-muted-foreground">英文地址</h3>
                  <p lang="en" className="break-words select-all">
                    {parsedAddress.en}
                  </p>
                </div>
                <CopyButton
                  text={parsedAddress.en}
                  label="複製英文地址"
                  visibleLabel="複製"
                  disabled={isSuffixIncomplete || parsedAddress.warns.length > 0}
                />
              </div>
              {parsedAddress.warns.length ? (
                <p
                  className={cn(
                    "flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm",
                    TONE_CLASSES.destructive,
                  )}
                >
                  <CircleAlertIcon
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {parsedAddress.warns.join("；")}。請修正後再複製英文地址。
                </p>
              ) : (
                <p className="pl-[3.375rem] text-xs text-muted-foreground" role="status">
                  {isSuffixIncomplete
                    ? "門牌尚未辨識完整，補齊後即可複製英文地址。"
                    : "依已辨識的內容轉換，使用前請與中文地址核對。"}
                </p>
              )}
            </li>
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}

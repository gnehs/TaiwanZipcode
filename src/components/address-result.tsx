import { Fragment } from "react"
import { CircleAlertIcon, InfoIcon, ListIcon, PlusIcon } from "lucide-react"

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

// Shown only when something is missing or wrong; a complete code needs no badge.
// The pill sits on the orange card in both themes, so it uses paper with fixed inks.
const STATUS = {
  pending: { label: "尚未確認", ink: "text-[oklch(0.52_0.12_70)]" },
  awaiting: { label: "待補門牌", ink: "text-paper-ink" },
  unmatched: { label: "找不到範圍", ink: "text-[oklch(0.52_0.2_25)]" },
} as const

function StatusPill({ status }: { status: keyof typeof STATUS }) {
  const { label, ink } = STATUS[status]
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-paper px-2.5 text-xs font-medium shadow-[0_2px_6px_-2px_oklch(0.35_0.13_38/0.4)] transition-colors duration-200 ease-out",
        ink,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  )
}

const FOOTER_BUTTON =
  "h-13 rounded-none px-4 font-semibold text-primary-foreground hover:bg-white/10 hover:text-primary-foreground has-data-[icon=inline-start]:pl-4 aria-expanded:bg-white/10 aria-expanded:text-primary-foreground"

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-2">
      <span className="shrink-0 text-xs text-primary-foreground/70">{label}</span>
      <span className="min-w-0 font-mono text-[0.8125rem] break-words">
        {value}
      </span>
    </span>
  )
}

// Six cells in two groups, like the boxes printed on Taiwanese envelopes: frosted
// glass set into the orange card, so cells and card read as one material.
function ZipcodeCells({ digits }: { digits: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2.5 sm:gap-3"
      aria-hidden="true"
    >
      {[0, 1].map((group) => (
        <Fragment key={group}>
          {group === 1 ? (
            <PlusIcon className="size-5 shrink-0 sm:size-6" strokeWidth={3} />
          ) : null}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="flex h-12 w-9 items-center justify-center overflow-hidden rounded-lg bg-white/16 text-3xl font-semibold tabular-nums shadow-[inset_0_1px_0_oklch(1_0_0/0.35),inset_0_0_0_1px_oklch(1_0_0/0.18),0_4px_10px_-4px_oklch(0.35_0.13_38/0.35)] backdrop-blur-sm sm:h-18 sm:w-13 sm:rounded-xl sm:text-5xl"
              >
                {digits[group * 3 + index] ? (
                  // Re-keyed per digit so a change replays the slide-in.
                  <span
                    key={digits[group * 3 + index]}
                    className="digit-in text-shadow-[0_1px_2px_oklch(0.35_0.13_38/0.35)]"
                    style={{ "--enter-delay": `${index * 30}ms` } as React.CSSProperties}
                  >
                    {digits[group * 3 + index]}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
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
    ? null
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
  const isStreetUnusable =
    isSuffixIncomplete || parsedAddress.warns.length > 0
  const fields = parsedAddress.enFields
  const englishFields = fields
    ? [
        { label: "Address Line 1", value: fields.line1, disabled: isStreetUnusable },
        ...(fields.line2
          ? [{ label: "Address Line 2", value: fields.line2, disabled: isStreetUnusable }]
          : []),
        { label: "District", value: fields.district, disabled: false },
        { label: "City", value: fields.city, disabled: false },
        { label: "ZIP Code", value: fields.zipcode, disabled: !isComplete },
        { label: "Country", value: fields.country, disabled: false },
      ]
    : []
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
  const metaItems = (
    <>
      <MetaItem label="規則" value={ruleSummary} />
      {matchedRuleBasis && isComplete ? (
        <MetaItem label="依據" value={matchedRuleBasis} />
      ) : null}
    </>
  )

  return (
    <section className="flex flex-col gap-3" aria-label="查詢結果">
      <Card className="enter-rise relative bg-primary bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--primary),white_10%),color-mix(in_oklab,var(--primary),black_6%))] text-primary-foreground shadow-primary">
        <div
          className="plus-grid pointer-events-none absolute inset-0 text-white/15"
          aria-hidden="true"
        />
        <div
          className="grain pointer-events-none absolute inset-0 opacity-40"
          aria-hidden="true"
        />
        <div
          className="rim pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,rgb(255_255_255/0.22),transparent_60%)]"
          aria-hidden="true"
        />
        <CardContent className="relative flex flex-col gap-6">
          {/* The road already leads the search input, so it is only spoken here. */}
          <h2 className="sr-only">{address}的 3+3 郵遞區號</h2>
          {status ? (
            <div className="-mb-2 flex justify-center">
              <StatusPill status={status} />
            </div>
          ) : null}

          <div
            role="img"
            aria-live="polite"
            aria-atomic="true"
            aria-label={zipcodeLabel}
          >
            <ZipcodeCells digits={displayedZipcode} />
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 sm:hidden">
            {metaItems}
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
                  isUnmatched
                    ? TONE_CLASSES.destructive
                    : "bg-white/15 text-primary-foreground",
                )}
              >
                {isUnmatched ? (
                  <CircleAlertIcon
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <InfoIcon
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {message}
              </p>
            ) : null}
          </div>

        </CardContent>
        {/* Footer: the rule summary on the left (wider screens), actions on the right. */}
        <div className="relative -mb-(--card-spacing) flex border-t border-white/25">
          <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1 py-3 pl-(--card-spacing) sm:flex">
            {metaItems}
          </div>
          <div className="flex flex-1 items-center justify-between sm:flex-none">
            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="ghost" className={FOOTER_BUTTON} />
                }
              >
                <ListIcon data-icon="inline-start" aria-hidden="true" />
                {scopes.length} 筆規則
              </PopoverTrigger>
              <PopoverContent
                align="end"
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
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 py-2.5 text-sm"
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
                        </div>
                        {isCurrent ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                              TONE_CLASSES.success,
                            )}
                          >
                            符合
                          </span>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </PopoverContent>
            </Popover>
            {/* Sits in the card's corner: 18px pill radius + 8px inset = 26px card radius. */}
            <CopyButton
              text={isComplete ? displayedZipcode : ""}
              label="複製郵遞區號"
              visibleLabel="複製"
              disabled={!isComplete}
              variant="outline"
              className="my-2 mr-2 h-9 min-h-9 px-4 font-semibold text-paper-ink [--control-bottom:oklch(0.9_0.012_50)] [--control-top:var(--paper)] hover:text-paper-ink"
            />
          </div>
        </div>
      </Card>

      <Card
        className="enter-rise"
        style={{ "--enter-delay": "60ms" } as React.CSSProperties}
      >
        <CardContent className="flex flex-col">
          <h2 className="pb-2 text-base font-semibold">地址資訊</h2>
          <ul className="flex flex-col divide-y">
            {resolvedScope?.department && isComplete ? (
              <li className="flex items-center gap-3.5 py-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">大宗戶</span>
                  <span className="break-words">{resolvedScope.department}</span>
                </div>
              </li>
            ) : null}
            <li className="flex items-center gap-3.5 py-4">
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
                  disabled={isStreetUnusable}
                />
              </div>
              {englishFields.length ? (
                <ul className="flex flex-col divide-y rounded-2xl bg-muted px-4">
                  {englishFields.map((field) => (
                    <li
                      key={field.label}
                      className="flex items-center gap-3 py-2"
                    >
                      <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
                        <span className="text-xs text-muted-foreground sm:w-28 sm:shrink-0">
                          {field.label}
                        </span>
                        <span
                          lang="en"
                          className={cn(
                            "min-w-0 break-words select-all",
                            field.value ? undefined : "text-muted-foreground",
                          )}
                        >
                          {field.value || "—"}
                        </span>
                      </div>
                      <CopyButton
                        text={field.value}
                        label={`複製 ${field.label}`}
                        visibleLabel=""
                        variant="outline"
                        disabled={field.disabled}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
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
                <p className="text-xs text-muted-foreground" role="status">
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

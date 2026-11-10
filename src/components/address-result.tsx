import { Fragment } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronDownIcon, CircleAlertIcon, InfoIcon, LinkIcon, PlusIcon } from "lucide-react"

import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  addressIndex,
  formatAddress,
  formatScopeRule,
  type AddressWarning,
  type ScopeResolution,
  type ZipcodeScope,
} from "@/lib/addresses"
import { addressSlug, shareUrl } from "@/lib/address-path"
import { useRoadDoorplates } from "@/lib/doorplates"
import { useLocale, useText, type Locale } from "@/lib/locale"
import { cn } from "@/lib/utils"
import { findDoor } from "@/utils/doorplates.js"
import { scopeRuleToEnglish } from "@/utils/scopeRuleEnglish.js"
import { parseAddressSuffix } from "@/utils/zipcodeScopeMatcher.js"

type AddressResultProps = {
  address: string
  addressSuffix: string
  displayedZipcode: string
  resolvedScope: ZipcodeScope | null
  scopeResolution: ScopeResolution
  scopes: ZipcodeScope[]
  // Picks a bulk recipient's own code, or null for the general range.
  onRecipientChange: (scope: ZipcodeScope | null) => void
}

const TEXT = {
  zh: {
    general: "一般地址",
    recipient: (label: string) => `收件對象：${label}`,
    rule: "規則",
    ruleCount: (count: number) => `${count} 條`,
    rulesTitle: "郵遞區號規則",
    result: "查詢結果",
    heading: (road: string) => `${road}的 3+3 郵遞區號`,
    noRange: "找不到符合的門牌範圍",
    addSubNumber: "請補上附號或樓層",
    addHouseNumber: "請補上完整門牌",
    doorUnlisted: "門牌資料查無此號",
    why: "了解原因",
    zipcode: (code: string) => `郵遞區號 ${code}`,
    zipcodePrefix: (code: string) => `前三碼 ${code}，後三碼待確認`,
    zipcodePending: "郵遞區號待確認",
    bulk: "大宗戶",
    chineseAddress: "中文地址",
    englishAddress: "英文地址",
    copyChinese: "複製中文地址",
    copyEnglish: "複製英文地址",
    copy: "複製",
    copyField: (label: string) => `複製 ${label}`,
    copyShare: "複製分享連結",
    share: "分享",
    copyZipcode: "複製郵遞區號",
    city: "縣市",
    district: "鄉鎮市區",
    street: "詳細地址",
    warnJoin: "；",
    warnings: {
      chineseNumerals: "請不要輸入中文數字",
      subAlleyDropped: "英文地址未包含「衖」",
      laneName: "不支援在此介面輸入中文巷弄名稱",
      unconverted: "部分門牌內容未能轉換成英文",
    } satisfies Record<AddressWarning, string>,
  },
  en: {
    general: "General address",
    recipient: (label: string) => `Recipient: ${label}`,
    rule: "Rule",
    ruleCount: (count: number) => (count === 1 ? "1 rule" : `${count} rules`),
    rulesTitle: "Zip code rules",
    result: "Lookup result",
    heading: (road: string) => `3+3 zip code for ${road}`,
    noRange: "No matching range",
    addSubNumber: "Add a sub-number or floor",
    addHouseNumber: "Add the full house number",
    doorUnlisted: "House number unconfirmed",
    why: "Why",
    zipcode: (code: string) => `Zip code ${code}`,
    zipcodePrefix: (code: string) => `First 3 digits ${code}, last 3 to confirm`,
    zipcodePending: "Zip code to confirm",
    bulk: "Bulk recipient",
    chineseAddress: "In Chinese",
    englishAddress: "English address",
    copyChinese: "Copy Chinese address",
    copyEnglish: "Copy English address",
    copy: "Copy",
    copyField: (label: string) => `Copy ${label}`,
    copyShare: "Copy share link",
    share: "Share",
    copyZipcode: "Copy zip code",
    city: "City",
    district: "District",
    street: "Street address",
    warnJoin: "; ",
    warnings: {
      chineseNumerals: "Don't use Chinese numerals",
      subAlleyDropped: "The English address leaves out 衖",
      laneName: "Chinese lane and alley names aren't supported here",
      unconverted: "Part of the house number couldn't be converted to English",
    } satisfies Record<AddressWarning, string>,
  },
}

// The share link points at the page in the visitor's language.
function localizedShareUrl(locale: Locale, slug: string) {
  const url = shareUrl(window.location.origin, slug)
  if (locale === "zh") return url
  const { origin } = window.location
  return `${origin}/en${url.slice(origin.length)}`
}

const DESTRUCTIVE_TONE =
  "bg-[color-mix(in_oklab,var(--destructive)_12%,var(--card))] text-destructive"

// An address shared with bulk recipients asks who the mail is for. It sits
// on the orange card in both themes, so it uses paper with fixed inks.
function RecipientPicker({
  general,
  recipients,
  selected,
  onChange,
}: {
  general: ZipcodeScope
  recipients: ZipcodeScope[]
  selected: ZipcodeScope | null
  onChange: (scope: ZipcodeScope | null) => void
}) {
  const text = useText(TEXT)
  const options = [
    { label: text.general, scope: general },
    ...recipients.map((scope) => ({
      label: scope.department ?? String(scope.zipcode),
      scope,
    })),
  ]
  const index = Math.max(
    0,
    options.findIndex(({ scope }) => scope === selected),
  )
  return (
    <div className="-mb-2 flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={text.recipient(options[index].label)}
          className="inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-full bg-paper pr-2 pl-3 text-xs font-medium text-paper-ink shadow-[0_2px_6px_-2px_oklch(0.4_0.13_48/0.4)] outline-none transition-colors duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--paper),var(--paper-ink)_8%)] focus-visible:ring-3 focus-visible:ring-white/50"
        >
          <span className="truncate">{options[index].label}</span>
          <ChevronDownIcon className="size-3.5 shrink-0" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-auto max-w-[min(22rem,calc(100vw-2rem))]">
          <DropdownMenuRadioGroup
            value={String(index)}
            onValueChange={(value) => {
              const scope = options[Number(value)].scope
              onChange(scope === general ? null : scope)
            }}
          >
            {options.map(({ label, scope }, optionIndex) => (
              <DropdownMenuRadioItem
                key={optionIndex}
                value={String(optionIndex)}
                closeOnClick
                className="min-h-10 gap-3 pl-3"
              >
                <span className="min-w-0 flex-1 break-words">{label}</span>
                <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
                  {scope.zipcode}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// The copy button's pill, mirrored into the other corner, with no surface until hovered.
const FOOTER_BUTTON =
  "my-1.5 ml-1.5 font-semibold text-primary-foreground hover:bg-white/15 hover:text-primary-foreground dark:hover:bg-white/15 aria-expanded:bg-white/15 aria-expanded:text-primary-foreground"

const META_VALUE = "min-w-0 text-[0.8125rem] break-words"

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-2">
      <span className="shrink-0 text-xs text-primary-foreground/70">{label}</span>
      {typeof value === "string" ? (
        <span className={META_VALUE}>{value}</span>
      ) : (
        value
      )}
    </span>
  )
}

type ScopeRulesProps = {
  align: "start" | "center"
  isComplete: boolean
  resolvedScope: ZipcodeScope | null
  scopes: ZipcodeScope[]
  summary: string
}

// A long list opens with the matching rule in the middle of view.
function scrollToCurrentRule(list: HTMLUListElement | null) {
  const current = list?.querySelector<HTMLElement>("[data-current]")
  if (!list || !current) return
  list.scrollTop =
    current.offsetTop - (list.clientHeight - current.offsetHeight) / 2
}

// The rule summary doubles as the trigger for every rule on this road.
function ScopeRules({
  align,
  isComplete,
  resolvedScope,
  scopes,
  summary,
}: ScopeRulesProps) {
  const text = useText(TEXT)
  const locale = useLocale()
  if (!scopes.length) return <span className={META_VALUE}>{summary}</span>
  return (
    <Popover>
      {/* Hover only reacts to a mouse, so touch still opens it with a tap. */}
      <PopoverTrigger
        openOnHover
        delay={300}
        className={cn(
          META_VALUE,
          "cursor-pointer rounded-sm text-left underline decoration-[color-mix(in_oklab,var(--primary-foreground)_55%,var(--primary))] decoration-dashed underline-offset-4 outline-none hover:decoration-primary-foreground focus-visible:ring-2 focus-visible:ring-white/60 aria-expanded:decoration-primary-foreground",
        )}
      >
        {summary}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="max-h-96 w-80 max-w-[calc(100vw-2rem)] gap-1 rounded-2xl p-0 sm:w-[26rem]"
      >
        <PopoverHeader className="px-4 pt-4">
          <PopoverTitle>{text.rulesTitle}</PopoverTitle>
        </PopoverHeader>
        <ul
          ref={scrollToCurrentRule}
          className="scroll-fade relative flex min-h-0 flex-col divide-y overflow-y-auto overscroll-contain px-4 pb-2"
        >
          {scopes.map((rule, index) => {
            const isCurrent = isComplete && rule === resolvedScope
            return (
              <li
                key={`${rule.zipcode}-${rule.scope}-${index}`}
                data-current={isCurrent || undefined}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 py-2.5 text-sm data-current:font-medium"
              >
                <span
                  className={cn(
                    "text-[0.8125rem]",
                    isCurrent ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {rule.zipcode}
                </span>
                <div className="flex min-w-0 flex-col gap-1 break-words">
                  {rule.department ? (
                    <span className="font-medium">{rule.department}</span>
                  ) : null}
                  <span>
                    {locale === "en"
                      ? scopeRuleToEnglish(rule.scope)
                      : formatScopeRule(rule.scope)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
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
                className="flex h-12 w-9 items-center justify-center overflow-hidden rounded-lg bg-white/16 text-3xl font-semibold tabular-nums shadow-[inset_0_1px_0_oklch(1_0_0/0.35),inset_0_0_0_1px_oklch(1_0_0/0.18),0_4px_10px_-4px_oklch(0.4_0.13_48/0.35)] backdrop-blur-sm sm:h-18 sm:w-13 sm:rounded-xl sm:text-5xl"
              >
                {digits[group * 3 + index] ? (
                  // Re-keyed per digit so a change replays the slide-in.
                  <span
                    key={digits[group * 3 + index]}
                    className="digit-in text-shadow-[0_1px_2px_oklch(0.4_0.13_48/0.35)]"
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
  displayedZipcode,
  resolvedScope,
  scopeResolution,
  scopes,
  onRecipientChange,
}: AddressResultProps) {
  const text = useText(TEXT)
  const locale = useLocale()
  const isEnglish = locale === "en"
  const hasSuffix = Boolean(addressSuffix.trim())
  const isSuffixIncomplete =
    hasSuffix && !parseAddressSuffix(addressSuffix).complete
  const isComplete = displayedZipcode.length === 6
  const fullZipcode = isComplete ? displayedZipcode : ""
  const parsedAddress = formatAddress(address, addressSuffix, fullZipcode)
  const isUnmatched = scopeResolution.status === "unmatched"
  const chineseAddress = `${fullZipcode}${address}${addressSuffix.trim()}`
  const slug = addressSlug(address, addressSuffix)
  const { doorplates } = useRoadDoorplates(address)
  const isDoorUnlisted =
    isComplete && findDoor(doorplates, addressSuffix) === "missing"
  const message = !hasSuffix
    ? ""
    : isUnmatched
      ? text.noRange
      : !resolvedScope && scopeResolution.status === "ambiguous"
        ? text.addSubNumber
        : !resolvedScope && scopeResolution.status === "incomplete"
          ? text.addHouseNumber
          : isDoorUnlisted
            ? text.doorUnlisted
            : ""
  const isStreetUnusable =
    isSuffixIncomplete || parsedAddress.warns.length > 0
  const place = addressIndex.placeByAddress[address]
  const chineseFields = place
    ? [
        { label: text.city, value: place.city, disabled: false },
        { label: text.district, value: place.area, disabled: false },
        { label: text.street, value: `${place.road}${addressSuffix.trim()}`, disabled: false },
      ]
    : []
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
    ? text.zipcode(displayedZipcode)
    : displayedZipcode
      ? text.zipcodePrefix(displayedZipcode)
      : text.zipcodePending
  const ruleSummary =
    isComplete && resolvedScope
      ? isEnglish
        ? scopeRuleToEnglish(resolvedScope.scope)
        : formatScopeRule(resolvedScope.scope)
      : text.ruleCount(scopes.length)
  const metaItems = (align: ScopeRulesProps["align"]) => (
    <MetaItem
      label={text.rule}
      value={
        <ScopeRules
          align={align}
          isComplete={isComplete}
          resolvedScope={resolvedScope}
          scopes={scopes}
          summary={ruleSummary}
        />
      }
    />
  )

  const chineseItem = (
    <li key="zh" className="flex flex-col gap-3 py-4 last:pb-0">
      <div className="flex items-center gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className={isEnglish ? "text-xs font-normal text-muted-foreground" : "sr-only"}>
            {text.chineseAddress}
          </h3>
          <p lang={isEnglish ? "zh-TW" : undefined} className="text-base font-medium break-words sm:text-lg">
            {chineseAddress}
          </p>
        </div>
        <CopyButton
          text={chineseAddress}
          label={text.copyChinese}
          visibleLabel={text.copy}
        />
      </div>
      {chineseFields.length ? <AddressFields fields={chineseFields} lang={isEnglish ? "zh-TW" : undefined} /> : null}
    </li>
  )
  const englishItem = (
    <li key="en" className="flex flex-col gap-3 py-4 last:pb-0">
      <div className="flex items-center gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="sr-only">{text.englishAddress}</h3>
          <p lang="en" className="text-base font-medium break-words sm:text-lg">
            {parsedAddress.en}
          </p>
        </div>
        <CopyButton
          text={parsedAddress.en}
          label={text.copyEnglish}
          visibleLabel={text.copy}
          disabled={isStreetUnusable}
        />
      </div>
      {englishFields.length ? <AddressFields fields={englishFields} lang="en" /> : null}
      {parsedAddress.warns.length ? (
        <p
          className={cn(
            "flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm",
            DESTRUCTIVE_TONE,
          )}
        >
          <CircleAlertIcon
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          {parsedAddress.warns.map((code) => text.warnings[code]).join(text.warnJoin)}
        </p>
      ) : null}
    </li>
  )

  return (
    // Pulled up to overlap the photo band, like the recent lookups card.
    <section className="relative -mt-12 flex flex-col sm:-mt-14" aria-label={text.result}>
      <Card className="enter-rise relative z-10 bg-primary bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--primary),var(--primary-gold)_35%),color-mix(in_oklab,var(--primary),black_4%))] text-primary-foreground shadow-primary">
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
          <h2 className="sr-only">{text.heading(isEnglish ? (addressIndex.englishByAddress[address]?.road ?? address) : address)}</h2>
          {scopeResolution.recipients?.length ? (
            <RecipientPicker
              general={scopeResolution.matches[0]}
              recipients={scopeResolution.recipients}
              selected={resolvedScope}
              onChange={onRecipientChange}
            />
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
            {metaItems("center")}
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
                    ? DESTRUCTIVE_TONE
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
                <span className="min-w-0 flex-1">{message}</span>
                {isDoorUnlisted ? (
                  // Its own column, so the message wraps without splitting it.
                  <Link
                    to="/faq"
                    hash="doorplates"
                    className="shrink-0 font-medium underline underline-offset-4"
                  >
                    {text.why}
                  </Link>
                ) : null}
              </p>
            ) : null}
          </div>

        </CardContent>
        {/* Footer: the rule summary on the left (wider screens), actions on the right. */}
        <div data-zipcode-divider className="relative -mb-(--card-spacing) flex border-t border-white/25">
          <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1 py-3 pl-(--card-spacing) sm:flex">
            {metaItems("start")}
          </div>
          <div className="flex flex-1 items-center justify-between gap-2 sm:flex-none">
            <div className="flex">
              {slug ? (
                <CopyButton
                  text={localizedShareUrl(locale, slug)}
                  label={text.copyShare}
                  visibleLabel={text.share}
                  variant="ghost"
                  icon={<LinkIcon />}
                  className={FOOTER_BUTTON}
                />
              ) : null}
            </div>
            {/* Sits in the card's corner: 18px pill radius + 8px inset = 26px card radius. */}
            <CopyButton
              text={isComplete ? displayedZipcode : ""}
              label={text.copyZipcode}
              visibleLabel={text.copy}
              disabled={!isComplete}
              variant="outline"
              className="my-1.5 mr-1.5 font-semibold text-paper-ink [--control-bottom:oklch(0.9_0.012_50)] [--control-top:var(--paper)] hover:text-paper-ink"
            />
          </div>
        </div>
      </Card>

      {/* Tucked under the zipcode card so the two read as one stack. */}
      <Card
        className="enter-rise relative -mt-8 rounded-t-none pt-[calc(var(--card-spacing)+2rem)] pb-5"
        style={{ "--enter-delay": "60ms" } as React.CSSProperties}
      >
        {/* The orange card's glow spilling onto this one. It starts at the very top,
            under the orange card, so its rounded corners show the glow too. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--primary)_14%,transparent)_2rem,transparent)]"
          aria-hidden="true"
        />
        <CardContent className="relative flex flex-col">
          <ul className="-mt-4 flex flex-col divide-y">
            {resolvedScope?.department && isComplete ? (
              <li className="flex items-center gap-3.5 py-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{text.bulk}</span>
                  <span className="break-words">{resolvedScope.department}</span>
                </div>
              </li>
            ) : null}
            {isEnglish ? [englishItem, chineseItem] : [chineseItem, englishItem]}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}

type AddressField = { label: string; value: string; disabled: boolean }

// A click anywhere on a row copies it, unless the click ended a text selection:
// people also drag across part of a value to copy just that.
function copyRow(event: React.MouseEvent<HTMLLIElement>) {
  const row = event.currentTarget
  if ((event.target as Element).closest("button")) return
  const selection = window.getSelection()
  if (selection && !selection.isCollapsed && row.contains(selection.anchorNode)) return
  row.querySelector("button")?.click()
}

// The parts most address forms ask for, each copied on its own.
function AddressFields({ fields, lang }: { fields: AddressField[]; lang?: string }) {
  const text = useText(TEXT)
  return (
    <ul className="flex flex-col rounded-2xl bg-muted shadow-well">
      {fields.map((field) => (
        <li
          key={field.label}
          onClick={field.disabled || !field.value ? undefined : copyRow}
          className={cn(
            // Inset divider, so the row itself can run out to the tray's edges.
            "group/field relative flex items-center gap-3 px-4 py-2 not-first:before:absolute not-first:before:inset-x-4 not-first:before:top-0 not-first:before:h-px not-first:before:bg-border",
            field.disabled || !field.value ? undefined : "cursor-pointer",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs text-muted-foreground sm:w-28 sm:shrink-0">
              {field.label}
            </span>
            <span
              lang={lang}
              className={cn(
                "min-w-0 break-words",
                field.value ? undefined : "text-muted-foreground",
                // Digits match the zipcode cells above.
                /^\d+$/.test(field.value) && "tabular-nums",
              )}
            >
              {field.value || "—"}
            </span>
          </div>
          <CopyButton
            text={field.value}
            label={text.copyField(field.label)}
            visibleLabel=""
            variant="ghost"
            disabled={field.disabled}
            className="text-muted-foreground group-hover/field:enabled:bg-background group-hover/field:enabled:text-foreground group-hover/field:enabled:shadow-control focus-visible:bg-background"
          />
        </li>
      ))}
    </ul>
  )
}

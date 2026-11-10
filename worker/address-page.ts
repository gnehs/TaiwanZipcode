import { formatScopeRule, type AddressLookup } from "@/lib/addresses"
import { sharePath } from "@/lib/address-path"
import { localePath, type Locale } from "@/lib/locale"
import { addressPage, type PlacePage } from "@/lib/page-meta"
import { SITE_ORIGIN } from "@/lib/site"
import { readable } from "@/utils/addressUrls.js"
import { escapeHtml } from "@/utils/pageHead.js"
import { scopeRuleToEnglish } from "@/utils/scopeRuleEnglish.js"

const TEXT = {
  zh: {
    zipcode: "郵遞區號",
    prefixOnly: (prefix: string) => `前三碼 ${prefix}，後三碼依門牌而定`,
    byHouse: "依門牌而定",
    english: "英文地址",
    chinese: "中文地址",
    rule: "規則",
    ranges: "郵遞區號範圍",
    range: "範圍",
    lanes: "巷弄",
    houses: "門牌",
    districts: "行政區",
    roads: "道路",
    trail: "導覽路徑",
    separator: "：",
  },
  en: {
    zipcode: "Zip code",
    prefixOnly: (prefix: string) => `Starts with ${prefix}; the last three digits depend on the house number`,
    byHouse: "Depends on the house number",
    english: "In English",
    chinese: "In Chinese",
    rule: "Rule",
    ranges: "Zip codes by house number",
    range: "House numbers",
    lanes: "Lanes and alleys",
    houses: "House numbers",
    districts: "Districts",
    roads: "Roads",
    trail: "Breadcrumb",
    separator: ": ",
  },
} satisfies Record<Locale, unknown>

const ruleText = (locale: Locale, scope: string) =>
  locale === "en" ? scopeRuleToEnglish(scope) : formatScopeRule(scope)

// A road's lanes and alleys ("" for the road itself, "527巷", "527巷101弄"),
// each with its house numbers ("2,10,51-1"); see utils/doorplates.js.
export type RoadDoorplates = Record<string, string>

type Link = { name: string; path: string }

type AddressContent = {
  name: string
  trail: Link[]
  facts: [label: string, value: string][]
  // The post office's ranges, until the zipcode is known in full.
  ranges: [zipcode: string, rule: string][]
  lanes: Link[]
  houses: Link[]
}

/**
 * What an address page says to readers that do not run the app: the trail,
 * the zipcode and English address, the post office's ranges, and links down
 * to each lane, alley and house the county lists.
 */
function addressContent(
  lookup: AddressLookup,
  doorplates: RoadDoorplates | null,
  locale: Locale,
): AddressContent | null {
  const page = addressPage(lookup, locale)
  if (!page) return null
  const text = TEXT[locale]
  const { name, en, form, trail } = page
  const { road, scopes, resolvedScope, displayedZipcode } = lookup
  const isComplete = displayedZipcode.length === 6

  const facts: AddressContent["facts"] = [
    [
      text.zipcode,
      isComplete
        ? displayedZipcode
        : displayedZipcode
          ? text.prefixOnly(displayedZipcode)
          : text.byHouse,
    ],
  ]
  if (en) facts.push([text.english, en])
  if (locale === "en") facts.push([text.chinese, name])
  if (isComplete && resolvedScope) facts.push([text.rule, ruleText(locale, resolvedScope.scope)])

  // Only a road, lane or alley, typed as nothing more, leads further down.
  const lane = form.ln ? `${form.ln}巷` : ""
  const path = `${lane}${form.aly ? `${form.aly}弄` : ""}`
  const isBranch = !form.no && name === `${road}${path}`
  const link = (label: string, rest: string) => ({
    name: label,
    path: localePath(locale, sharePath(`${road}${rest}`)),
  })
  const lanes =
    isBranch && doorplates
      ? Object.keys(doorplates)
          .filter((key) => isChildPath(path, key))
          .sort((a, b) => parseInt(a.slice(path.length)) - parseInt(b.slice(path.length)))
          .map((key) => link(locale === "en" ? englishPath(key.slice(path.length)) : key.slice(path.length), key))
      : []
  const houses =
    isBranch && doorplates?.[path]
      ? doorplates[path].split(",").map((number) => {
          const house = houseName(number)
          return link(locale === "en" ? `No. ${number}` : house, `${path}${house}`)
        })
      : []

  return {
    name: locale === "en" && en ? en.replace(/, Taiwan \(R\.O\.C\.\)$/, "") : name,
    trail,
    facts,
    ranges: isComplete
      ? []
      : scopes.map((scope) => [
          String(scope.zipcode),
          [scope.department, ruleText(locale, scope.scope)].filter(Boolean).join(" "),
        ]),
    lanes,
    houses,
  }
}

// "527巷" under the road, "527巷101弄" under 527巷, and "3弄" (an alley
// right on the road) under the road.
function isChildPath(parent: string, key: string) {
  return key !== parent && key.startsWith(parent) && /^\d+[巷弄]$/u.test(key.slice(parent.length))
}

// "527巷" → "527 Ln", "3弄" → "3 Aly".
function englishPath(key: string) {
  return key.replace(/^(\d+)巷$/u, "$1 Ln").replace(/^(\d+)弄$/u, "$1 Aly")
}

function houseName(number: string) {
  const [base, branch] = number.split("-")
  return branch ? `${base}之${branch}號` : `${base}號`
}

const LINK = "underline-offset-4 hover:underline"

/** The address page as HTML in the app's root; the app replaces it once it starts. */
export function addressPageHtml(lookup: AddressLookup, doorplates: RoadDoorplates | null, locale: Locale) {
  const content = addressContent(lookup, doorplates, locale)
  if (!content) return ""
  return pageHtml(content, TEXT[locale])
}

/** A city or district page as HTML, for readers that do not run the app. */
export function placePageHtml(page: PlacePage, locale: Locale) {
  const text = TEXT[locale]
  return pageHtml(
    {
      name: page.name,
      trail: page.trail,
      facts: page.prefixes.length ? [[text.zipcode, page.prefixes.join(" / ")]] : [],
      ranges: [],
      lanes: [],
      houses: page.entries.map((entry) => ({ ...entry, name: `${entry.name} ${entry.zipcode}` })),
    },
    { ...text, houses: page.prefixes.length ? text.roads : text.districts },
  )
}

function pageHtml(
  { name, trail, facts, ranges, lanes, houses }: AddressContent,
  text: (typeof TEXT)[Locale],
) {
  const anchor = ({ name, path }: Link) =>
    `<a class="${LINK}" href="${escapeHtml(path)}">${escapeHtml(name)}</a>`
  const links = (heading: string, items: Link[]) =>
    items.length
      ? [
          `<section class="flex flex-col gap-2"><h2 class="font-medium">${heading}</h2>`,
          '<ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm">',
          ...items.map((item) => `<li>${anchor(item)}</li>`),
          "</ul></section>",
        ].join("")
      : ""

  return [
    '<div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">',
    '<nav aria-label="${text.trail}"><ol class="flex flex-wrap gap-x-2 text-sm text-muted-foreground">',
    ...trail.map((step, index) => `<li>${index ? "› " : ""}${anchor(step)}</li>`),
    "</ol></nav>",
    `<h1 class="text-2xl font-semibold">${escapeHtml(name)}</h1>`,
    '<dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">',
    ...facts.map(
      ([label, value]) =>
        `<dt class="text-muted-foreground">${label}</dt><dd class="break-words">${escapeHtml(value)}</dd>`,
    ),
    "</dl>",
    ranges.length
      ? [
          '<section class="flex flex-col gap-2"><h2 class="font-medium">${text.ranges}</h2>',
          '<ul class="flex flex-col divide-y text-sm">',
          ...ranges.map(
            ([zipcode, rule]) =>
              `<li class="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-2"><span class="text-muted-foreground">${zipcode}</span><span class="break-words">${escapeHtml(rule)}</span></li>`,
          ),
          "</ul></section>",
        ].join("")
      : "",
    links(text.lanes, lanes),
    links(text.houses, houses),
    "</div>",
  ].join("")
}

// Text that Markdown would read as a link, table cell or emphasis.
const escapeMarkdown = (text: string) => text.replace(/[\\[\]|*_`<>]/g, "\\$&")

/** The address page as Markdown, for agents that ask for it. */
export function addressPageMarkdown(lookup: AddressLookup, doorplates: RoadDoorplates | null, locale: Locale) {
  const content = addressContent(lookup, doorplates, locale)
  if (!content) return null
  const text = TEXT[locale]
  const { name, trail, facts, ranges, lanes, houses } = content
  // Readers of Markdown may have no page to resolve a path against, and
  // Chinese left readable takes far fewer tokens than escaped.
  const url = (path: string) =>
    SITE_ORIGIN + path.split("/").map((part) => readable(decodeURIComponent(part))).join("/")
  const anchor = ({ name, path }: Link) => `[${escapeMarkdown(name)}](${url(path)})`
  const links = (heading: string, items: Link[]) =>
    items.length ? [`## ${heading}`, "", items.map(anchor).join(" · "), ""] : []

  return [
    `# ${escapeMarkdown(name)}`,
    "",
    trail.map(anchor).join(" › "),
    "",
    ...facts.map(([label, value]) => `- ${label}${text.separator}${escapeMarkdown(value)}`),
    "",
    ...(ranges.length
      ? [
          `## ${text.ranges}`,
          "",
          `| ${text.zipcode} | ${text.range} |`,
          "| --- | --- |",
          ...ranges.map(([zipcode, rule]) => `| ${zipcode} | ${escapeMarkdown(rule)} |`),
          "",
        ]
      : []),
    ...links(text.lanes, lanes),
    ...links(text.houses, houses),
  ].join("\n")
}

/** A city or district page as Markdown, for agents that ask for it. */
export function placePageMarkdown(page: PlacePage, locale: Locale) {
  const text = TEXT[locale]
  const url = (path: string) =>
    SITE_ORIGIN + path.split("/").map((part) => readable(decodeURIComponent(part))).join("/")
  const anchor = ({ name, path }: { name: string; path: string }) => `[${escapeMarkdown(name)}](${url(path)})`
  return [
    `# ${escapeMarkdown(page.name)}`,
    "",
    page.trail.map(anchor).join(" › "),
    "",
    ...(page.prefixes.length ? [`- ${text.zipcode}${text.separator}${page.prefixes.join(" / ")}`, ""] : []),
    `## ${page.prefixes.length ? text.roads : text.districts}`,
    "",
    `| ${page.prefixes.length ? text.roads : text.districts} | ${text.zipcode} |`,
    "| --- | --- |",
    ...page.entries.map((entry) => `| ${anchor(entry)} | ${entry.zipcode} |`),
    "",
  ].join("\n")
}

import { formatScopeRule, type AddressLookup } from "@/lib/addresses"
import { sharePath } from "@/lib/address-path"
import { addressPage } from "@/lib/page-meta"
import { SITE_ORIGIN } from "@/lib/site"
import { readable } from "@/utils/addressUrls.js"
import { escapeHtml } from "@/utils/pageHead.js"

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
function addressContent(lookup: AddressLookup, doorplates: RoadDoorplates | null): AddressContent | null {
  const page = addressPage(lookup)
  if (!page) return null
  const { name, en, form, trail } = page
  const { road, scopes, resolvedScope, displayedZipcode } = lookup
  const isComplete = displayedZipcode.length === 6

  const facts: AddressContent["facts"] = [
    [
      "郵遞區號",
      isComplete
        ? displayedZipcode
        : displayedZipcode
          ? `前三碼 ${displayedZipcode}，後三碼依門牌而定`
          : "依門牌而定",
    ],
  ]
  if (en) facts.push(["英文地址", en])
  if (isComplete && resolvedScope) facts.push(["規則", formatScopeRule(resolvedScope.scope)])

  // Only a road, lane or alley, typed as nothing more, leads further down.
  const lane = form.ln ? `${form.ln}巷` : ""
  const path = `${lane}${form.aly ? `${form.aly}弄` : ""}`
  const isBranch = !form.no && name === `${road}${path}`
  const link = (label: string, rest: string) => ({ name: label, path: sharePath(`${road}${rest}`) })
  const lanes =
    isBranch && doorplates
      ? Object.keys(doorplates)
          .filter((key) => isChildPath(path, key))
          .sort((a, b) => parseInt(a.slice(path.length)) - parseInt(b.slice(path.length)))
          .map((key) => link(key.slice(path.length), key))
      : []
  const houses =
    isBranch && doorplates?.[path]
      ? doorplates[path].split(",").map((number) => {
          const house = houseName(number)
          return link(house, `${path}${house}`)
        })
      : []

  return {
    name,
    trail,
    facts,
    ranges: isComplete
      ? []
      : scopes.map((scope) => [
          String(scope.zipcode),
          [scope.department, formatScopeRule(scope.scope)].filter(Boolean).join(" "),
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

function houseName(number: string) {
  const [base, branch] = number.split("-")
  return branch ? `${base}之${branch}號` : `${base}號`
}

const LINK = "underline-offset-4 hover:underline"

/** The address page as HTML in the app's root; the app replaces it once it starts. */
export function addressPageHtml(lookup: AddressLookup, doorplates: RoadDoorplates | null) {
  const content = addressContent(lookup, doorplates)
  if (!content) return ""
  const { name, trail, facts, ranges, lanes, houses } = content
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
    '<nav aria-label="導覽路徑"><ol class="flex flex-wrap gap-x-2 text-sm text-muted-foreground">',
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
          '<section class="flex flex-col gap-2"><h2 class="font-medium">郵遞區號範圍</h2>',
          '<ul class="flex flex-col divide-y text-sm">',
          ...ranges.map(
            ([zipcode, rule]) =>
              `<li class="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-2"><span class="text-muted-foreground">${zipcode}</span><span class="break-words">${escapeHtml(rule)}</span></li>`,
          ),
          "</ul></section>",
        ].join("")
      : "",
    links("巷弄", lanes),
    links("門牌", houses),
    "</div>",
  ].join("")
}

// Text that Markdown would read as a link, table cell or emphasis.
const escapeMarkdown = (text: string) => text.replace(/[\\[\]|*_`<>]/g, "\\$&")

/** The address page as Markdown, for agents that ask for it. */
export function addressPageMarkdown(lookup: AddressLookup, doorplates: RoadDoorplates | null) {
  const content = addressContent(lookup, doorplates)
  if (!content) return null
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
    ...facts.map(([label, value]) => `- ${label}：${escapeMarkdown(value)}`),
    "",
    ...(ranges.length
      ? [
          "## 郵遞區號範圍",
          "",
          "| 郵遞區號 | 範圍 |",
          "| --- | --- |",
          ...ranges.map(([zipcode, rule]) => `| ${zipcode} | ${escapeMarkdown(rule)} |`),
          "",
        ]
      : []),
    ...links("巷弄", lanes),
    ...links("門牌", houses),
  ].join("\n")
}

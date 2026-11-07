import { formatScopeRule, type AddressLookup } from "@/lib/addresses"
import { sharePath } from "@/lib/address-path"
import { addressPage } from "@/lib/page-meta"
import { escapeHtml } from "@/utils/pageHead.js"

// A road's lanes and alleys ("" for the road itself, "527巷", "527巷101弄"),
// each with its house numbers ("2,10,51-1"); see utils/doorplates.js.
export type RoadDoorplates = Record<string, string>

const LINK = "underline-offset-4 hover:underline"

/**
 * The address page as plain HTML, for readers that do not run the app: the
 * trail, the zipcode and English address, the post office's ranges, and
 * links down to each lane, alley and house the county lists. The app
 * replaces it once it starts.
 */
export function addressPageContent(lookup: AddressLookup, doorplates: RoadDoorplates | null) {
  const page = addressPage(lookup)
  if (!page) return ""
  const { name, en, form, trail } = page
  const { road, scopes, resolvedScope, displayedZipcode } = lookup
  const isComplete = displayedZipcode.length === 6

  const facts: [string, string][] = [
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
  const lanes =
    isBranch && doorplates
      ? Object.keys(doorplates)
          .filter((key) => isChildPath(path, key))
          .sort((a, b) => parseInt(a.slice(path.length)) - parseInt(b.slice(path.length)))
      : []
  const houses = isBranch && doorplates?.[path] ? doorplates[path].split(",").map(houseName) : []

  return [
    '<div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">',
    '<nav aria-label="導覽路徑"><ol class="flex flex-wrap gap-x-2 text-sm text-muted-foreground">',
    ...trail.map(
      (step, index) =>
        `<li>${index ? "› " : ""}<a class="${LINK}" href="${escapeHtml(step.path)}">${escapeHtml(step.name)}</a></li>`,
    ),
    "</ol></nav>",
    `<h1 class="text-2xl font-semibold">${escapeHtml(name)}</h1>`,
    '<dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">',
    ...facts.map(
      ([label, value]) =>
        `<dt class="text-muted-foreground">${label}</dt><dd class="break-words">${escapeHtml(value)}</dd>`,
    ),
    "</dl>",
    ...(isComplete
      ? []
      : [
          '<section class="flex flex-col gap-2"><h2 class="font-medium">郵遞區號範圍</h2>',
          '<ul class="flex flex-col divide-y text-sm">',
          ...scopes.map(
            (scope) =>
              `<li class="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-2"><span class="text-muted-foreground">${scope.zipcode}</span><span class="break-words">${escapeHtml(
                [scope.department, formatScopeRule(scope.scope)].filter(Boolean).join(" "),
              )}</span></li>`,
          ),
          "</ul></section>",
        ]),
    links("巷弄", road, lanes.map((key) => ({ name: key.slice(path.length), rest: key }))),
    links("門牌", road, houses.map((house) => ({ name: house, rest: `${path}${house}` }))),
    "</div>",
  ].join("")
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

function links(heading: string, road: string, items: { name: string; rest: string }[]) {
  if (!items.length) return ""
  return [
    `<section class="flex flex-col gap-2"><h2 class="font-medium">${heading}</h2>`,
    '<ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm">',
    ...items.map(
      ({ name, rest }) =>
        `<li><a class="${LINK}" href="${escapeHtml(sharePath(`${road}${rest}`))}">${escapeHtml(name)}</a></li>`,
    ),
    "</ul></section>",
  ].join("")
}

import {
  addressIndex,
  formatAddress,
  lookupRoad,
  zipcodeData,
  type AddressLookup,
} from "@/lib/addresses"
import { addressSlug, parseAddressSlug, placeOfPath, placePath, sharePath, slugOfSharePath } from "@/lib/address-path"
import { HTML_LANG, localePath, type Locale } from "@/lib/locale"
import { SITE_ORIGIN, SITE_TITLE, fixedPageMeta, pageTitle, websiteData, type PageMeta } from "@/lib/site"

export type Link = { name: string; path: string }

/** A city or district in one language: "新竹市東區", "East Dist., Hsinchu City". */
export function placeName(locale: Locale, city: string, area: string | null) {
  if (locale === "zh") return `${city}${area ?? ""}`
  const cityEn = zipcodeData[city].en
  return area ? `${zipcodeData[city].areas[area].en}, ${cityEn}` : cityEn
}

/** The trail from the site down to a city and then a district. */
function placeTrail(locale: Locale, city: string, area: string | null): Link[] {
  const trail = [
    { name: SITE_TITLE[locale], path: localePath(locale, "/") },
    { name: locale === "zh" ? city : zipcodeData[city].en, path: localePath(locale, placePath(city)) },
  ]
  if (area) {
    trail.push({
      name: locale === "zh" ? area : zipcodeData[city].areas[area].en,
      path: localePath(locale, placePath(city, area)),
    })
  }
  return trail
}

const prefixOf = (zipcode: number) => String(zipcode).padStart(6, "0").slice(0, 3)

// The first three digits every road of a district starts with, most common first.
function districtPrefixes(city: string, area: string) {
  const counts = new Map<string, number>()
  for (const road of Object.values(zipcodeData[city].areas[area].roads)) {
    for (const { zipcode } of road.scopes) {
      const prefix = prefixOf(zipcode)
      counts.set(prefix, (counts.get(prefix) ?? 0) + 1)
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1]).map(([prefix]) => prefix)
}

export type PlaceEntry = Link & { zipcode: string }

export type PlacePage = {
  meta: PageMeta
  name: string
  trail: Link[]
  // The district's own first three digits; a city lists each district's.
  prefixes: string[]
  entries: PlaceEntry[]
}

/**
 * A city's page lists its districts, and a district's its roads, each with
 * the zipcode it starts with or, for a road with one code, the code itself.
 */
export function placePage(locale: Locale, city: string, area: string | null): PlacePage {
  const name = placeName(locale, city, area)
  const path = localePath(locale, placePath(city, area))
  const trail = placeTrail(locale, city, area)
  const { areas } = zipcodeData[city]

  if (!area) {
    const entries = Object.keys(areas).map((district) => ({
      name: locale === "zh" ? district : areas[district].en,
      path: localePath(locale, placePath(city, district)),
      zipcode: districtPrefixes(city, district)[0] ?? "",
    }))
    const list = entries.map((entry) => `${entry.name} ${entry.zipcode}`).join(locale === "zh" ? "、" : ", ")
    return {
      name,
      trail,
      prefixes: [],
      entries,
      meta: {
        path,
        title: pageTitle(locale, locale === "zh" ? `${name}郵遞區號` : `${name} Zip Codes`),
        description:
          locale === "zh"
            ? `${name}各行政區的郵遞區號：${list}。點選行政區查看每條道路的 3+3 郵遞區號。`
            : `Zip codes of every district in ${name}, Taiwan: ${list}. Pick a district for each road's 3+3 zip code.`,
      },
    }
  }

  const prefixes = districtPrefixes(city, area)
  const entries = Object.entries(areas[area].roads).map(([road, { en, scopes }]) => {
    const codes = [...new Set(scopes.map((scope) => String(scope.zipcode).padStart(6, "0")))]
    const roadPrefixes = [...new Set(codes.map((code) => code.slice(0, 3)))]
    return {
      name: locale === "zh" ? road : en,
      path: localePath(locale, sharePath(`${city}${area}${road}`)),
      zipcode: codes.length === 1 ? codes[0] : roadPrefixes.join(" / "),
    }
  })
  const zipcode = prefixes.join(" / ")
  return {
    name,
    trail,
    prefixes,
    entries,
    meta: {
      path,
      title: pageTitle(locale, locale === "zh" ? `${name}郵遞區號 ${zipcode}` : `${name} Zip Code ${zipcode}`),
      description:
        locale === "zh"
          ? `${name}的郵遞區號前三碼是 ${zipcode}，共 ${entries.length} 條道路。點選道路，輸入門牌即可查出完整的 3+3 郵遞區號與英文地址。`
          : `The zip code of ${name}, Taiwan is ${zipcode}. Each of its ${entries.length} roads has its own 3+3 zip code; pick a road and enter the house number for the full code and the address in English.`,
    },
  }
}

/** The city or district a path inside the app names, or null. */
export function placeForPath(pathname: string) {
  return placeOfPath(pathname) as { city: string; area: string | null } | null
}

// The address in English without the country, for titles.
const englishName = (en: string) => en.replace(/, Taiwan \(R\.O\.C\.\)$/, "")

export function addressMeta(lookup: AddressLookup, locale: Locale): PageMeta {
  const { road, addressSuffix, scopes, displayedZipcode } = lookup
  if (!road) return fixedPageMeta("home", locale)
  const suffix = addressSuffix.trim()
  const { zh, en } = formatAddress(road, suffix, "")
  const address = suffix ? zh : road
  const slug = addressSlug(road, suffix)
  const path = localePath(locale, slug ? sharePath(slug) : "/")
  const isComplete = displayedZipcode.length === 6
  const zipcodeCount = new Set(scopes.map((scope) => scope.zipcode)).size

  if (locale === "en") {
    const name = englishName(en)
    const fullEnglish = formatAddress(road, suffix, displayedZipcode).en
    if (isComplete) {
      return {
        title: pageTitle(locale, `${name} Zip Code ${displayedZipcode}`),
        description: `The 3+3 zip code of ${name} is ${displayedZipcode}. Full address in English: ${fullEnglish}. In Chinese: ${address}.`,
        path,
      }
    }
    const prefix = displayedZipcode ? `, all starting with ${displayedZipcode}` : ""
    return {
      title: pageTitle(locale, `${name} Zip Code`),
      description: `${name} has ${zipcodeCount} 3+3 zip codes depending on the house number${prefix}. Enter the house number for the full code. In Chinese: ${address}.`,
      path,
    }
  }

  const english = en ? `英文地址：${formatAddress(road, suffix, displayedZipcode).en}` : ""
  if (isComplete) {
    return {
      title: pageTitle(locale, `${address} - 郵遞區號 ${displayedZipcode}`),
      description: `${address}的 3+3 郵遞區號是 ${displayedZipcode}。${english}`,
      path,
    }
  }
  const prefix = displayedZipcode ? `，前三碼為 ${displayedZipcode}` : ""
  return {
    title: pageTitle(locale, `${address} - 郵遞區號`),
    description: `${address}依門牌共有 ${zipcodeCount} 個 3+3 郵遞區號${prefix}，輸入門牌即可查出完整郵遞區號。${english}`,
    path,
  }
}

// What an address page names: the address in full, its place, and the trail
// from the city and district down through the road, each lane and alley,
// every step a page of its own.
export function addressPage(lookup: AddressLookup, locale: Locale) {
  const { road, addressSuffix, displayedZipcode } = lookup
  const place = addressIndex.placeByAddress[road]
  if (!place) return null
  const meta = addressMeta(lookup, locale)
  const suffix = addressSuffix.trim()
  const { zh, en, enFields, form } = formatAddress(road, suffix, displayedZipcode)
  const name = suffix ? zh : road
  const roadEn = addressIndex.englishByAddress[road].road
  const isEnglish = locale === "en"

  const trail = [
    ...placeTrail(locale, place.city, place.area),
    { name: isEnglish ? roadEn : place.road, path: localePath(locale, sharePath(road)) },
  ]
  let parent = road
  const lane = form.ln ? `${form.ln}巷` : ""
  const steps = [
    { rest: lane, en: `${form.ln} Ln` },
    { rest: form.aly ? `${lane}${form.aly}弄` : "", en: `${form.aly} Aly` },
  ]
  for (const step of steps) {
    const address = `${road}${step.rest}`
    if (!step.rest || !name.startsWith(address) || name === address) continue
    trail.push({
      name: isEnglish ? step.en : address.slice(parent.length),
      path: localePath(locale, sharePath(address)),
    })
    parent = address
  }
  if (suffix) {
    const house = form.no ? `No. ${form.no}${form.noDash ? `-${form.noDash}` : ""}` : ""
    const englishStep = [enFields?.line2, house].filter(Boolean).join(", ")
    trail.push({
      name: isEnglish && englishStep ? englishStep : name.slice(parent.length) || suffix,
      path: meta.path,
    })
  }

  return { meta, place, name, en, enFields, form, trail }
}

// What search engines read about an address page: the page, the place it
// names with its postal address, and its trail.
export function addressStructuredData(lookup: AddressLookup, locale: Locale, image?: string) {
  const page = addressPage(lookup, locale)
  if (!page) return undefined
  const { meta, place, name, en, enFields, trail } = page
  const { displayedZipcode } = lookup
  const url = `${SITE_ORIGIN}${meta.path}`
  const district = `${place.city}${place.area}`
  const website = websiteData(locale)
  const isEnglish = locale === "en" && enFields

  return {
    "@context": "https://schema.org",
    "@graph": [
      website,
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: meta.title,
        description: meta.description,
        inLanguage: HTML_LANG[locale],
        isPartOf: { "@id": website["@id"] },
        about: { "@id": `${url}#place` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        ...(image && { primaryImageOfPage: { "@type": "ImageObject", url: image } }),
      },
      {
        "@type": "Place",
        "@id": `${url}#place`,
        name: isEnglish ? englishName(en) : name,
        ...(isEnglish ? { alternateName: name } : en && { alternateName: en }),
        address: {
          "@type": "PostalAddress",
          addressCountry: "TW",
          addressRegion: isEnglish ? enFields.city : place.city,
          addressLocality: isEnglish ? enFields.district : place.area,
          streetAddress: isEnglish
            ? [enFields.line2, enFields.line1].filter(Boolean).join(", ")
            : name.slice(district.length),
          ...(displayedZipcode && { postalCode: displayedZipcode }),
        },
      },
      breadcrumbData(url, trail),
    ],
  }
}

function breadcrumbData(url: string, trail: Link[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: `${SITE_ORIGIN}${step.path}`,
    })),
  }
}

/** A city or district page as structured data: the page, its place and trail. */
export function placeStructuredData(page: PlacePage, locale: Locale) {
  const url = `${SITE_ORIGIN}${page.meta.path}`
  const website = websiteData(locale)
  return {
    "@context": "https://schema.org",
    "@graph": [
      website,
      {
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: page.meta.title,
        description: page.meta.description,
        inLanguage: HTML_LANG[locale],
        isPartOf: { "@id": website["@id"] },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      breadcrumbData(url, page.trail),
    ],
  }
}

// The Worker serves only address pages (see wrangler.jsonc); null means no
// address lives at this path inside the app.
export function lookupForPath(pathname: string): AddressLookup | null {
  const slug = slugOfSharePath(pathname)
  const address = slug && parseAddressSlug(slug)
  // The path names the road exactly, so no search through every road.
  return address ? lookupRoad(address.road, address.suffix) : null
}

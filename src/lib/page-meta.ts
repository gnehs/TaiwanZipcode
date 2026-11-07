import {
  addressIndex,
  formatAddress,
  lookupRoad,
  type AddressLookup,
} from "@/lib/addresses"
import { addressSlug, parseAddressSlug, sharePath, slugOfSharePath } from "@/lib/address-path"
import { HOME_META, SITE_ORIGIN, SITE_TITLE, WEBSITE_DATA, type PageMeta } from "@/lib/site"

export function addressMeta(lookup: AddressLookup): PageMeta {
  const { road, addressSuffix, scopes, displayedZipcode } = lookup
  if (!road) return HOME_META
  const suffix = addressSuffix.trim()
  const { zh, en } = formatAddress(road, suffix, displayedZipcode)
  const address = suffix ? zh : road
  const slug = addressSlug(road, suffix)
  const path = slug ? sharePath(slug) : "/"
  const english = en ? `英文地址：${en}` : ""

  if (displayedZipcode.length === 6) {
    return {
      title: `${address} 郵遞區號 ${displayedZipcode}｜${SITE_TITLE}`,
      description: `${address}的 3+3 郵遞區號是 ${displayedZipcode}。${english}`,
      path,
    }
  }
  const zipcodeCount = new Set(scopes.map((scope) => scope.zipcode)).size
  const prefix = displayedZipcode ? `，前三碼為 ${displayedZipcode}` : ""
  return {
    title: `${address} 郵遞區號｜${SITE_TITLE}`,
    description: `${address}依門牌共有 ${zipcodeCount} 個 3+3 郵遞區號${prefix}，輸入門牌即可查出完整郵遞區號。${english}`,
    path,
  }
}

// What an address page names: the address in full, its place, and the trail
// from the road down through each lane and alley, every step a page of its own.
export function addressPage(lookup: AddressLookup) {
  const { road, addressSuffix, displayedZipcode } = lookup
  const place = addressIndex.placeByAddress[road]
  if (!place) return null
  const meta = addressMeta(lookup)
  const suffix = addressSuffix.trim()
  const { zh, en, form } = formatAddress(road, suffix, displayedZipcode)
  const name = suffix ? zh : road

  const trail = [
    { name: SITE_TITLE, path: "/" },
    { name: `${place.area}${place.road}`, path: sharePath(road) },
  ]
  let parent = road
  const lane = form.ln ? `${form.ln}巷` : ""
  for (const rest of [lane, form.aly ? `${lane}${form.aly}弄` : ""]) {
    const address = `${road}${rest}`
    if (!rest || !name.startsWith(address) || name === address) continue
    trail.push({ name: address.slice(parent.length), path: sharePath(address) })
    parent = address
  }
  if (suffix) trail.push({ name: name.slice(parent.length) || suffix, path: meta.path })

  return { meta, place, name, en, form, trail }
}

// What search engines read about an address page: the page, the place it
// names with its postal address, and its trail.
export function addressStructuredData(lookup: AddressLookup, image?: string) {
  const page = addressPage(lookup)
  if (!page) return undefined
  const { meta, place, name, en, trail } = page
  const { displayedZipcode } = lookup
  const url = `${SITE_ORIGIN}${meta.path}`
  const district = `${place.city}${place.area}`

  return {
    "@context": "https://schema.org",
    "@graph": [
      WEBSITE_DATA,
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: meta.title,
        description: meta.description,
        inLanguage: "zh-TW",
        isPartOf: { "@id": WEBSITE_DATA["@id"] },
        about: { "@id": `${url}#place` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        ...(image && { primaryImageOfPage: { "@type": "ImageObject", url: image } }),
      },
      {
        "@type": "Place",
        "@id": `${url}#place`,
        name,
        ...(en && { alternateName: en }),
        address: {
          "@type": "PostalAddress",
          addressCountry: "TW",
          addressRegion: place.city,
          addressLocality: place.area,
          streetAddress: name.slice(district.length),
          ...(displayedZipcode && { postalCode: displayedZipcode }),
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: trail.map((step, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: step.name,
          item: `${SITE_ORIGIN}${step.path}`,
        })),
      },
    ],
  }
}

// The Worker serves only address pages (see wrangler.jsonc); null means no
// address lives at this path.
export function lookupForPath(pathname: string): AddressLookup | null {
  const slug = slugOfSharePath(pathname)
  const address = slug && parseAddressSlug(slug)
  // The path names the road exactly, so no search through every road.
  return address ? lookupRoad(address.road, address.suffix) : null
}

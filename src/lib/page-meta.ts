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

// What search engines read about an address page: the page, the place it
// names with its postal address, and the trail from the road down through
// each lane and alley, every step a page of its own.
export function addressStructuredData(lookup: AddressLookup, image?: string) {
  const { road, addressSuffix, displayedZipcode } = lookup
  const place = addressIndex.placeByAddress[road]
  if (!place) return undefined
  const meta = addressMeta(lookup)
  const url = `${SITE_ORIGIN}${meta.path}`
  const suffix = addressSuffix.trim()
  const { zh, en, form } = formatAddress(road, suffix, displayedZipcode)
  const name = suffix ? zh : road
  const district = `${place.city}${place.area}`

  const steps = [
    { name: SITE_TITLE, url: `${SITE_ORIGIN}/` },
    { name: `${place.area}${place.road}`, url: `${SITE_ORIGIN}${sharePath(road)}` },
  ]
  let parent = road
  const lane = form.ln ? `${form.ln}巷` : ""
  for (const rest of [lane, form.aly ? `${lane}${form.aly}弄` : ""]) {
    const address = `${road}${rest}`
    if (!rest || !name.startsWith(address) || name === address) continue
    steps.push({ name: address.slice(parent.length), url: `${SITE_ORIGIN}${sharePath(address)}` })
    parent = address
  }
  if (suffix) steps.push({ name: name.slice(parent.length) || suffix, url })

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
        itemListElement: steps.map((step, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: step.name,
          item: step.url,
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

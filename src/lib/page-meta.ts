import {
  formatAddress,
  lookupRoad,
  type AddressLookup,
} from "@/lib/addresses"
import { addressParams, addressPath, queryFromParams } from "@/lib/address-path"
import { HOME_META, SITE_TITLE, type PageMeta } from "@/lib/site"

export function addressMeta(lookup: AddressLookup): PageMeta {
  const { road, addressSuffix, scopes, displayedZipcode } = lookup
  if (!road) return HOME_META
  const suffix = addressSuffix.trim()
  const { zh, en } = formatAddress(road, suffix, displayedZipcode)
  const address = suffix ? zh : road
  const params = addressParams(road, suffix)
  const path = params ? addressPath(params) : "/"
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

// The Worker serves only address pages (see wrangler.jsonc); null means no
// address lives at this path.
export function metaForPath(pathname: string): PageMeta | null {
  const segments = pathname.split("/").slice(1)
  if (segments.length < 3 || segments.length > 4) return null
  let params
  try {
    const [city, area, road, suffix = ""] = segments.map(decodeURIComponent)
    params = { city, area, road, suffix }
  } catch {
    return null
  }
  // The path names the road exactly, so no search through every road.
  return queryFromParams(params)
    ? addressMeta(lookupRoad(`${params.city}${params.area}${params.road}`, params.suffix))
    : null
}

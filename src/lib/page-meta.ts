import {
  formatAddress,
  lookupRoad,
  type AddressLookup,
} from "@/lib/addresses"
import { addressPath, addressSlug, parseAddressSlug } from "@/lib/address-path"
import { HOME_META, SITE_TITLE, type PageMeta } from "@/lib/site"

export function addressMeta(lookup: AddressLookup): PageMeta {
  const { road, addressSuffix, scopes, displayedZipcode } = lookup
  if (!road) return HOME_META
  const suffix = addressSuffix.trim()
  const { zh, en } = formatAddress(road, suffix, displayedZipcode)
  const address = suffix ? zh : road
  const slug = addressSlug(road, suffix)
  const path = slug ? addressPath(slug) : "/"
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
export function lookupForPath(pathname: string): AddressLookup | null {
  const [, prefix, slug, ...rest] = pathname.split("/")
  if (prefix !== "a" || !slug || rest.length) return null
  let address
  try {
    address = parseAddressSlug(decodeURIComponent(slug))
  } catch {
    return null
  }
  // The path names the road exactly, so no search through every road.
  return address ? lookupRoad(address.road, address.suffix) : null
}

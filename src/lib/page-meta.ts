import {
  formatAddress,
  lookupRoad,
  type AddressLookup,
} from "@/lib/addresses"
import { addressParams, addressPath, queryFromParams } from "@/lib/address-path"
import { SITE_TITLE } from "@/lib/site"
const SITE_DESCRIPTION = "即時、快速、無需驗證碼之郵遞區號線上查詢工具。"

export type PageMeta = {
  title: string
  description: string
  path: string
}

export const HOME_META: PageMeta = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
}

export const BATCH_META: PageMeta = {
  title: `批次查詢｜${SITE_TITLE}`,
  description: "一次貼上多筆地址，查出每筆的 3+3 郵遞區號與英文地址。",
  path: "/batch",
}

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

// null means no page lives at this path.
export function metaForPath(pathname: string): PageMeta | null {
  if (pathname === "/") return HOME_META
  if (pathname === "/batch") return BATCH_META
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

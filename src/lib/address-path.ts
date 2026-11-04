import { addressIndex } from "@/lib/addresses"

// Each road is a path of its own, /臺北市/信義區/信義路五段, with the house
// number as an optional last segment.
export type AddressParams = {
  city: string
  area: string
  road: string
  suffix?: string
}

const placeByAddress = new Map(
  addressIndex.places.map((place) => [
    `${place.city}${place.area}${place.road}`,
    place,
  ]),
)

export function addressParams(
  road: string,
  suffix: string,
): AddressParams | null {
  const place = placeByAddress.get(road)
  if (!place) return null
  return { ...place, suffix: suffix.trim() || undefined }
}

// The same encoding the router uses for path params.
export function addressPath({ city, area, road, suffix }: AddressParams) {
  const parts = suffix ? [city, area, road, suffix] : [city, area, road]
  return `/${parts.map(encodeURIComponent).join("/")}`
}

export function queryFromParams(params: Partial<AddressParams>): string {
  const road = `${params.city ?? ""}${params.area ?? ""}${params.road ?? ""}`
  return placeByAddress.has(road) ? `${road}${params.suffix ?? ""}` : ""
}

// Links shared before the router kept the address in the hash, either as
// #z=…&a=…&s=… or as the older #zipcode_address_suffix.
export function readLegacyHash(hash: string): AddressParams | null {
  const rawHash = hash.replace(/^#/, "")
  try {
    if (rawHash.startsWith("z=")) {
      const params = new URLSearchParams(rawHash)
      return addressParams(params.get("a") || "", params.get("s") || "")
    }
    const [, address = "", ...suffix] = decodeURIComponent(rawHash).split("_")
    return addressParams(address, suffix.join("_"))
  } catch {
    return null
  }
}

import { addressIndex } from "@/lib/addresses"

// Each address is one path segment under /a/, /a/臺北市信義區信義路五段7號:
// the road as the database names it, then the house number as typed.
const roads = new Set(
  addressIndex.places.map((place) => `${place.city}${place.area}${place.road}`),
)

export function addressSlug(road: string, suffix: string): string | null {
  return roads.has(road) ? `${road}${suffix.trim()}` : null
}

// The same encoding the router uses for path params.
export function addressPath(slug: string) {
  return `/a/${encodeURIComponent(slug)}`
}

// Some roads begin with another road's name, so the longest one is the road.
export function parseAddressSlug(
  slug: string,
): { road: string; suffix: string } | null {
  for (let end = slug.length; end > 0; end--) {
    const road = slug.slice(0, end)
    if (roads.has(road)) return { road, suffix: slug.slice(end) }
  }
  return null
}

// Links shared before the router kept the address in the hash, either as
// #z=…&a=…&s=… or as the older #zipcode_address_suffix.
export function readLegacyHash(hash: string): string | null {
  const rawHash = hash.replace(/^#/, "")
  try {
    if (rawHash.startsWith("z=")) {
      const params = new URLSearchParams(rawHash)
      return addressSlug(params.get("a") || "", params.get("s") || "")
    }
    const [, address = "", ...suffix] = decodeURIComponent(rawHash).split("_")
    return addressSlug(address, suffix.join("_"))
  } catch {
    return null
  }
}

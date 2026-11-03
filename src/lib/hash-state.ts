import { addressIndex } from "@/lib/addresses"

export function readHashQuery(hash = window.location.hash): string {
  const rawHash = hash.replace(/^#/, "")
  let address = ""
  let addressSuffix = ""

  try {
    if (rawHash.startsWith("z=")) {
      const params = new URLSearchParams(rawHash)
      address = params.get("a") || ""
      addressSuffix = params.get("s") || ""
    } else {
      const [, legacyAddress = "", ...legacySuffix] =
        decodeURIComponent(rawHash).split("_")
      address = legacyAddress
      addressSuffix = legacySuffix.join("_")
    }
  } catch {
    return ""
  }

  return addressIndex.scopesByAddress[address] ? `${address}${addressSuffix}` : ""
}

export function writeHashState(
  address: string,
  addressSuffix: string,
  zipcode?: number,
) {
  const params = new URLSearchParams()
  params.set("z", String(zipcode || ""))
  params.set("a", address)
  params.set("s", addressSuffix)
  const hash = address ? `#${params.toString()}` : ""
  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`
  window.history.replaceState(null, "", nextUrl)
}

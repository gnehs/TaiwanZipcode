import { addressIndex, type ZipcodeScope } from "@/lib/addresses"

export type HashState = {
  address: string
  addressSuffix: string
  isDetailOpen: boolean
  manuallySelectedScope: ZipcodeScope | null
}

export function readHashState(hash = window.location.hash): HashState {
  const rawHash = hash.replace(/^#/, "")
  let zipcodeText = ""
  let address = ""
  let addressSuffix = ""

  try {
    if (rawHash.startsWith("z=")) {
      const params = new URLSearchParams(rawHash)
      zipcodeText = params.get("z") || ""
      address = params.get("a") || ""
      addressSuffix = params.get("s") || ""
    } else {
      const [legacyZipcode = "", legacyAddress = "", ...legacySuffix] =
        decodeURIComponent(rawHash).split("_")
      zipcodeText = legacyZipcode
      address = legacyAddress
      addressSuffix = legacySuffix.join("_")
    }
  } catch {
    return {
      address: "",
      addressSuffix: "",
      isDetailOpen: false,
      manuallySelectedScope: null,
    }
  }

  const zipcode = Number.parseInt(zipcodeText, 10)
  const scopes = addressIndex.scopesByAddress[address] || []

  return {
    address,
    addressSuffix,
    isDetailOpen: Boolean(address && scopes.length),
    manuallySelectedScope:
      scopes.find((scope) => scope.zipcode === zipcode) || null,
  }
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

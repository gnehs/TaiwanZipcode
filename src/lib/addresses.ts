import zipcodeData from "@/assets/zipcode.json"
import {
  cleanAddressSuffix,
  cleanAddressText,
} from "@/utils/addressCleanup.js"
import { hasUnconvertedAddressParts } from "@/utils/addressConversion.js"
import {
  findLongestAddressPrefix,
  searchAddressList,
} from "@/utils/addressSearch.js"
import {
  getZipcodeScopeMatchBasis,
  parseAddressSuffix,
  resolveZipcodeScopes,
} from "@/utils/zipcodeScopeMatcher.js"

export type ZipcodeScope = {
  zipcode: number
  scope: string
  department?: string
}

type Road = {
  en: string
  scopes: ZipcodeScope[]
}

type Area = {
  en: string
  roads: Record<string, Road>
}

type City = {
  en: string
  areas: Record<string, Area>
}

type ZipcodeDatabase = Record<string, City>

type EnglishPlace = {
  road: string
  district: string
  city: string
}

export type AddressIndex = {
  addresses: string[]
  scopesByAddress: Record<string, ZipcodeScope[]>
  englishByAddress: Record<string, EnglishPlace>
  areas: Set<string>
}

// The fields most address forms ask for, so each can be pasted on its own.
export type EnglishAddressFields = {
  line1: string
  line2: string
  district: string
  city: string
  zipcode: string
  country: string
}

export type ParsedAddress = {
  zh: string
  en: string
  enFields: EnglishAddressFields | null
  form: {
    ln: number | null
    aly: number | null
    no: number | null
    noDash: number | null
    floor: number | null
    floorDash: number | null
    basement: boolean
    room: string | null
  }
  warns: string[]
}

function buildAddressIndex(database: ZipcodeDatabase): AddressIndex {
  const scopesByAddress: Record<string, ZipcodeScope[]> = {}
  const englishByAddress: Record<string, EnglishPlace> = {}
  const areas = new Set<string>()

  for (const [cityName, city] of Object.entries(database)) {
    for (const [areaName, area] of Object.entries(city.areas)) {
      areas.add(`${cityName}${areaName}`)
      for (const [roadName, road] of Object.entries(area.roads)) {
        const address = `${cityName}${areaName}${roadName}`
        scopesByAddress[address] = road.scopes
        englishByAddress[address] = {
          road: road.en,
          district: area.en,
          city: city.en,
        }
      }
    }
  }

  return {
    addresses: Object.keys(scopesByAddress),
    scopesByAddress,
    englishByAddress,
    areas,
  }
}

export const addressIndex = buildAddressIndex(
  zipcodeData as unknown as ZipcodeDatabase,
)

export const ADDRESS_SEARCH_LIMIT = 30

export function searchAddresses(query: string, limit = ADDRESS_SEARCH_LIMIT) {
  return searchAddressList(query, addressIndex.addresses, limit)
}

export function findAddressPrefix(
  query: string,
): { address: string; suffix: string } | null {
  return findLongestAddressPrefix(query, addressIndex.addresses)
}

export type ScopeResolution = {
  status: "empty" | "incomplete" | "unmatched" | "ambiguous" | "matched"
  matches: ZipcodeScope[]
  pending?: ZipcodeScope[]
}

export type AddressLookup = {
  road: string
  addressSuffix: string
  scopes: ZipcodeScope[]
  scopeResolution: ScopeResolution
  resolvedScope: ZipcodeScope | null
  baseZipcodePrefixes: string[]
  displayedZipcode: string
  matchedRuleBasis: string
}

const EMPTY_SCOPES: ZipcodeScope[] = []

// The single input is the source of truth; the road and house number are
// read from it on every keystroke.
export function lookupAddress(query: string): AddressLookup {
  const prefix = findAddressPrefix(query)
  const road = prefix?.address ?? ""
  const addressSuffix = prefix?.suffix ?? ""
  const scopes = addressIndex.scopesByAddress[road] || EMPTY_SCOPES
  const scopeResolution: ScopeResolution = !road
    ? { status: "empty", matches: [], pending: [] }
    : (resolveZipcodeScopes(scopes, addressSuffix) as ScopeResolution)
  // A road with a single rule has only one zipcode, so it needs no house
  // number unless the one given falls outside that rule.
  const resolvedScope =
    scopeResolution.status === "matched"
      ? scopeResolution.matches[0] || null
      : scopes.length === 1 && scopeResolution.status !== "unmatched"
        ? scopes[0]
        : null
  const baseZipcodePrefixes = [
    ...new Set(
      scopes
        .map((scope) => String(scope.zipcode || "").slice(0, 3))
        .filter(Boolean),
    ),
  ]
  const displayedZipcode = resolvedScope?.zipcode
    ? String(resolvedScope.zipcode)
    : addressSuffix.trim()
      ? ""
      : baseZipcodePrefixes.length === 1
        ? baseZipcodePrefixes[0]
        : ""
  const matchedRuleBasis =
    resolvedScope && addressSuffix.trim()
      ? getZipcodeScopeMatchBasis(resolvedScope, addressSuffix)?.text || ""
      : ""

  return {
    road,
    addressSuffix,
    scopes,
    scopeResolution,
    resolvedScope,
    baseZipcodePrefixes,
    displayedZipcode,
    matchedRuleBasis,
  }
}

const hasArea = (name: string) => addressIndex.areas.has(name)

// Typed or pasted text often uses spellings the database does not: rewrite
// those first, then tidy the house number once the road is known.
export function lookupCleanedAddress(text: string): AddressLookup {
  const lookup = lookupAddress(cleanAddressText(text, hasArea))
  if (!lookup.road) return lookup
  const suffix = cleanAddressSuffix(lookup.addressSuffix)
  return suffix === lookup.addressSuffix
    ? lookup
    : lookupAddress(`${lookup.road}${suffix}`)
}

export function formatScopeRule(scope: string) {
  return String(scope || "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim()
}

export function formatAddress(
  baseAddress: string,
  addressSuffix: string,
  zipcode = "",
): ParsedAddress {
  const emptyForm: ParsedAddress["form"] = {
    ln: null,
    aly: null,
    no: null,
    noDash: null,
    floor: null,
    floorDash: null,
    basement: false,
    room: null,
  }
  const place = addressIndex.englishByAddress[baseAddress]

  if (!baseAddress || !place) {
    return { en: "", zh: "", enFields: null, form: emptyForm, warns: [] }
  }

  const warns: string[] = []
  if (/[一二三四五六七八九十]/u.test(addressSuffix)) {
    warns.push("請不要輸入中文數字")
  }
  if (/衖/u.test(addressSuffix)) {
    warns.push("不支援「衖」三分支編址")
  }
  if (/(.+?)巷/u.test(addressSuffix) && !/(\d+)巷/u.test(addressSuffix)) {
    warns.push("不支援在此介面輸入中文巷弄名稱")
  }

  const parsed = parseAddressSuffix(addressSuffix)
  const room =
    addressSuffix.normalize("NFKC").match(/([\dA-Za-z]+)室/u)?.[1] || null
  const form: ParsedAddress["form"] = {
    ln: parsed.ln,
    aly: parsed.aly,
    no: parsed.no,
    noDash: parsed.noDash,
    floor: parsed.floor,
    floorDash: parsed.floorDash,
    basement: parsed.basement,
    room,
  }

  let zh = baseAddress
  // English runs from the smallest unit up: "No. 10, 25 Ln, Xinyi Rd.".
  const streetParts: string[] = [place.road]
  const unitParts: string[] = []

  if (form.ln) {
    zh += `${form.ln}巷`
    streetParts.unshift(`${form.ln} Ln`)
  }
  if (form.aly) {
    zh += `${form.aly}弄`
    streetParts.unshift(`${form.aly} Aly`)
  }
  if (form.no) {
    zh += `${form.no}號`
    if (form.noDash) {
      zh += `之${form.noDash}`
      streetParts.unshift(`No. ${form.no}-${form.noDash}`)
    } else {
      streetParts.unshift(`No. ${form.no}`)
    }
  }
  if (form.floor) {
    zh += `${form.basement ? "地下" : ""}${form.floor}樓`
    if (form.floorDash) {
      zh += `之${form.floorDash}`
      unitParts.unshift(
        `${form.basement ? "B" : ""}${form.floor}F-${form.floorDash}`,
      )
    } else {
      unitParts.unshift(`${form.basement ? "B" : ""}${form.floor}F`)
    }
  }
  if (form.room) {
    zh += `${form.room}室`
    unitParts.unshift(`${form.room} Room`)
  }

  if (hasUnconvertedAddressParts(addressSuffix, zh.slice(baseAddress.length))) {
    warns.push("部分門牌內容未能轉換成英文")
  }

  const enFields: EnglishAddressFields = {
    line1: streetParts.join(", "),
    line2: unitParts.join(", "),
    district: place.district,
    city: place.city,
    zipcode,
    country: "Taiwan (R.O.C.)",
  }
  // Postal format places the zipcode after the city: "Taipei City 104001".
  const en = [
    enFields.line2,
    enFields.line1,
    enFields.district,
    zipcode ? `${place.city} ${zipcode}` : place.city,
    enFields.country,
  ]
    .filter(Boolean)
    .join(", ")

  return { zh, en, enFields, form, warns }
}

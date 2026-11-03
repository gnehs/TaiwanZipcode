import zipcodeData from "@/assets/zipcode.json"
import { hasUnconvertedAddressParts } from "@/utils/addressConversion.js"
import { searchAddressList } from "@/utils/addressSearch.js"
import { parseAddressSuffix } from "@/utils/zipcodeScopeMatcher.js"

export { normalizeSearchText } from "@/utils/addressSearch.js"

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

export type AddressIndex = {
  addresses: string[]
  scopesByAddress: Record<string, ZipcodeScope[]>
  englishByAddress: Record<string, string>
}

export type ParsedAddress = {
  zh: string
  en: string
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
  const englishByAddress: Record<string, string> = {}

  for (const [cityName, city] of Object.entries(database)) {
    for (const [areaName, area] of Object.entries(city.areas)) {
      for (const [roadName, road] of Object.entries(area.roads)) {
        const address = `${cityName}${areaName}${roadName}`
        scopesByAddress[address] = road.scopes
        englishByAddress[address] = [
          road.en,
          area.en,
          city.en,
          "Taiwan (R.O.C.)",
        ].join(", ")
      }
    }
  }

  return {
    addresses: Object.keys(scopesByAddress),
    scopesByAddress,
    englishByAddress,
  }
}

export const addressIndex = buildAddressIndex(
  zipcodeData as unknown as ZipcodeDatabase,
)

export const ADDRESS_SEARCH_LIMIT = 30

export function searchAddresses(query: string, limit = ADDRESS_SEARCH_LIMIT) {
  return searchAddressList(query, addressIndex.addresses, limit)
}

export function filterAddresses(query: string, limit = ADDRESS_SEARCH_LIMIT) {
  return searchAddresses(query, limit).matches
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
  const englishBase = addressIndex.englishByAddress[baseAddress]

  if (!baseAddress || !englishBase) {
    return { en: "", zh: "", form: emptyForm, warns: [] }
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
  const englishParts = englishBase.split(", ").reverse()
  // Postal format places the zipcode after the city: "Taipei City 104001".
  if (zipcode) englishParts[1] = `${englishParts[1]} ${zipcode}`

  if (form.ln) {
    zh += `${form.ln}巷`
    englishParts.push(`${form.ln} Ln`)
  }
  if (form.aly) {
    zh += `${form.aly}弄`
    englishParts.push(`${form.aly} Aly`)
  }
  if (form.no) {
    zh += `${form.no}號`
    if (form.noDash) {
      zh += `之${form.noDash}`
      englishParts.push(`No. ${form.no}-${form.noDash}`)
    } else {
      englishParts.push(`No. ${form.no}`)
    }
  }
  if (form.floor) {
    zh += `${form.basement ? "地下" : ""}${form.floor}樓`
    if (form.floorDash) {
      zh += `之${form.floorDash}`
      englishParts.push(
        `${form.basement ? "B" : ""}${form.floor}F-${form.floorDash}`,
      )
    } else {
      englishParts.push(`${form.basement ? "B" : ""}${form.floor}F`)
    }
  }
  if (form.room) {
    zh += `${form.room}室`
    englishParts.push(`${form.room} Room`)
  }

  if (hasUnconvertedAddressParts(addressSuffix, zh.slice(baseAddress.length))) {
    warns.push("部分門牌內容未能轉換成英文")
  }

  return {
    zh,
    en: englishParts.reverse().join(", "),
    form,
    warns,
  }
}

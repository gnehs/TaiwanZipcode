import zipcodeData from "@/assets/zipcode.json"
import { hasUnconvertedAddressParts } from "@/utils/addressConversion.js"
import {
  findLongestAddressPrefix,
  searchAddressList,
} from "@/utils/addressSearch.js"
import { parseAddressSuffix } from "@/utils/zipcodeScopeMatcher.js"

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

  for (const [cityName, city] of Object.entries(database)) {
    for (const [areaName, area] of Object.entries(city.areas)) {
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

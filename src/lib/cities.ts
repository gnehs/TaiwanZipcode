import { zipcodeData } from "@/lib/addresses"
import type { Locale } from "@/lib/locale"

// North to south down the west coast, then the east coast, then the islands,
// the order people scan for their own county in.
const REGIONS: { name: Record<Locale, string>; cities: string[] }[] = [
  {
    name: { zh: "北部", en: "North" },
    cities: ["臺北市", "新北市", "基隆市", "桃園市", "新竹市", "新竹縣"],
  },
  {
    name: { zh: "中部", en: "Central" },
    cities: ["苗栗縣", "臺中市", "彰化縣", "南投縣", "雲林縣"],
  },
  {
    name: { zh: "南部", en: "South" },
    cities: ["嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣"],
  },
  {
    name: { zh: "東部", en: "East" },
    cities: ["宜蘭縣", "花蓮縣", "臺東縣"],
  },
  {
    name: { zh: "離島", en: "Islands" },
    cities: ["澎湖縣", "金門縣", "連江縣"],
  },
]

const listed = new Set(REGIONS.flatMap((region) => region.cities))
// A county the data adds later still shows, after the known ones.
const unlisted = Object.keys(zipcodeData).filter((city) => !listed.has(city))

/** The cities and counties of each region, keeping only those in the data. */
export const CITY_REGIONS = REGIONS.map((region) => ({
  name: region.name,
  cities: region.cities.filter((city) => city in zipcodeData),
}))
if (unlisted.length) CITY_REGIONS.at(-1)!.cities.push(...unlisted)

/** Every city and county in the data, in the order people look for theirs. */
export const CITIES = CITY_REGIONS.flatMap((region) => region.cities)

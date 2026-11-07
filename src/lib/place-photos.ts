import type { Focus } from "@/components/ascii-photo"

// One Unsplash photo per city or county, served from public/places/, and a
// night or dusk one for the dark theme, served from public/places/night/,
// where Unsplash has one. `photo` is the Unsplash photo id. Night photos keep
// their own shape, so `focus` picks the part a narrow or wide crop keeps.
export const PLACE_PHOTOS = [
  { name: "臺灣", slug: "home", photo: "L6xHmv2R3G4", author: "Sam Chang", night: { photo: "phjpsNFw6pM", author: "Timo Volz", focus: [0.4, 0.45] } },
  { name: "臺北市", slug: "taipei", photo: "au3CYbd7vCU", author: "Thomas Tucker", night: { photo: "AEKdzZn_bBI", author: "Ethan Lin", focus: [0.3, 0.65] } },
  { name: "新北市", slug: "new-taipei", photo: "Cj72lAv4nMw", author: "Ricky LK", night: { photo: "J0iPddM6rms", author: "Zion C", focus: [0.35, 0.5] } },
  { name: "基隆市", slug: "keelung", photo: "T5EkYWswpzo", author: "Nonthat Towanabut", night: { photo: "IlqjELXMI_c", author: "Arawark chen", focus: [0.5, 0.55] } },
  { name: "桃園市", slug: "taoyuan", photo: "eG5oraY-oY8", author: "JUNHØ" },
  { name: "新竹市", slug: "hsinchu-city", photo: "ZAExzWKKDgk", author: "inni w", night: { photo: "t8XWT0sGk0M", author: "Daniel Honies" } },
  { name: "新竹縣", slug: "hsinchu-county", photo: "zmUZcaJA5CE", author: "Henry Lin LIN TING HAO" },
  { name: "苗栗縣", slug: "miaoli", photo: "u6dQm1BLlKY", author: "W il" },
  { name: "臺中市", slug: "taichung", photo: "RcGQ1VItZ_E", author: "Yao-ting Tsai", night: { photo: "dUNZ2Meaz00", author: "Raymond Yeung", focus: [0.4, 0.55] } },
  { name: "彰化縣", slug: "changhua", photo: "QG6ku37ZrEM", author: "KK Ng" },
  { name: "南投縣", slug: "nantou", photo: "FTj49uatPMc", author: "Nica Lorber", night: { photo: "DA8-I5eMxGM", author: "Eean Chen" } },
  { name: "雲林縣", slug: "yunlin", photo: "31AUW11z4Hs", author: "Yu Hong Lee" },
  { name: "嘉義市", slug: "chiayi-city", photo: "8dZT1snzFjg", author: "Arthur Tseng", night: { photo: "iJp_MsXUF5E", author: "MChe Lee", focus: [0.55, 0.3] } },
  { name: "嘉義縣", slug: "chiayi-county", photo: "kuwxYfmQZhU", author: "Cheng Chieh Hsu", night: { photo: "Gmd_0z4eNtw", author: "Keido wvtvnvbe" } },
  { name: "臺南市", slug: "tainan", photo: "h2quJ9B8eJ0", author: "Timo Volz", night: { photo: "cAztbx_kPYQ", author: "Yu Hong Lee", focus: [0.5, 0.55] } },
  { name: "高雄市", slug: "kaohsiung", photo: "QyhBZsQuBuc", author: "Ricky LK", night: { photo: "a6I_Qs2o6Ps", author: "Stefano Huang", focus: [0.6, 0.4] } },
  { name: "屏東縣", slug: "pingtung", photo: "5gcPJTz9zuU", author: "Timo Volz", night: { photo: "xyOdaw74lG4", author: "M. X.", focus: [0.5, 0.4] } },
  { name: "宜蘭縣", slug: "yilan", photo: "1jx-gZTja9s", author: "Timo Volz", night: { photo: "xObvMAc3Ie8", author: "Winston Chen" } },
  { name: "花蓮縣", slug: "hualien", photo: "-jeOH08q-S8", author: "Roméo A.", night: { photo: "0aXI-ZHTATs", author: "kiryl", focus: [0.4, 0.4] } },
  { name: "臺東縣", slug: "taitung", photo: "bRFA0ra9-zQ", author: "Someus Christopher", night: { photo: "RJyFHAOjAbY", author: "Ginta Wang", focus: [0.72, 0.5] } },
  { name: "澎湖縣", slug: "penghu", photo: "aReOMtQczlE", author: "Johnson Hung", night: { photo: "p13yLUzFir4", author: "Johnson Hung", focus: [0.5, 0.65] } },
  { name: "金門縣", slug: "kinmen", photo: "CkoEF2PHuy0", author: "Roméo A.", night: { photo: "9EShqvceWHk", author: "Roméo A." } },
  { name: "連江縣", slug: "lienchiang", photo: "W3hZ4jZAccE", author: "Roméo A." },
] as const

// Every city name is three characters, so a road's city is its prefix.
export function placePhoto(road: string, isDark: boolean): { src: string; focus?: Focus } {
  const city = road.slice(0, 3)
  const place = PLACE_PHOTOS.find(({ name }) => name === city) ?? PLACE_PHOTOS[0]
  if (isDark && "night" in place) {
    const { night } = place
    return {
      src: `/places/night/${place.slug}.webp`,
      focus: "focus" in night ? night.focus : undefined,
    }
  }
  return { src: `/places/${place.slug}.webp` }
}

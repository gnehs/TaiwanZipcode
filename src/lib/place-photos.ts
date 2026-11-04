// One Unsplash photo per city or county, served from public/places/.
// `photo` is the Unsplash photo id.
export const PLACE_PHOTOS = [
  { name: "臺灣", slug: "home", photo: "L6xHmv2R3G4", author: "Sam Chang" },
  { name: "臺北市", slug: "taipei", photo: "au3CYbd7vCU", author: "Thomas Tucker" },
  { name: "新北市", slug: "new-taipei", photo: "Cj72lAv4nMw", author: "Ricky LK" },
  { name: "基隆市", slug: "keelung", photo: "T5EkYWswpzo", author: "Nonthat Towanabut" },
  { name: "桃園市", slug: "taoyuan", photo: "eG5oraY-oY8", author: "JUNHØ" },
  { name: "新竹市", slug: "hsinchu-city", photo: "ZAExzWKKDgk", author: "inni w" },
  { name: "新竹縣", slug: "hsinchu-county", photo: "zmUZcaJA5CE", author: "Henry Lin LIN TING HAO" },
  { name: "苗栗縣", slug: "miaoli", photo: "u6dQm1BLlKY", author: "W il" },
  { name: "臺中市", slug: "taichung", photo: "RcGQ1VItZ_E", author: "Yao-ting Tsai" },
  { name: "彰化縣", slug: "changhua", photo: "QG6ku37ZrEM", author: "KK Ng" },
  { name: "南投縣", slug: "nantou", photo: "FTj49uatPMc", author: "Nica Lorber" },
  { name: "雲林縣", slug: "yunlin", photo: "31AUW11z4Hs", author: "Yu Hong Lee" },
  { name: "嘉義市", slug: "chiayi-city", photo: "8dZT1snzFjg", author: "Arthur Tseng" },
  { name: "嘉義縣", slug: "chiayi-county", photo: "kuwxYfmQZhU", author: "Cheng Chieh Hsu" },
  { name: "臺南市", slug: "tainan", photo: "h2quJ9B8eJ0", author: "Timo Volz" },
  { name: "高雄市", slug: "kaohsiung", photo: "QyhBZsQuBuc", author: "Ricky LK" },
  { name: "屏東縣", slug: "pingtung", photo: "5gcPJTz9zuU", author: "Timo Volz" },
  { name: "宜蘭縣", slug: "yilan", photo: "1jx-gZTja9s", author: "Timo Volz" },
  { name: "花蓮縣", slug: "hualien", photo: "-jeOH08q-S8", author: "Roméo A." },
  { name: "臺東縣", slug: "taitung", photo: "bRFA0ra9-zQ", author: "Someus Christopher" },
  { name: "澎湖縣", slug: "penghu", photo: "aReOMtQczlE", author: "Johnson Hung" },
  { name: "金門縣", slug: "kinmen", photo: "CkoEF2PHuy0", author: "Roméo A." },
  { name: "連江縣", slug: "lienchiang", photo: "W3hZ4jZAccE", author: "Roméo A." },
] as const

export function placePhotoUrl(slug: string) {
  return `/places/${slug}.webp`
}

// Every city name is three characters, so a road's city is its prefix.
export function placePhoto(road: string) {
  const city = road.slice(0, 3)
  return placePhotoUrl(PLACE_PHOTOS.find(({ name }) => name === city)?.slug ?? "home")
}

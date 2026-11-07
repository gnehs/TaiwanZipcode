export const SITE_ORIGIN = "https://zipcode.gnehs.net"
export const SITE_TITLE = "閃電地址"
// Shown under the name in the footer, and leads llms.txt.
export const SITE_INTRO =
  "免驗證碼、不上傳伺服器的臺灣 3+3 郵遞區號與英文地址極速查詢工具，支援智慧糾錯與 Excel 批次處理。"

// The site as structured data, which address pages name as their home.
export const WEBSITE_DATA = {
  "@type": "WebSite",
  "@id": `${SITE_ORIGIN}/#website`,
  name: SITE_TITLE,
  url: `${SITE_ORIGIN}/`,
  inLanguage: "zh-TW",
}

export type PageMeta = {
  title: string
  description: string
  path: string
}

export const HOME_META: PageMeta = {
  title: SITE_TITLE,
  description: "填表不卡關，地址閃電查。",
  path: "/",
}

export const BATCH_META: PageMeta = {
  title: `批次查詢｜${SITE_TITLE}`,
  description: "一次貼上多筆地址，查出每筆的 3+3 郵遞區號與英文地址。",
  path: "/batch",
}

export const FAQ_META: PageMeta = {
  title: `常見問題｜${SITE_TITLE}`,
  description: "查不到道路、找不到範圍、門牌待確認等提示的原因，以及資料來源與門牌資料涵蓋的縣市。",
  path: "/faq",
}

export const GUIDE_META: PageMeta = {
  title: `使用說明｜${SITE_TITLE}`,
  description: "只打路名、打錯字也查得到：閃電地址的查詢小撇步，以及一次查完整份名單的批次查詢。",
  path: "/guide",
}

export const ABOUT_META: PageMeta = {
  title: `關於｜${SITE_TITLE}`,
  description: "閃電地址是免費的臺灣 3+3 郵遞區號查詢工具，資料每月同步中華郵政。",
  path: "/about",
}

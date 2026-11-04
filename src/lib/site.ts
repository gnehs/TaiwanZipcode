export const SITE_ORIGIN = "https://zipcode.gnehs.net"
export const SITE_TITLE = "台灣 3+3 郵遞區號查詢"

export type PageMeta = {
  title: string
  description: string
  path: string
}

export const HOME_META: PageMeta = {
  title: SITE_TITLE,
  description: "即時、快速、無需驗證碼之郵遞區號線上查詢工具。",
  path: "/",
}

export const BATCH_META: PageMeta = {
  title: `批次查詢｜${SITE_TITLE}`,
  description: "一次貼上多筆地址，查出每筆的 3+3 郵遞區號與英文地址。",
  path: "/batch",
}

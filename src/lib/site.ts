import { readable } from "../utils/addressUrls.js"

import { HTML_LANG, LOCALES, localePath, type Locale } from "./locale"

export const SITE_ORIGIN = "https://zipcode.gnehs.net"
export const SITE_TITLE: Record<Locale, string> = {
  zh: "閃電地址",
  en: "ZipBolt",
}
const TITLE_SEPARATOR = " - "

/**
 * A path on the site as a full URL with its Chinese left readable: readers of
 * Markdown or JSON may have no page to resolve a path against, and readable
 * Chinese takes far fewer tokens than escaped.
 */
export function siteUrl(path: string) {
  const [pathname, hash] = path.split("#")
  const parts = pathname.split("/").map((part) => readable(decodeURIComponent(part)))
  return `${SITE_ORIGIN}${parts.join("/")}${hash ? `#${readable(decodeURIComponent(hash))}` : ""}`
}

/** A page's title: its own name, then the site's. */
export function pageTitle(locale: Locale, name: string) {
  return `${name}${TITLE_SEPARATOR}${SITE_TITLE[locale]}`
}

/** The page's own name, without the site's. */
export function pageName(title: string) {
  return title.split(TITLE_SEPARATOR)[0]
}
// Shown under the name in the footer, and leads llms.txt.
export const SITE_INTRO: Record<Locale, string> = {
  zh: "免驗證碼、不上傳伺服器的臺灣 3+3 郵遞區號與英文地址極速查詢工具，支援智慧糾錯與 Excel 批次處理。",
  en: "Find any Taiwan 3+3 zip code and the address in English, right in your browser. No captcha, no sign-up, and whole spreadsheets at once.",
}

// The site as structured data, which every page names as its home; each
// language is a site of its own.
export function websiteData(locale: Locale) {
  const url = `${SITE_ORIGIN}${localePath(locale, "/")}`
  return {
    "@type": "WebSite",
    "@id": `${url}${locale === "zh" ? "" : "/"}#website`,
    name: SITE_TITLE[locale],
    url,
    inLanguage: HTML_LANG[locale],
  }
}

export type PageMeta = {
  title: string
  description: string
  path: string
}

export type FixedPage = "home" | "batch" | "zipcodes" | "guide" | "faq" | "about"

const FIXED_PAGES: Record<FixedPage, { path: string } & Record<Locale, { name: string | null; description: string }>> = {
  home: {
    path: "/",
    zh: { name: null, description: "填表不卡關，地址閃電查。" },
    // The bare name says nothing to someone searching, so the English home
    // leads with what the site does.
    en: {
      name: "Taiwan Zip Code Lookup",
      description:
        "Look up the 3+3 zip code of any address in Taiwan and get it written in English, ready to paste into a form.",
    },
  },
  batch: {
    path: "/batch",
    zh: { name: "批次查詢", description: "一次貼上多筆地址，查出每筆的 3+3 郵遞區號與英文地址。" },
    en: {
      name: "Batch Lookup",
      description: "Paste a list of Taiwanese addresses and get each one's 3+3 zip code and English address.",
    },
  },
  zipcodes: {
    path: "/zipcodes",
    zh: {
      name: "三碼郵遞區號表",
      description: "全臺各縣市、鄉鎮市區的三碼郵遞區號一覽，點選行政區查看每條道路的 3+3 郵遞區號。",
    },
    en: {
      name: "Taiwan Zip Code List",
      description:
        "The 3-digit zip code of every district in Taiwan, by city and county. Pick a district for each road's 3+3 zip code.",
    },
  },
  guide: {
    path: "/guide",
    zh: {
      name: "使用說明",
      description: "只打路名、打錯字也查得到：閃電地址的查詢小撇步，以及一次查完整份名單的批次查詢。",
    },
    en: {
      name: "Guide",
      description:
        "How to look up a Taiwanese zip code by road name, in English or Chinese, and how to look up a whole list at once.",
    },
  },
  faq: {
    path: "/faq",
    zh: {
      name: "常見問題",
      description: "查不到道路、找不到範圍、門牌待確認等提示的原因，以及資料來源與門牌資料涵蓋的縣市。",
    },
    en: {
      name: "FAQ",
      description:
        "How Taiwan's 3+3 zip codes work, why a road may need a house number, where the data comes from, and which counties list house numbers.",
    },
  },
  about: {
    path: "/about",
    zh: { name: "關於", description: "閃電地址是免費的臺灣 3+3 郵遞區號查詢工具，資料每月同步中華郵政。" },
    en: {
      name: "About",
      description: "A free Taiwan 3+3 zip code lookup, synced with Chunghwa Post every month.",
    },
  },
}

export const FIXED_PAGE_KEYS = Object.keys(FIXED_PAGES) as FixedPage[]

/** A fixed page's title, description and path in one language. */
export function fixedPageMeta(page: FixedPage, locale: Locale): PageMeta {
  const { path, [locale]: text } = FIXED_PAGES[page]
  return {
    title: text.name ? pageTitle(locale, text.name) : SITE_TITLE[locale],
    description: text.description,
    path: localePath(locale, path),
  }
}

/** The path of a fixed page inside the app, the same in both languages. */
export const fixedPagePath = (page: FixedPage) => FIXED_PAGES[page].path

/** Each language's URL of the page at this path inside the app. */
export function alternates(path: string): Record<string, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [HTML_LANG[locale], `${SITE_ORIGIN}${localePath(locale, path)}`]),
  )
}

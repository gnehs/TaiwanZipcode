import { createContext, useContext } from "react"

export type Locale = "zh" | "en"

export const LOCALES: readonly Locale[] = ["zh", "en"]

// English pages live under /en; the app runs there with /en as its base, so
// every in-app link and route stays the same in both languages.
const BASES: Record<Locale, string> = { zh: "", en: "/en" }

export const HTML_LANG: Record<Locale, string> = { zh: "zh-TW", en: "en" }

export function localeOfPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "zh"
}

/** The path inside the app: "/en/faq" → "/faq", "/en" → "/". */
export function pathInApp(pathname: string): string {
  if (localeOfPath(pathname) === "zh") return pathname
  return pathname.slice(BASES.en.length) || "/"
}

/** The path a visitor sees: ("en", "/faq") → "/en/faq", ("en", "/") → "/en". */
export function localePath(locale: Locale, path: string): string {
  const base = BASES[locale]
  return base && path === "/" ? base : `${base}${path}`
}

export const routerBase = (locale: Locale) => BASES[locale] || "/"

const LocaleContext = createContext<Locale>("zh")

export const LocaleProvider = LocaleContext.Provider

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

/** A component's text in both languages, picked by the page's language. */
export function useText<M extends Record<Locale, unknown>>(messages: M): M[Locale] {
  return messages[useLocale()]
}

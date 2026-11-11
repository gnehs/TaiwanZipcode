import { useLocation } from "@tanstack/react-router"

import { localePath, useLocale, type Locale } from "@/lib/locale"

const OTHER: Record<Locale, { locale: Locale; label: string; lang: string }> = {
  zh: { locale: "en", label: "English", lang: "en" },
  en: { locale: "zh", label: "中文", lang: "zh-TW" },
}

/**
 * The same page, address included, in the other language. Following it is
 * a full page load, since the app starts in one language.
 */
export function useOtherLanguage() {
  const { locale, label, lang } = OTHER[useLocale()]
  const { pathname, hash } = useLocation()
  return { href: `${localePath(locale, pathname)}${hash ? `#${hash}` : ""}`, label, lang }
}

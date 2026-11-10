import type { Locale } from "@/lib/locale"
import { parseColumnPrefs } from "@/utils/batchColumns.js"

export type ColumnPrefs<K extends string> = {
  order: K[]
  hidden: K[]
  widths: Partial<Record<K | "input", number>>
}

// Each language keeps its own layout, since each leads with its own address.
const storageKey = (locale: Locale) => (locale === "zh" ? "batch-columns" : `batch-columns-${locale}`)

export function readColumnPrefs<K extends string>(locale: Locale, columns: readonly K[]) {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(storageKey(locale))
  } catch {
    // Unreadable storage leaves the default columns.
  }
  return parseColumnPrefs(raw, {
    columns: [...columns],
    resizable: ["input", ...columns],
  }) as ColumnPrefs<K>
}

export function writeColumnPrefs<K extends string>(locale: Locale, prefs: ColumnPrefs<K>) {
  try {
    window.localStorage.setItem(storageKey(locale), JSON.stringify(prefs))
  } catch {
    // The layout still applies for this visit.
  }
}

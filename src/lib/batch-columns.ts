import { parseColumnPrefs } from "@/utils/batchColumns.js"

export type ColumnPrefs<K extends string> = {
  order: K[]
  hidden: K[]
  widths: Partial<Record<K | "input", number>>
}

const STORAGE_KEY = "batch-columns"

export function readColumnPrefs<K extends string>(columns: readonly K[]) {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Unreadable storage leaves the default columns.
  }
  return parseColumnPrefs(raw, {
    columns: [...columns],
    resizable: ["input", ...columns],
  }) as ColumnPrefs<K>
}

export function writeColumnPrefs<K extends string>(prefs: ColumnPrefs<K>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // The layout still applies for this visit.
  }
}

export type Theme = "light" | "dark" | "system"

const STORAGE_KEY = "taiwan-zipcode-theme"
const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"
const listeners = new Set<() => void>()
let theme: Theme = "system"

function parseTheme(value: string | null): Theme {
  return value === "light" || value === "dark" ? value : "system"
}

function readTheme(): Theme {
  try {
    return parseTheme(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return "system"
  }
}

function applyTheme() {
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia(COLOR_SCHEME_QUERY).matches)
  document.documentElement.classList.toggle("dark", isDark)
  document.documentElement.style.colorScheme = isDark ? "dark" : "light"
}

function updateTheme(nextTheme: Theme) {
  theme = nextTheme
  applyTheme()
  listeners.forEach((listener) => listener())
}

export function getTheme(): Theme {
  return theme
}

// The theme in effect, with "system" resolved.
export function getIsDark() {
  return document.documentElement.classList.contains("dark")
}

export function setTheme(nextTheme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
  } catch {
    // Keep the control usable even when browser storage is unavailable.
  }
  updateTheme(nextTheme)
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function initializeTheme() {
  updateTheme(readTheme())
  const colorScheme = window.matchMedia(COLOR_SCHEME_QUERY)
  const syncSystemTheme = () => {
    if (theme === "system") updateTheme(theme)
  }
  const syncStoredTheme = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    // Ignore sessionStorage events, which share the same browser event type.
    try {
      if (event.storageArea !== window.localStorage) return
    } catch {
      return
    }
    updateTheme(parseTheme(event.newValue))
  }
  colorScheme.addEventListener("change", syncSystemTheme)
  window.addEventListener("storage", syncStoredTheme)
  return () => {
    colorScheme.removeEventListener("change", syncSystemTheme)
    window.removeEventListener("storage", syncStoredTheme)
  }
}

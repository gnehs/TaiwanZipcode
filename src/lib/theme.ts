type ColorScheme = "light" | "dark"

const STORAGE_KEY = "taiwan-zipcode-theme"
const SYSTEM_DARK = "(prefers-color-scheme: dark)"
const listeners = new Set<() => void>()
// null follows the system; a stored scheme is kept even once the system
// comes round to it, so a scheme pinned against an automatic switch stays.
let override: ColorScheme | null = null

function parseScheme(value: string | null): ColorScheme | null {
  return value === "light" || value === "dark" ? value : null
}

function systemScheme(): ColorScheme {
  return window.matchMedia(SYSTEM_DARK).matches ? "dark" : "light"
}

function applyOverride(next: ColorScheme | null) {
  override = next
  // index.css maps this meta to color-scheme and the dark variant.
  document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')!.content =
    override ?? "light dark"
  listeners.forEach((listener) => listener())
}

export function getIsDark() {
  return (override ?? systemScheme()) === "dark"
}

// Flips what is on screen; landing back on the system's scheme drops the
// override so the page follows the system again.
export function toggleColorScheme() {
  const target: ColorScheme = getIsDark() ? "light" : "dark"
  const next = target === systemScheme() ? null : target
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, next)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Keep the control usable even when browser storage is unavailable.
  }
  applyOverride(next)
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function initializeTheme() {
  let saved: string | null = null
  try {
    saved = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Follow the system when storage is unavailable.
  }
  applyOverride(parseScheme(saved))
  const systemDark = window.matchMedia(SYSTEM_DARK)
  const syncSystem = () => listeners.forEach((listener) => listener())
  const syncStored = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    // Ignore sessionStorage events, which share the same browser event type.
    try {
      if (event.storageArea !== window.localStorage) return
    } catch {
      return
    }
    applyOverride(parseScheme(event.newValue))
  }
  systemDark.addEventListener("change", syncSystem)
  window.addEventListener("storage", syncStored)
  return () => {
    systemDark.removeEventListener("change", syncSystem)
    window.removeEventListener("storage", syncStored)
  }
}

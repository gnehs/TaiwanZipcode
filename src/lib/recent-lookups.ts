import {
  addRecentLookup,
  parseRecentLookups,
} from "@/utils/recentLookups.js"

export type RecentLookup = {
  road: string
  suffix: string
  zipcode: string
}

const STORAGE_KEY = "taiwan-zipcode-recent"
const listeners = new Set<() => void>()
let lookups: RecentLookup[] = readLookups()

function readLookups(): RecentLookup[] {
  try {
    return parseRecentLookups(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return []
  }
}

function updateLookups(nextLookups: RecentLookup[]) {
  lookups = nextLookups
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lookups))
  } catch {
    // Recent lookups are a convenience; the list still works for this visit.
  }
  listeners.forEach((listener) => listener())
}

export function getRecentLookups(): RecentLookup[] {
  return lookups
}

export function rememberLookup(lookup: RecentLookup) {
  updateLookups(addRecentLookup(lookups, lookup))
}

export function clearRecentLookups() {
  updateLookups([])
}

export function subscribeRecentLookups(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

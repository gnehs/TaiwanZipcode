import { useEffect, useState } from "react"

export type RoadDoorplates = Record<string, string>
type DistrictDoorplates = Record<string, RoadDoorplates>

// Only districts with county data have a file; each loads on first use.
let districtNames: Promise<string[]> | null = null
const districtFiles = new Map<string, Promise<DistrictDoorplates>>()

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`${response.status} ${path}`)
  return response.json()
}

export type DoorplateDate = { date: string; kind: "data" | "updated" }

/**
 * When each covered county's doorplates were taken, as an ROC date
 * ("115-10", "115-9-14"): named by the county, or only the upload date.
 */
export function loadDoorplateDates() {
  return fetchJson<Record<string, DoorplateDate>>("/doorplates/dates.json")
}

/** The districts with a doorplate file, as "臺北市北投區". */
export function loadDoorplateDistricts() {
  districtNames ??= fetchJson<string[]>("/doorplates/index.json").catch((error) => {
    districtNames = null
    throw error
  })
  return districtNames
}

async function loadRoad(road: string) {
  const district = (await loadDoorplateDistricts()).find((name) => road.startsWith(name))
  if (!district) return null
  let file = districtFiles.get(district)
  if (!file) {
    file = fetchJson<DistrictDoorplates>(
      `/doorplates/${encodeURIComponent(district)}.json`,
    )
    file.catch(() => districtFiles.delete(district))
    districtFiles.set(district, file)
  }
  return (await file)[road.slice(district.length)] ?? null
}

/**
 * The road's lanes, alleys and house numbers (null without data), and
 * whether they are still loading.
 */
export function useRoadDoorplates(road: string) {
  const [loaded, setLoaded] = useState<{
    road: string
    doorplates: RoadDoorplates | null
  }>()
  useEffect(() => {
    if (!road) return
    let live = true
    loadRoad(road)
      .catch(() => null)
      .then((doorplates) => {
        if (live) setLoaded({ road, doorplates })
      })
    return () => {
      live = false
    }
  }, [road])
  const isCurrent = loaded?.road === road
  return {
    doorplates: isCurrent ? loaded.doorplates : null,
    isLoading: Boolean(road) && !isCurrent,
  }
}

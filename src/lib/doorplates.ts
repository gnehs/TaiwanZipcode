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

async function loadRoad(road: string) {
  districtNames ??= fetchJson<string[]>("/doorplates/index.json").catch((error) => {
    districtNames = null
    throw error
  })
  const district = (await districtNames).find((name) => road.startsWith(name))
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

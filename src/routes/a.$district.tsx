import { createFileRoute, redirect } from "@tanstack/react-router"

import { PlacePage } from "@/components/place-page"
import { placeForPath } from "@/lib/page-meta"

// A city or a district, one level above its roads (see utils/addressUrls.js).
export const Route = createFileRoute("/a/$district")({
  beforeLoad: ({ params }) => {
    if (!placeForPath(`/a/${encodeURIComponent(params.district)}`)) {
      throw redirect({ to: "/", replace: true })
    }
  },
  component: PlaceRoute,
})

function PlaceRoute() {
  const { district } = Route.useParams()
  const place = placeForPath(`/a/${encodeURIComponent(district)}`)
  return place ? <PlacePage city={place.city} area={place.area} /> : null
}

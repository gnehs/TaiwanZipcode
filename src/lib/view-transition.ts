import { pathInApp } from "@/lib/locale"

// CSS picks each change's animations by its type. A browser with view
// transitions but no types would run the page-wide crossfade on every change.
export function canViewTransition() {
  return (
    typeof document.startViewTransition === "function" &&
    CSS.supports("selector(:active-view-transition-type(a))")
  )
}

// The home page and every address are one page, since typing an address
// replaces the URL on every keystroke; a city or district is the place page.
function pageOfPath(pathname: string) {
  const path = pathInApp(pathname)
  const segments = path.split("/").filter(Boolean)
  if (segments.length === 0 || (segments[0] === "a" && segments.length === 3)) return "single"
  if (segments[0] === "a") return "place"
  return segments[0]
}

// The router's own previous location only moves once a navigation fully
// settles, which a quick follow-up navigation can skip, so the page on
// screen is tracked here instead.
let shownPage = pageOfPath(window.location.pathname)

/** The view transition type for a navigation, or false when it stays on one page. */
export function pageTransitionType(toPathname: string) {
  const from = shownPage
  const to = pageOfPath(toPathname)
  shownPage = to
  if (from === to) return false
  // Single and batch lookup are two sides of one switch, so they zoom past
  // each other; every other change brings the new page up into place.
  if (from === "single" && to === "batch") return "to-batch"
  if (from === "batch" && to === "single") return "to-single"
  return "to-page"
}

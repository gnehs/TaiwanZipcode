import { flushSync } from "react-dom"

// CSS picks each change's animations by its type. A browser with view
// transitions but no types would run the page-wide crossfade on every change.
export function canViewTransition() {
  return (
    typeof document.startViewTransition === "function" &&
    CSS.supports("selector(:active-view-transition-type(a))")
  )
}

/**
 * Apply a state change inside a view transition of the given type. Without
 * support, or with reduced motion, the change simply applies.
 */
export function runViewTransition(type: string, update: () => void) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!canViewTransition() || reduceMotion) {
    update()
    return
  }
  const transition = document.startViewTransition({
    update: () => flushSync(update),
    types: [type],
  })
  // An aborted transition still applies the update; only the animation is lost.
  transition.ready.catch(() => {})
}

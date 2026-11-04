import { flushSync } from "react-dom"

/**
 * Apply a state change inside a view transition. `type` is set as
 * data-view-transition on <html> before the old page is captured, so CSS can
 * name layers and pick animations for this kind of change only. Without
 * support, or with reduced motion, the change simply applies.
 */
export function runViewTransition(type: string, update: () => void) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!document.startViewTransition || reduceMotion) {
    update()
    return
  }
  const root = document.documentElement
  root.dataset.viewTransition = type
  const transition = document.startViewTransition(() => flushSync(update))
  // An aborted transition still applies the update; only the animation is lost.
  transition.ready.catch(() => {})
  void transition.finished.finally(() => {
    if (root.dataset.viewTransition === type) delete root.dataset.viewTransition
  })
}

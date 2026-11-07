// CSS picks each change's animations by its type. A browser with view
// transitions but no types would run the page-wide crossfade on every change.
export function canViewTransition() {
  return (
    typeof document.startViewTransition === "function" &&
    CSS.supports("selector(:active-view-transition-type(a))")
  )
}

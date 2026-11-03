import { ThemeToggle } from "@/components/theme-toggle"

export function SiteHeader({ onHome }: { onHome: () => void }) {
  return (
    <header className="flex items-center justify-between gap-3 px-1 pb-2">
      <a
        href="/"
        className="-m-1.5 flex min-w-0 items-center gap-3 rounded-2xl p-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={(event) => {
          // Let modified clicks open a new tab; a plain click resets in place.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          onHome()
        }}
      >
        <img
          src="/icon.svg"
          alt=""
          className="size-10 shrink-0 [filter:drop-shadow(0_1px_1px_oklch(0.4_0.14_38/0.3))_drop-shadow(0_4px_10px_oklch(0.5_0.16_40/0.35))]"
        />
        <h1 className="truncate text-lg font-semibold tracking-tight">
          台灣 3+3 郵遞區號查詢
        </h1>
      </a>
      <ThemeToggle />
    </header>
  )
}

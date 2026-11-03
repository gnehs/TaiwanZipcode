export function SiteHeader({ onHome }: { onHome: () => void }) {
  return (
    <header className="flex justify-center pb-3">
      <a
        href="/"
        className="flex flex-col items-center gap-4 rounded-3xl p-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
          className="size-16 shrink-0 [filter:drop-shadow(0_1px_1px_oklch(0.4_0.14_38/0.3))_drop-shadow(0_6px_14px_oklch(0.5_0.16_40/0.35))] sm:size-18"
        />
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          台灣 3+3 郵遞區號查詢
        </h1>
      </a>
    </header>
  )
}

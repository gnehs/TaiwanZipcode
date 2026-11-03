import { ThemeToggle } from "@/components/theme-toggle"

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-3 px-1 pb-2">
      <div className="flex min-w-0 items-center gap-3">
        <img src="/icon.svg" alt="" className="size-10 shrink-0" />
        <h1 className="truncate text-lg font-semibold tracking-tight">
          台灣 3+3 郵遞區號查詢
        </h1>
      </div>
      <ThemeToggle />
    </header>
  )
}

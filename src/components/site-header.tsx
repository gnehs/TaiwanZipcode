import { ThemeToggle } from "@/components/theme-toggle"

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-3 px-1 pb-2">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--primary),white_8%),var(--primary))] text-primary-foreground shadow-primary">
          <span className="text-sm font-semibold tracking-tight" aria-hidden="true">
            3+3
          </span>
        </div>
        <h1 className="truncate text-lg font-semibold tracking-tight">
          台灣 3+3 郵遞區號查詢
        </h1>
      </div>
      <ThemeToggle />
    </header>
  )
}

import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { SITE_TITLE } from "@/lib/site"
import { cn } from "@/lib/utils"

// lucide ships no brand marks, so the GitHub mark is drawn here.
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.5.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  )
}

// Inline credits read as part of the sentence, so they keep the body colour.
function CreditLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      className="rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  )
}

export function SiteFooter() {
  return (
    // Spans the page edge to edge; the padding lines the logo up with the header's.
    <footer className="mt-20 w-full border-t bg-muted/50 px-4 pt-10 pb-8 sm:px-6">
      <div className="flex flex-col gap-3">
        <Link to="/" className="flex w-fit items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <img
            src="/icon.svg"
            alt=""
            className="size-7 shrink-0 [filter:drop-shadow(0_1px_1px_oklch(0.2_0_0/0.3))_drop-shadow(0_2px_6px_oklch(0.2_0_0/0.2))]"
          />
          <span className="text-sm font-semibold tracking-tight">{SITE_TITLE}</span>
        </Link>
        <p className="text-xs/relaxed text-muted-foreground">
          資料擷取自郵局資料庫，僅供參考；
          <br className="sm:hidden" />
          正確資料請以中華郵政公告為準。
        </p>
        <nav aria-label="說明" className="flex gap-4">
          {[
            { to: "/guide", label: "使用說明" },
            { to: "/faq", label: "常見問題" },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="w-fit rounded-sm text-xs font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-8 flex items-center justify-between gap-4 border-t pt-6 sm:mt-10">
        {/* Phones split the credit over two lines so the controls keep their place beside it. */}
        <p className="text-xs/relaxed text-muted-foreground">
          Developed by <CreditLink href="https://gnehs.net">gnehs</CreditLink>
          <span className="max-sm:hidden"> · </span>
          <br className="sm:hidden" />
          Made with <CreditLink href="https://pancake.gnehs.net">🥞</CreditLink> in Taiwan
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <a
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-lg" }),
              "text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-control",
            )}
            href="https://github.com/gnehs/TaiwanZipcode"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <GitHubIcon />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  )
}

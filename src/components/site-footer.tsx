import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { SITE_INTRO, SITE_TITLE } from "@/lib/site"
import { cn } from "@/lib/utils"

// lucide ships no brand marks, so the GitHub mark is drawn here.
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.5.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  )
}

// The site icon's pin, flat and oversized, tucked past the footer's corner.
// The bolt is a hole, so the band shows through it.
function FooterPin() {
  return (
    <svg
      viewBox="23 16 54 72"
      aria-hidden="true"
      className="pointer-events-none absolute -right-8 -bottom-8 h-64 w-auto text-[color-mix(in_oklch,var(--foreground)_6%,var(--background))]"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M77 43C77 60 62 76 53.6 85.2Q50 89 46.4 85.2C38 76 23 60 23 43A27 27 0 1 1 77 43ZM52.29 26.46L39.26 45.19Q38 47 40.2 47L46.4 47Q48 47 47.71 48.57L45.55 60.05Q45 63 46.73 60.55L60.73 40.8Q62 39 59.8 39L53.6 39Q52 39 52.21 37.41L53.6 26.97Q54 24 52.29 26.46Z"
      />
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
    // The band spans the page edge to edge; its content keeps to the header's width.
    <footer className="relative mt-20 w-full overflow-hidden border-t bg-muted/50 pt-10 pb-8">
      <FooterPin />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-3">
          <Link to="/" className="w-fit rounded-sm text-sm font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            {SITE_TITLE}
          </Link>
          <p className="text-sm/relaxed text-muted-foreground">
            {SITE_INTRO}
          </p>
          <p className="text-xs/relaxed text-muted-foreground">
            資料擷取自郵局資料庫，僅供參考；
            <br className="sm:hidden" />
            正確資料請以中華郵政公告為準。
          </p>
          <nav aria-label="說明" className="flex gap-4">
            {[
              { to: "/guide", label: "使用說明" },
              { to: "/faq", label: "常見問題" },
              { to: "/about", label: "關於" },
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
      </div>
    </footer>
  )
}

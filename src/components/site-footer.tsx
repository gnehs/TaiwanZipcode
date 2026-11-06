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

const LINK_GROUPS = [
  {
    label: "查詢",
    links: [
      { to: "/", label: "單筆查詢" },
      { to: "/batch", label: "批次查詢" },
    ],
  },
  {
    label: "說明",
    links: [
      { to: "/guide", label: "使用說明" },
      { to: "/faq", label: "常見問題" },
      { to: "/about", label: "關於" },
    ],
  },
] as const

export function SiteFooter() {
  return (
    // The band spans the page edge to edge; its content keeps to the header's width.
    <footer className="mt-20 w-full border-t bg-muted/50 pt-10 pb-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-1 sm:max-w-md">
            <Link
              to="/"
              className="flex w-fit items-center gap-2 rounded-md text-sm font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <img src="/icon-flat.svg" alt="" className="size-6 shrink-0 rounded-[5.5px] ring-1 ring-foreground/10" />
              {SITE_TITLE}
            </Link>
            <p className="text-sm/relaxed text-muted-foreground">{SITE_INTRO}</p>
          </div>
          {LINK_GROUPS.map(({ label, links }) => (
            <nav key={label} aria-label={label} className="flex flex-col gap-2.5">
              <h2 className="text-xs text-muted-foreground">{label}</h2>
              {links.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="w-fit rounded-sm text-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        {/* Phones give the disclaimer its own row and keep the controls beside the credit;
            wider screens stack both notes beside the controls. */}
        <div className="mt-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-t pt-6 text-xs/relaxed text-muted-foreground sm:gap-y-1">
          <p className="col-span-2 sm:col-span-1">
            資料擷取自郵局資料庫，僅供參考；正確資料請以中華郵政公告為準。
          </p>
          <p>
            Developed by <CreditLink href="https://gnehs.net">gnehs</CreditLink>
            <span className="max-sm:hidden"> · </span>
            <br className="sm:hidden" />
            Made with <CreditLink href="https://pancake.gnehs.net">🥞</CreditLink> in Taiwan
          </p>
          <div className="flex shrink-0 items-center gap-2 sm:col-start-2 sm:row-span-2 sm:row-start-1">
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

import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ThemeToggle } from "@/components/theme-toggle"
import { useLocale, useText } from "@/lib/locale"
import { SITE_INTRO, SITE_TITLE } from "@/lib/site"

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

const TEXT = {
  zh: {
    groups: [
      {
        label: "查詢",
        links: [
          { to: "/", label: "單筆查詢" },
          { to: "/batch", label: "批次查詢" },
          { to: "/zipcodes", label: "三碼郵遞區號表" },
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
    ],
    disclaimer: "資料擷取自郵局資料庫，僅供參考；正確資料請以中華郵政公告為準。",
  },
  en: {
    groups: [
      {
        label: "Lookup",
        links: [
          { to: "/", label: "Single lookup" },
          { to: "/batch", label: "Batch lookup" },
          { to: "/zipcodes", label: "Zip code list" },
        ],
      },
      {
        label: "Help",
        links: [
          { to: "/guide", label: "Guide" },
          { to: "/faq", label: "FAQ" },
          { to: "/about", label: "About" },
        ],
      },
    ],
    disclaimer: "From Chunghwa Post's database, for reference only; Chunghwa Post's own records are authoritative.",
  },
} as const

export function SiteFooter() {
  const locale = useLocale()
  const text = useText(TEXT)
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
              {SITE_TITLE[locale]}
            </Link>
            <p className="text-sm/relaxed text-muted-foreground">{SITE_INTRO[locale]}</p>
          </div>
          {text.groups.map(({ label, links }) => (
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
            {text.disclaimer}
          </p>
          <p>
            Developed by <CreditLink href="https://gnehs.net">gnehs</CreditLink>
            <span className="max-sm:hidden"> · </span>
            <br className="sm:hidden" />
            Made with <CreditLink href="https://pancake.gnehs.net">🥞</CreditLink> in Taiwan
          </p>
          <div className="shrink-0 sm:col-start-2 sm:row-span-2 sm:row-start-1">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}

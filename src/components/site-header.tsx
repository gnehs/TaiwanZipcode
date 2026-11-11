import { Link } from "@tanstack/react-router"
import { BookOpenIcon, CircleHelpIcon, InfoIcon, LanguagesIcon, MenuIcon, TableIcon } from "lucide-react"

import { useOtherLanguage } from "@/lib/other-language"
import { ModeSwitch } from "@/components/mode-switch"
import type { Page } from "@/components/page-shell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale, useText } from "@/lib/locale"
import { SITE_TITLE } from "@/lib/site"
import { cn } from "@/lib/utils"

const TEXT = {
  zh: { menu: "選單", zipcodes: "三碼郵遞區號表", guide: "使用說明", faq: "常見問題", about: "關於" },
  en: { menu: "Menu", zipcodes: "Zip code list", guide: "Guide", faq: "FAQ", about: "About" },
} as const

const MENU_LINKS = [
  { to: "/zipcodes", key: "zipcodes", icon: TableIcon },
  { to: "/guide", key: "guide", icon: BookOpenIcon },
  { to: "/faq", key: "faq", icon: CircleHelpIcon },
  { to: "/about", key: "about", icon: InfoIcon },
] as const

const HEADER_BUTTON =
  "flex h-11 min-w-11 items-center justify-center rounded-full outline-none transition-[color,background-color,box-shadow] duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50"
const ON_BAND = "text-white hover:bg-white/20 aria-expanded:bg-white/20"
const OFF_BAND =
  "text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-control aria-expanded:bg-card aria-expanded:text-foreground aria-expanded:shadow-control"

// The outer columns share the leftover width, so the mode switch stays
// centred however wide the logo is.
export function SiteHeader({
  page,
  onBand,
  onHome,
}: {
  page: Page
  onBand: boolean
  onHome?: () => void
}) {
  const locale = useLocale()
  const text = useText(TEXT)
  const other = useOtherLanguage()
  return (
    <>
      {/* Darkens the photo band under the white header text. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(3.5rem+--spacing(4))] bg-linear-to-b from-black/25 to-transparent transition-opacity duration-500 ease-out motion-reduce:transition-none sm:h-[calc(4rem+--spacing(4))]",
          !onBand && "opacity-0",
        )}
      />
      <header className="relative z-10 mx-auto grid w-full max-w-6xl [view-transition-name:site-bar] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pt-3 sm:px-5 sm:pt-5">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2.5 justify-self-start rounded-xl p-1 pr-2 outline-none transition-colors duration-500 ease-out [view-transition-name:site-header] focus-visible:ring-3 focus-visible:ring-ring/50",
            onBand && "text-white",
          )}
          onClick={(event) => {
            // Let modified clicks open a new tab; a plain click resets in place.
            if (!onHome || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
            event.preventDefault()
            onHome()
          }}
        >
          {/* The flat mark: the hairline keeps the light tile's edge on light pages. */}
          <img
            src="/icon-flat.svg"
            alt=""
            className="size-8 shrink-0 rounded-[7px] ring-1 ring-foreground/10"
          />
          {/* Phones keep only the icon; the name still labels the link. */}
          <h1 className="text-base font-semibold tracking-tight max-sm:sr-only">
            {SITE_TITLE[locale]}
          </h1>
        </Link>
        <ModeSwitch page={page} onBand={onBand} />
        <div className="flex items-center justify-self-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={text.menu}
              className={cn(HEADER_BUTTON, "size-11", onBand ? ON_BAND : OFF_BAND)}
            >
              <MenuIcon className="size-[1.125rem]" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-40">
              {MENU_LINKS.map(({ to, key, icon: Icon }) => (
                <DropdownMenuItem
                  key={to}
                  render={<Link to={to} />}
                  aria-current={page === to.slice(1) ? "page" : undefined}
                  className="min-h-10 gap-3 rounded-xl px-3 aria-[current=page]:font-medium"
                >
                  <Icon className="text-muted-foreground" aria-hidden="true" />
                  {text[key]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {/* Named in its own language, for visitors who cannot read this one. */}
              <DropdownMenuItem
                render={<a href={other.href} hrefLang={other.lang} lang={other.lang} />}
                className="min-h-10 gap-3 rounded-xl px-3"
              >
                <LanguagesIcon className="text-muted-foreground" aria-hidden="true" />
                {other.label}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  )
}

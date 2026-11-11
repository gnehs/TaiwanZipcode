import type { ReactNode } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowUpRightIcon } from "lucide-react"

import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { useLocale, useText } from "@/lib/locale"
import { PLACE_PHOTOS } from "@/lib/place-photos"
import { SITE_TITLE } from "@/lib/site"
import { usePageTitle } from "@/lib/page-title"

export const Route = createFileRoute("/about")({
  component: AboutPage,
})

const LINKS = {
  source: "https://github.com/gnehs/TaiwanZipcode",
  developer: "https://gnehs.net",
}

const TEXT = {
  zh: {
    title: (site: string) => `關於${site}`,
    facts: [
      { label: "資料", value: "中華郵政 3+3 區號與各縣市門牌，每月自動同步" },
      { label: "隱私", value: "查詢在瀏覽器內完成，地址不上傳伺服器" },
      { label: "費用", value: "無訂閱費、無查詢費，免註冊、免驗證碼" },
      { label: "原始碼", value: "GitHub", href: LINKS.source },
      { label: "開發", value: "gnehs", href: LINKS.developer },
    ],
    photos: "圖片來源",
    license: (link: ReactNode) => <>照片皆依 {link} 使用</>,
    placeName: (name: string, night: boolean) => (night ? `${name}・夜` : name),
  },
  en: {
    title: (site: string) => `About ${site}`,
    facts: [
      { label: "Data", value: "Chunghwa Post 3+3 zip codes and each county's house numbers, synced monthly" },
      { label: "Privacy", value: "Lookups run in your browser. Addresses are never uploaded" },
      { label: "Cost", value: "No subscription, no lookup fees, no sign-up, no CAPTCHA" },
      { label: "Source", value: "GitHub", href: LINKS.source },
      { label: "Developer", value: "gnehs", href: LINKS.developer },
    ],
    photos: "Photo credits",
    license: (link: ReactNode) => <>Photos are used under the {link}</>,
    placeName: (name: string, night: boolean) => (night ? `${name} (night)` : name),
  },
}

// Each place's day photo, then its night one where it has one.
const PLACE_CREDITS = PLACE_PHOTOS.flatMap((place) => [
  {
    key: place.slug,
    name: place.name,
    nameEn: place.nameEn,
    night: false,
    thumb: `/places/thumbs/${place.slug}.webp`,
    photo: place.photo,
    author: place.author,
  },
  ...("night" in place
    ? [
        {
          key: `${place.slug}-night`,
          name: place.name,
          nameEn: place.nameEn,
          night: true,
          thumb: `/places/night/thumbs/${place.slug}.webp`,
          ...place.night,
        },
      ]
    : []),
])

function AboutPage() {
  const locale = useLocale()
  const text = useText(TEXT)
  usePageTitle("about")

  return (
    <PageShell page="about" raised>
      <Card flatOnPhone className="enter-rise">
        <CardContent className="flex flex-col gap-5">
          <h2 className="text-2xl font-bold tracking-tight">{text.title(SITE_TITLE[locale])}</h2>
          <dl className="flex flex-col divide-y divide-border">
            {text.facts.map(({ label, value, href }) => (
              <div key={label} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                <dt className="w-14 shrink-0 text-muted-foreground">{label}</dt>
                <dd className="min-w-0">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium underline-offset-4 hover:underline"
                    >
                      {value}
                      <ArrowUpRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card flatOnPhone
        className="enter-rise"
        style={{ "--enter-delay": "60ms" } as React.CSSProperties}
        aria-labelledby="photos-title"
        role="region"
      >
        <CardContent className="flex flex-col">
          <h2 id="photos-title" className="text-base font-semibold">
            {text.photos}
          </h2>
          <p className="pb-2 text-sm text-muted-foreground">
            {text.license(
              <a
                href="https://unsplash.com/license"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Unsplash License
              </a>,
            )}
          </p>
          <ul className="-mx-3 -mb-3 grid sm:grid-cols-2">
            {PLACE_CREDITS.map(({ key, name, nameEn, night, thumb, photo, author }) => (
              <li key={key}>
                <a
                  href={`https://unsplash.com/photos/${photo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl p-3 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <img
                    src={thumb}
                    alt=""
                    width={48}
                    height={32}
                    loading="lazy"
                    className="h-8 w-12 shrink-0 rounded-md object-cover"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">
                      {text.placeName(locale === "en" ? nameEn : name, night)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {author} · Unsplash
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageShell>
  )
}

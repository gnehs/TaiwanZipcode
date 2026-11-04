import { useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowUpRightIcon } from "lucide-react"

import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { PLACE_PHOTOS } from "@/lib/place-photos"
import { ABOUT_META } from "@/lib/site"

export const Route = createFileRoute("/about")({
  component: AboutPage,
})

const FACTS = [
  { label: "資料", value: "中華郵政 3+3 郵遞區號，每月自動同步" },
  { label: "隱私", value: "查詢在瀏覽器內完成，地址不上傳伺服器" },
  { label: "費用", value: "免費、免註冊、免驗證碼" },
  {
    label: "原始碼",
    value: "GitHub",
    href: "https://github.com/gnehs/TaiwanZipcode",
  },
  { label: "開發", value: "gnehs", href: "https://gnehs.net" },
]

function AboutPage() {
  useEffect(() => {
    document.title = ABOUT_META.title
  }, [])

  return (
    <PageShell page="about" raised>
      <Card className="enter-rise">
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight">關於閃電地址</h2>
            <p className="text-muted-foreground">
              臺灣 3+3 郵遞區號查詢工具。輸入地址，邊打字邊查出完整郵遞區號與英文地址，也能一次貼上多筆批次查詢。
            </p>
          </div>
          <dl className="flex flex-col divide-y divide-border">
            {FACTS.map(({ label, value, href }) => (
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

      <Card
        className="enter-rise"
        style={{ "--enter-delay": "60ms" } as React.CSSProperties}
        aria-labelledby="photos-title"
        role="region"
      >
        <CardContent className="flex flex-col">
          <h2 id="photos-title" className="pb-2 text-base font-semibold">
            圖片來源
          </h2>
          <ul className="-mx-3 -mb-3 grid sm:grid-cols-2">
            {PLACE_PHOTOS.map(({ name, slug, photo, author }) => (
              <li key={slug}>
                <a
                  href={`https://unsplash.com/photos/${photo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl p-3 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <img
                    src={`/places/thumbs/${slug}.webp`}
                    alt=""
                    width={48}
                    height={32}
                    loading="lazy"
                    className="h-8 w-12 shrink-0 rounded-md object-cover"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{name}</span>
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

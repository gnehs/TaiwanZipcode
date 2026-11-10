import { RefreshCwIcon, ShieldCheckIcon, ZapIcon } from "lucide-react"

import { useText } from "@/lib/locale"

const ICONS = [ShieldCheckIcon, ZapIcon, RefreshCwIcon]

const TEXT = {
  zh: [
    { title: "隱私保護", description: "不用註冊，查過的地址只記在你自己的手機或電腦裡" },
    { title: "閃電搜尋", description: "資料隨網頁載入，邊打字邊比對，免等待、免驗證碼" },
    { title: "每月更新", description: "每個月自動更新中華郵政的郵遞區號資料" },
  ],
  en: [
    { title: "Private", description: "No sign-up. Addresses you look up stay on your own phone or computer" },
    { title: "Instant", description: "The data loads with the page and matches as you type, with no wait and no CAPTCHA" },
    { title: "Updated monthly", description: "Chunghwa Post's zip code data is refreshed automatically every month" },
  ],
} as const

export function FeatureCards() {
  const features = useText(TEXT)
  return (
    <ul className="grid gap-x-8 gap-y-6 px-1 pt-6 sm:grid-cols-3 sm:px-0 sm:pt-8">
      {features.map(({ title, description }, index) => {
        const Icon = ICONS[index]
        return (
        <li
          key={title}
          className="enter-rise flex flex-col gap-1"
          style={{ "--enter-delay": `${60 + index * 40}ms` } as React.CSSProperties}
        >
          <span className="control-surface mb-2 flex size-9 text-primary shadow-control items-center justify-center rounded-full">
            <Icon className="size-[1.125rem]" aria-hidden="true" />
          </span>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </li>
        )
      })}
    </ul>
  )
}

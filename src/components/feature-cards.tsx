import { RefreshCwIcon, ShieldCheckIcon, ZapIcon } from "lucide-react"

const FEATURES = [
  {
    icon: ShieldCheckIcon,
    title: "隱私保護",
    description: "不收集個人資料，地址不上傳伺服器，查詢紀錄只存在瀏覽器",
  },
  {
    icon: ZapIcon,
    title: "閃電搜尋",
    description: "資料隨網頁載入，邊打字邊比對，免等待、免驗證碼",
  },
  {
    icon: RefreshCwIcon,
    title: "每月更新",
    description: "每月自動同步中華郵政 3+3 郵遞區號資料庫",
  },
]

export function FeatureCards() {
  return (
    <ul className="grid gap-x-6 gap-y-5 px-1 pt-8 sm:grid-cols-3 sm:gap-y-8 sm:px-0">
      {FEATURES.map(({ icon: Icon, title, description }, index) => (
        <li
          key={title}
          className="enter-rise flex items-center gap-4 sm:flex-col sm:gap-1.5 sm:text-center"
          style={{ "--enter-delay": `${60 + index * 40}ms` } as React.CSSProperties}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card shadow-surface sm:mb-1">
            <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-0.5 sm:gap-1.5">
            <h2 className="text-sm font-medium">{title}</h2>
            <p className="text-xs text-muted-foreground sm:text-balance">
              {description}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

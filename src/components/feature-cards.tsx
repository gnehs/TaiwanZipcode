const FEATURES = [
  {
    title: "隱私保護",
    description: "不收集個人資料，地址不上傳伺服器，查詢紀錄只存在瀏覽器",
  },
  {
    title: "閃電搜尋",
    description: "資料隨網頁載入，邊打字邊比對，免等待、免驗證碼",
  },
  {
    title: "每月更新",
    description: "每月自動同步中華郵政 3+3 郵遞區號資料庫",
  },
]

export function FeatureCards() {
  return (
    <ul className="grid gap-x-8 gap-y-6 px-1 pt-6 sm:grid-cols-3 sm:px-0 sm:pt-8">
      {FEATURES.map(({ title, description }, index) => (
        <li
          key={title}
          className="enter-rise flex flex-col gap-1"
          style={{ "--enter-delay": `${60 + index * 40}ms` } as React.CSSProperties}
        >
          <span className="pb-1 text-xs font-semibold text-primary tabular-nums" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </li>
      ))}
    </ul>
  )
}

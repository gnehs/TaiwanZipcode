import { useEffect, useState, type ReactNode } from "react"
import { createFileRoute } from "@tanstack/react-router"

import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { addressIndex } from "@/lib/addresses"
import { loadDoorplateDates, type DoorplateDate } from "@/lib/doorplates"
import { FAQ_META } from "@/lib/site"

export const Route = createFileRoute("/faq")({
  component: FaqPage,
})

// North to south down the west coast, then the east coast, then the islands,
// the order people scan for their own county in.
const CITY_ORDER = [
  "臺北市", "新北市", "基隆市", "桃園市", "新竹市", "新竹縣", "苗栗縣",
  "臺中市", "彰化縣", "南投縣", "雲林縣",
  "嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣",
  "宜蘭縣", "花蓮縣", "臺東縣",
  "澎湖縣", "金門縣", "連江縣",
]
const rank = (city: string) => {
  const index = CITY_ORDER.indexOf(city)
  return index === -1 ? CITY_ORDER.length : index
}
const CITIES = [...new Set(addressIndex.places.map(({ city }) => city))].sort(
  (a, b) => rank(a) - rank(b),
)

// Which counties have doorplates and how old they are, read from the files
// the site ships.
function useDoorplateDates() {
  const [dates, setDates] = useState<Record<string, DoorplateDate> | null>(null)
  useEffect(() => {
    loadDoorplateDates()
      .then(setDates)
      .catch(() => setDates(null))
  }, [])
  return dates
}

function formatDoorplateDate({ date, kind }: DoorplateDate) {
  const [year, month, day] = date.split("-")
  const text = `${Number(year) + 1911} 年${month ? ` ${month} 月` : ""}${day ? ` ${day} 日` : ""}`
  return kind === "updated" ? `${text}更新` : text
}

type Question = { id: string; question: string; answer: ReactNode }

function questions(dates: Record<string, DoorplateDate> | null): Question[] {
  const uncovered = dates ? CITIES.filter((city) => !dates[city]) : null
  const covered = dates ? CITIES.filter((city) => dates[city]) : []
  return [
    {
      id: "road",
      question: "為什麼顯示「找不到相符道路」？",
      answer: (
        <>
          <p>
            道路名稱要和中華郵政資料中的寫法對得上。常見原因是錯字、少了「路」「街」或「段」，或是縣市與行政區不一致。
          </p>
          <p>
            可以試著縮短關鍵字，例如只輸入「忠孝東」，再從建議中選擇。新開闢的道路要等郵局資料收錄後才查得到。
          </p>
        </>
      ),
    },
    {
      id: "scope",
      question: "為什麼顯示「找不到範圍」？",
      answer: (
        <>
          <p>
            3+3 郵遞區號是依道路上的巷、弄、門牌範圍劃分的。輸入的巷弄或門牌號碼不在這條路的任何範圍內時，就無法決定後三碼。
          </p>
          <p>
            通常是巷弄號碼打錯，或把巷弄接到了別條路上。點結果卡上的「規則」可以看到這條路所有的範圍。
          </p>
        </>
      ),
    },
    {
      id: "more",
      question: "為什麼要求補上附號或樓層？",
      answer: (
        <p>
          有些大樓或機關的不同樓層、不同附號（例如「之1」）有各自的郵遞區號。資料中同一個門牌對應到多個區號時，需要附號或樓層才能確定。
        </p>
      ),
    },
    {
      id: "doorplates",
      question: "為什麼顯示「門牌待確認」？",
      answer: (
        <>
          <p>
            除了郵遞區號範圍，我們也會比對各縣市公開的門牌資料。範圍內但門牌資料中查不到這個號碼時，就會顯示這個提示。郵遞區號仍是依範圍查出的結果。
          </p>
          <p>
            這不代表門牌一定不存在。常見原因有：門牌號碼或附號打錯；新編的門牌尚未收錄，各縣市更新頻率不同；臨時門牌（如「臨 23 號」）與特殊門牌不在比對範圍內。
          </p>
        </>
      ),
    },
    {
      id: "coverage",
      question: "為什麼有些地址不會檢查門牌？",
      answer: (
        <>
          <p>
            門牌檢查與巷弄號建議需要各縣市政府公開的門牌資料。以下縣市尚未釋出或目前無法取得資料，只提供 3+3 郵遞區號查詢，不比對門牌：
          </p>
          {uncovered ? (
            <p className="font-medium text-foreground">{uncovered.join("、")}</p>
          ) : null}
        </>
      ),
    },
    {
      id: "dates",
      question: "各縣市的門牌資料是什麼時候的？",
      answer: (
        <>
          <p>
            各縣市釋出的頻率不同，較舊的資料可能還沒有新編的門牌。標示「更新」的縣市沒有註明資料日期，列出的是檔案最後更新的日期。
          </p>
          {dates ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 sm:grid-cols-[auto_1fr_auto_1fr]">
              {covered.map((city) => (
                <div key={city} className="contents">
                  <dt>{city}</dt>
                  <dd className="text-foreground tabular-nums">
                    {formatDoorplateDate(dates[city])}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      ),
    },
    {
      id: "english",
      question: "為什麼英文地址顯示需要確認？",
      answer: (
        <p>
          英文地址依中華郵政的譯寫規則產生。使用中文數字、以名稱命名的巷弄，或「衖」這類較少見的寫法時，可能無法完整轉換，請改用阿拉伯數字並再確認一次。
        </p>
      ),
    },
    {
      id: "source",
      question: "資料從哪裡來？多久更新？",
      answer: (
        <p>
          郵遞區號來自中華郵政 3+3 郵遞區號資料，門牌來自各縣市公開的門牌位置資料，兩者皆每月定期檢查更新。查詢結果僅供參考，正確資料請以中華郵政公告為準。
        </p>
      ),
    },
  ]
}

function FaqPage() {
  const dates = useDoorplateDates()
  useEffect(() => {
    document.title = FAQ_META.title
  }, [])

  return (
    <PageShell page="faq" raised>
      <Card className="enter-rise">
        <CardContent className="flex flex-col gap-5">
          <h2 className="text-2xl font-bold tracking-tight">常見問題</h2>
          <div className="flex flex-col divide-y divide-border">
            {questions(dates).map(({ id, question, answer }) => (
              <section
                key={id}
                id={id}
                aria-labelledby={`${id}-title`}
                className="flex scroll-mt-24 flex-col gap-2 py-4 first:pt-0 last:pb-0"
              >
                <h3 id={`${id}-title`} className="font-semibold">
                  {question}
                </h3>
                <div className="flex flex-col gap-2 text-sm/relaxed text-muted-foreground">
                  {answer}
                </div>
              </section>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}

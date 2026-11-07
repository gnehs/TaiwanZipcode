import { useEffect, type ReactNode } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRightIcon } from "lucide-react"

import { BatchDemo, TypingDemo } from "@/components/guide-demo"
import { PageShell } from "@/components/page-shell"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { GUIDE_META } from "@/lib/site"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/guide")({
  component: GuidePage,
})

type Tip = { id: string; title: string; body: ReactNode; examples?: string[] }

const TIPS: Tip[] = [
  {
    id: "partial",
    title: "地址只要打一部分",
    body: (
      <p>
        不必從縣市開始一個字一個字打完。少了縣市或行政區，只要其他部分對得上，就會自動補齊；邊打邊查，打到門牌號碼就有完整的 3+3 郵遞區號。
      </p>
    ),
    examples: ["臺中市七中路5號", "冬山鄉九分路8號"],
  },
  {
    id: "road",
    title: "路名夠特別，直接打路名",
    body: (
      <p>
        全臺只有一個地方有的路名，打路名就能找出縣市與行政區。像「中山路」「中正路」這類很多地方都有的路名，就要加上縣市或行政區才分得出來。
      </p>
    ),
    examples: ["丹陽街3號", "艋舺大道100號", "迪化街一段21號"],
  },
  {
    id: "typo",
    title: "錯字、漏字會自動修正",
    body: (
      <p>
        常見的錯字、異體字、簡稱，漏打的「路」「街」「號」會自動修正補齊，括號裡的備註也會自動濾除。手上的地址不確定對不對，整段貼上來試試看。
      </p>
    ),
    examples: [
      "桃園市中歷區七和路1號",
      "台北市大安區東豊街1號",
      "北市中正區丹陽3",
      "臺北市內湖科技園區瑞光路100號",
      "臺北市中正區丹陽街3號(收發室)",
    ],
  },
  {
    id: "doorplate",
    title: "自動核對門牌，減少退件",
    body: (
      <p>
        除了查郵遞區號，也會比對各縣市政府公開的門牌資料。號碼落在郵遞區號範圍內、門牌資料裡卻查不到時（例如把 18 號打成 81 號），會提醒「門牌待確認」。
      </p>
    ),
  },
]

const BATCH_EXAMPLES = [
  "北市中正區丹陽街3號(收發室)",
  "冬山鄉九分路8號",
  "桃園市中歷區七和路1號",
  "臺中市七中路5號",
]

function GuidePage() {
  useEffect(() => {
    document.title = GUIDE_META.title
  }, [])

  return (
    <PageShell page="guide" raised>
      <Card className="enter-rise">
        <CardContent className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight">使用說明</h2>
          <p className="text-muted-foreground">
            在首頁的搜尋框輸入地址，就會查出 3+3 郵遞區號與英文地址。示範中
            <span className="rounded-sm bg-[color-mix(in_oklab,var(--primary)_16%,var(--card))] font-medium text-primary">
              標示顏色
            </span>
            的部分，是自動補上或修正的內容。
          </p>
        </CardContent>
      </Card>

      {TIPS.map(({ id, title, body, examples }, index) => (
        <Card
          key={id}
          id={id}
          className="enter-rise scroll-mt-24"
          style={{ "--enter-delay": `${60 + index * 40}ms` } as React.CSSProperties}
          aria-labelledby={`${id}-title`}
          role="region"
        >
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h2 id={`${id}-title`} className="text-base font-semibold">
                {title}
              </h2>
              <div className="text-sm/relaxed text-muted-foreground">{body}</div>
            </div>
            {examples ? <TypingDemo examples={examples} /> : null}
          </CardContent>
        </Card>
      ))}

      <Card
        id="batch"
        className="enter-rise scroll-mt-24"
        style={{ "--enter-delay": `${60 + TIPS.length * 40}ms` } as React.CSSProperties}
        aria-labelledby="batch-title"
        role="region"
      >
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="batch-title" className="text-base font-semibold">
              批次查詢，一次查完整份名單
            </h2>
            <p className="text-sm/relaxed text-muted-foreground">
              寄送名單、會員資料要補郵遞區號，不必一筆一筆查。整欄地址貼進表格，每一列都會用同樣的方式補齊、修正，查出郵遞區號、中文與英文地址，再把需要的欄位複製回試算表。名單只在你的瀏覽器裡處理，不會上傳伺服器。
            </p>
          </div>
          <BatchDemo addresses={BATCH_EXAMPLES} />
          <Link
            to="/batch"
            className={cn(buttonVariants(), "min-h-11 self-start px-5")}
          >
            開始批次查詢
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </PageShell>
  )
}

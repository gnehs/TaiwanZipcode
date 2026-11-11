import type { ReactNode } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRightIcon } from "lucide-react"

import { BatchDemo, TypingDemo } from "@/components/guide-demo"
import { PageShell } from "@/components/page-shell"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useText } from "@/lib/locale"
import { usePageTitle } from "@/lib/page-title"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/guide")({
  component: GuidePage,
})

type Tip = { id: string; title: string; body: ReactNode; examples?: string[] }

const HIGHLIGHT_CLASS =
  "rounded-sm bg-[color-mix(in_oklab,var(--primary)_16%,var(--card))] font-medium text-primary"

const TEXT = {
  zh: {
    title: "使用說明",
    intro: (highlight: ReactNode) => (
      <>
        在首頁的搜尋框輸入地址，就會查出 3+3 郵遞區號與英文地址。示範中{highlight}的部分，是自動補上或修正的內容。
      </>
    ),
    highlight: "標示顏色",
    tips: [

    {
      id: "partial",
      title: "地址只要打一部分",
      body: (
        <p>
          不必從縣市開始一個字一個字打完。少了縣市或行政區，只要其他部分對得上，就會自動補齊；邊打邊查，打到門牌號碼就有完整的 3+3 郵遞區號。
        </p>
      ),
      examples: ["臺中市七中路18號", "冬山鄉九分路8號"],
    },
    {
      id: "road",
      title: "路名夠特別，直接打路名",
      body: (
        <p>
          全臺只有一個地方有的路名，打路名就能找出縣市與行政區。像「中山路」「中正路」這類很多地方都有的路名，就要加上縣市或行政區才分得出來。
        </p>
      ),
      examples: ["丹陽街6號", "艋舺大道100號", "迪化街一段21號"],
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
        "桃園市中歷區七和路99號",
        "台北市大安區東豊街1號",
        "北市中正區丹陽6",
        "臺北市內湖科技園區瑞光路100號",
        "臺北市中正區丹陽街6號(收發室)",
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
    ] as Tip[],
    batchTitle: "批次查詢，一次查完整份名單",
    batchBody:
      "寄送名單、會員資料要補郵遞區號，不必一筆一筆查。整欄地址貼進表格，每一列都會用同樣的方式補齊、修正，查出郵遞區號、中文與英文地址，再把需要的欄位複製回試算表。名單只在你的瀏覽器裡處理，不會上傳伺服器。",
    batchAction: "開始批次查詢",
  },
  en: {
    title: "Guide",
    intro: (highlight: ReactNode) => (
      <>
        Type an address into the search box on the home page to get its 3+3 zip code and its English and Chinese address. In the demos, {highlight} marks what was filled in or corrected automatically.
      </>
    ),
    highlight: "text in this color",
    tips: [

    {
      id: "english",
      title: "Type in English or Chinese",
      body: (
        <p>
          English addresses work as well as Chinese ones, with or without the city and district. The result shows both the English and the Chinese address, and the Chinese one is what landlords, couriers and most forms ask for.
        </p>
      ),
      examples: ["No. 7, Sec. 5, Xinyi Rd., Taipei", "No. 100, Ruiguang Rd., Neihu Dist., Taipei"],
    },
    {
      id: "partial",
      title: "Type only part of the address",
      body: (
        <p>
          No need to type the whole address from the city down. If the city or district is missing and the rest matches, it is filled in. Keep typing and a full 3+3 zip code appears once you reach the house number.
        </p>
      ),
      examples: ["臺中市七中路18號", "冬山鄉九分路8號"],
    },
    {
      id: "road",
      title: "Unusual road name? Type just the road",
      body: (
        <p>
          A road name found in only one place is enough to find its city and district. Common names like Zhongshan Rd. or Zhongzheng Rd. exist in many places, so add the city or district.
        </p>
      ),
      examples: ["丹陽街6號", "艋舺大道100號", "迪化街一段21號"],
    },
    {
      id: "typo",
      title: "Typos and missing characters are corrected",
      body: (
        <p>
          Common typos, variant characters and abbreviations are corrected, missing road, street and number characters are filled in, and notes in brackets are dropped. If you are not sure an address is right, paste it in and see.
        </p>
      ),
      examples: [
        "桃園市中歷區七和路99號",
        "台北市大安區東豊街1號",
        "北市中正區丹陽6",
        "臺北市內湖科技園區瑞光路100號",
        "臺北市中正區丹陽街6號(收發室)",
      ],
    },
    {
      id: "doorplate",
      title: "House numbers are checked to avoid returns",
      body: (
        <p>
          Besides the zip code, the address is checked against the house number data that each county publishes. When a number falls within a zip code range but is not in that data (for example 81 typed instead of 18), you get a &ldquo;House number unconfirmed&rdquo; notice.
        </p>
      ),
    },
    ] as Tip[],
    batchTitle: "Batch lookup for a whole list",
    batchBody:
      "Need zip codes for a mailing or member list? No need to look them up one by one. Paste a column of addresses into the table and every row is completed and corrected the same way, with its zip code and Chinese and English address, ready to copy back into your spreadsheet. The list is processed in your browser and never uploaded.",
    batchAction: "Start batch lookup",
  },
}

const BATCH_EXAMPLES = [
  "北市中正區丹陽街6號(收發室)",
  "冬山鄉九分路8號",
  "桃園市中歷區七和路99號",
  "臺中市七中路18號",
]

function GuidePage() {
  const text = useText(TEXT)
  usePageTitle("guide")

  return (
    <PageShell page="guide" raised>
      <Card flatOnPhone className="enter-rise">
        <CardContent className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight">{text.title}</h2>
          <p className="text-muted-foreground">
            {text.intro(<span className={HIGHLIGHT_CLASS}>{text.highlight}</span>)}
          </p>
        </CardContent>
      </Card>

      {text.tips.map(({ id, title, body, examples }, index) => (
        <Card flatOnPhone
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

      <Card flatOnPhone
        id="batch"
        className="enter-rise scroll-mt-24"
        style={{ "--enter-delay": `${60 + text.tips.length * 40}ms` } as React.CSSProperties}
        aria-labelledby="batch-title"
        role="region"
      >
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="batch-title" className="text-base font-semibold">
              {text.batchTitle}
            </h2>
            <p className="text-sm/relaxed text-muted-foreground">
              {text.batchBody}
            </p>
          </div>
          <BatchDemo addresses={BATCH_EXAMPLES} />
          <Link
            to="/batch"
            className={cn(buttonVariants(), "min-h-11 self-start px-5 print:hidden")}
          >
            {text.batchAction}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </PageShell>
  )
}

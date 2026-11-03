import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-2xl flex-col gap-1 px-4 pt-16 pb-6 text-center text-xs text-muted-foreground sm:px-6">
      <p>
        Developed by{" "}
        <a
          className={cn(buttonVariants({ variant: "link" }), "h-auto px-0 text-xs")}
          href="https://gnehs.net"
          target="_blank"
          rel="noreferrer"
        >
          gnehs
        </a>{" "}
        · Made with{" "}
        <a
          className={cn(buttonVariants({ variant: "link" }), "h-auto px-0 text-xs")}
          href="https://pancake.gnehs.net"
          target="_blank"
          rel="noreferrer"
        >
          🥞
        </a>{" "}
        in Taiwan ·{" "}
        <a
          className={cn(buttonVariants({ variant: "link" }), "h-auto px-0 text-xs")}
          href="https://github.com/gnehs/TaiwanZipcode"
        >
          GitHub
        </a>
      </p>
      <p>
        資料擷取自郵局資料庫，僅供參考；正確資料請以中華郵政公告為準。
      </p>
    </footer>
  )
}

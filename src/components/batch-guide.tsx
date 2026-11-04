import { ClipboardCopyIcon, ClipboardPasteIcon, MousePointerClickIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const MOD_KEY = /Mac|iPhone|iPad/u.test(navigator.platform) ? "⌘" : "Ctrl+"

const STEPS = [
  {
    icon: ClipboardCopyIcon,
    title: "從 Excel 複製地址",
    description: "選取整欄地址，一格一筆",
  },
  {
    icon: ClipboardPasteIcon,
    title: "貼進「地址」欄",
    description: `點第一格，按 ${MOD_KEY}V 貼上`,
  },
  {
    icon: MousePointerClickIcon,
    title: "選取需要的欄位貼回",
    description: `點欄位標題或拖曳框選，按 ${MOD_KEY}C 複製`,
  },
]

const STORAGE_KEY = "batch-guide-dismissed"

export function readGuideDismissed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function writeGuideDismissed(dismissed: boolean) {
  try {
    if (dismissed) window.localStorage.setItem(STORAGE_KEY, "1")
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Without storage the guide simply shows again next visit.
  }
}

export function BatchGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card className="batch-guide enter-rise gap-4 py-5" aria-labelledby="batch-guide-title">
      <div className="flex items-center justify-between gap-3 px-(--card-spacing)">
        <h2 id="batch-guide-title" className="text-base font-semibold">
          使用說明
        </h2>
        <Button type="button" variant="outline" className="min-h-9 px-4" onClick={onDismiss}>
          知道了
        </Button>
      </div>
      <ol className="grid gap-4 px-(--card-spacing) sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, description }, index) => (
          <li key={title} className="flex items-center gap-3.5">
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary">
              <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
              <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-[0.6875rem] font-semibold text-primary-foreground tabular-nums">
                {index + 1}
              </span>
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

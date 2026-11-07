import { useEffect, useId, useState, useSyncExternalStore } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The async Clipboard API can be refused (insecure context, permissions), so
// fall back to the legacy textarea + execCommand path before giving up.
async function writeClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Try the legacy path below.
  }
  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.cssText =
      "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none"
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    const copied = document.execCommand("copy")
    textarea.remove()
    return copied
  } catch {
    return false
  }
}

// Only the most recent copy on the page keeps its check mark, so several
// quick copies never leave a row of checks behind.
let latestCopy: string | null = null
const latestCopyListeners = new Set<() => void>()

function markLatestCopy(id: string) {
  latestCopy = id
  latestCopyListeners.forEach((listener) => listener())
}

function subscribeLatestCopy(listener: () => void) {
  latestCopyListeners.add(listener)
  return () => latestCopyListeners.delete(listener)
}

const ICON_LAYER =
  "col-start-1 row-start-1 transition-[opacity,filter,scale] duration-200 ease-out motion-reduce:scale-100 motion-reduce:blur-none"

// The icons trade places through a blur: the outgoing one softens and shrinks
// while the incoming one sharpens into focus.
function IconSwap({
  swapped,
  from,
  to,
}: {
  swapped: boolean
  from: React.ReactNode
  to: React.ReactNode
}) {
  return (
    <span data-icon="inline-start" className="grid" aria-hidden="true">
      <span className={cn(ICON_LAYER, swapped && "scale-75 opacity-0 blur-[3px]")}>
        {from}
      </span>
      <span className={cn(ICON_LAYER, !swapped && "scale-75 opacity-0 blur-[3px]")}>
        {to}
      </span>
    </span>
  )
}

export function CopyButton({
  text,
  label,
  visibleLabel = label,
  disabled = false,
  variant = "outline",
  icon = <CopyIcon />,
  className,
}: {
  text: string
  label: string
  visibleLabel?: string
  disabled?: boolean
  variant?: "default" | "outline" | "ghost"
  icon?: React.ReactNode
  className?: string
}) {
  const [feedback, setFeedback] = useState<{
    text: string
    status: "pending" | "copied" | "failed"
  } | null>(null)
  const id = useId()
  const isLatest = useSyncExternalStore(
    subscribeLatestCopy,
    () => latestCopy === id,
    () => false,
  )
  const ownStatus = feedback?.text === text ? feedback.status : null
  const status = ownStatus === "copied" && !isLatest ? null : ownStatus
  const iconOnly = !visibleLabel

  useEffect(() => {
    if (feedback?.status !== "copied") return
    const timer = window.setTimeout(() => setFeedback(null), 2000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  async function copy() {
    setFeedback({ text, status: "pending" })
    const copied = await writeClipboard(text)
    if (copied) markLatestCopy(id)
    setFeedback({ text, status: copied ? "copied" : "failed" })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={variant}
        className={cn(
          iconOnly
            ? "size-10 p-0 has-data-[icon=inline-start]:pl-0"
            : "h-10 px-4 has-data-[icon=inline-start]:pl-3.5",
          className,
        )}
        onClick={copy}
        disabled={disabled || !text || status === "pending"}
        aria-label={label}
      >
        <IconSwap
          swapped={status === "copied"}
          from={icon}
          to={<CheckIcon />}
        />
        {/* The label stays put; the icon carries the feedback and the status
            region below announces it, so the button never changes width. */}
        {iconOnly ? null : visibleLabel}
      </Button>
      <span
        role="status"
        className={status === "failed" ? "text-xs text-destructive" : "sr-only"}
      >
        {status === "failed"
          ? "無法自動複製，請選取文字後手動複製。"
          : status === "copied"
            ? `${label}：已複製`
            : ""}
      </span>
    </div>
  )
}

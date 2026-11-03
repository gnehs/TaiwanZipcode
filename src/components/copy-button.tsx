import { useEffect, useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CopyButton({
  text,
  label,
  visibleLabel = label,
  disabled = false,
  variant = "outline",
  className,
}: {
  text: string
  label: string
  visibleLabel?: string
  disabled?: boolean
  variant?: "default" | "outline"
  className?: string
}) {
  const [feedback, setFeedback] = useState<{
    text: string
    status: "pending" | "copied" | "failed"
  } | null>(null)
  const status = feedback?.text === text ? feedback.status : null
  const iconOnly = !visibleLabel

  useEffect(() => {
    if (feedback?.status !== "copied") return
    const timer = window.setTimeout(() => setFeedback(null), 2000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  async function copy() {
    setFeedback({ text, status: "pending" })
    try {
      await navigator.clipboard.writeText(text)
      setFeedback({ text, status: "copied" })
    } catch {
      setFeedback({ text, status: "failed" })
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={variant}
        className={cn(
          iconOnly
            ? "size-10 p-0"
            : "min-h-11 px-4 has-data-[icon=inline-start]:pl-3.5",
          className,
        )}
        onClick={copy}
        disabled={disabled || !text || status === "pending"}
        aria-label={label}
      >
        {status === "copied" ? (
          <CheckIcon data-icon="inline-start" aria-hidden="true" />
        ) : (
          <CopyIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {iconOnly
          ? null
          : status === "copied"
            ? "已複製"
            : status === "pending"
              ? "複製中…"
              : visibleLabel}
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

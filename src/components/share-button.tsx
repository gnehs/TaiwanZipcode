import { LinkIcon, ShareIcon } from "lucide-react"

import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Opens the system share sheet where there is one, and copies the link otherwise.
export function ShareButton({ url, className }: { url: string; className?: string }) {
  const canShare =
    typeof navigator.share === "function" && (navigator.canShare?.({ url }) ?? true)

  if (!canShare) {
    return (
      <CopyButton
        text={url}
        label="複製分享連結"
        visibleLabel="分享"
        variant="ghost"
        icon={<LinkIcon />}
        className={className}
      />
    )
  }

  async function share() {
    try {
      // Read at press time: the page title is only updated after this renders.
      await navigator.share({ title: document.title, url })
    } catch {
      // Dismissing the sheet rejects too; there is nothing to report.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn("h-10 px-4 has-data-[icon=inline-start]:pl-3.5", className)}
      onClick={share}
    >
      <ShareIcon data-icon="inline-start" aria-hidden="true" />
      分享
    </Button>
  )
}

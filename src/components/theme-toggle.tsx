import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toggleColorScheme } from "@/lib/theme"
import { useText } from "@/lib/locale"

const TEXT = {
  zh: { toDark: "切換為暗色", toLight: "切換為亮色" },
  en: { toDark: "Switch to dark theme", toLight: "Switch to light theme" },
} as const

// Both faces are in the markup and the dark variant shows one, so the
// button is right before the app runs and when the system flips.
export function ThemeToggle() {
  const text = useText(TEXT)

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={toggleColorScheme}
      className="text-muted-foreground"
    >
      <span className="contents dark:hidden">
        <SunIcon aria-hidden="true" />
        <span className="sr-only">{text.toDark}</span>
      </span>
      <span className="hidden dark:contents">
        <MoonIcon aria-hidden="true" />
        <span className="sr-only">{text.toLight}</span>
      </span>
    </Button>
  )
}

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import {
  getTheme,
  setTheme,
  subscribeTheme,
  type Theme,
} from "@/lib/theme"

// Each press moves to the next theme, wrapping around.
const THEME_CYCLE: Record<Theme, { label: string; icon: typeof SunIcon; next: Theme }> = {
  system: { label: "跟隨系統", icon: MonitorIcon, next: "light" },
  light: { label: "亮色", icon: SunIcon, next: "dark" },
  dark: { label: "暗色", icon: MoonIcon, next: "system" },
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme)
  const { label, icon: Icon, next } = THEME_CYCLE[theme]
  const nextLabel = THEME_CYCLE[next].label

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className="size-11 text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-control"
      onClick={() => setTheme(next)}
      aria-label={`主題：${label}，切換為${nextLabel}`}
      title={`主題：${label}`}
    >
      <Icon className="size-[1.125rem]" aria-hidden="true" />
    </Button>
  )
}

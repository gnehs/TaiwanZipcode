import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useSyncExternalStore } from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  getTheme,
  setTheme,
  subscribeTheme,
  type Theme,
} from "@/lib/theme"

const THEME_OPTIONS = [
  { value: "light", label: "亮色", icon: SunIcon },
  { value: "dark", label: "暗色", icon: MoonIcon },
  { value: "system", label: "跟隨系統", icon: MonitorIcon },
] as const satisfies ReadonlyArray<{
  value: Theme
  label: string
  icon: typeof SunIcon
}>

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme)

  function handleThemeChange(values: string[]) {
    const nextTheme = values[0]
    if (nextTheme === "light" || nextTheme === "dark" || nextTheme === "system") {
      setTheme(nextTheme)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">主題</span>
      <ToggleGroup
        value={[theme]}
        onValueChange={handleThemeChange}
        variant="outline"
        size="lg"
        spacing={1}
        aria-label="主題"
        className="w-full max-w-md justify-center"
      >
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            className="min-h-10 flex-1 rounded-full px-3.5 sm:flex-none"
          >
            <Icon data-icon="inline-start" aria-hidden="true" />
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

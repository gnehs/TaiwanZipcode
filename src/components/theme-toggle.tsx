import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useSyncExternalStore } from "react"

import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"

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

// All three choices sit in view, so the current one needs no menu to find.
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme)

  return (
    <ToggleGroup
      aria-label="主題"
      value={[theme]}
      onValueChange={([value]) => {
        // Pressing the current choice again would empty the group; keep it.
        if (value) setTheme(value as Theme)
      }}
      className="flex rounded-full bg-muted p-1 shadow-well"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <Toggle
          key={value}
          value={value}
          aria-label={label}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-pressed:control-surface data-pressed:text-foreground data-pressed:shadow-control [&_svg]:size-3.5"
        >
          <Icon aria-hidden="true" />
        </Toggle>
      ))}
    </ToggleGroup>
  )
}

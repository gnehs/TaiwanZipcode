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
import { useText } from "@/lib/locale"

const TEXT = {
  zh: { group: "主題", light: "亮色", dark: "暗色", system: "跟隨系統" },
  en: { group: "Theme", light: "Light", dark: "Dark", system: "System" },
} as const

const THEME_OPTIONS = [
  { value: "light", icon: SunIcon },
  { value: "dark", icon: MoonIcon },
  { value: "system", icon: MonitorIcon },
] as const satisfies ReadonlyArray<{
  value: Theme
  icon: typeof SunIcon
}>

// All three choices sit in view, so the current one needs no menu to find.
export function ThemeToggle() {
  const text = useText(TEXT)
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme)

  return (
    <ToggleGroup
      aria-label={text.group}
      value={[theme]}
      onValueChange={([value]) => {
        // Pressing the current choice again would empty the group; keep it.
        if (value) setTheme(value as Theme)
      }}
      className="flex rounded-full bg-muted p-1 shadow-well"
    >
      {THEME_OPTIONS.map(({ value, icon: Icon }) => (
        <Toggle
          key={value}
          value={value}
          aria-label={text[value]}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-pressed:control-surface data-pressed:text-foreground data-pressed:shadow-control [&_svg]:size-3.5"
        >
          <Icon aria-hidden="true" />
        </Toggle>
      ))}
    </ToggleGroup>
  )
}

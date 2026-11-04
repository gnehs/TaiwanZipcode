import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

export function ThemeToggle({ onBand }: { onBand: boolean }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme)
  const current =
    THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[2]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className={cn(
              "size-11",
              onBand
                ? "text-white hover:bg-white/20 hover:text-white aria-expanded:bg-white/20 aria-expanded:text-white dark:hover:bg-white/20"
                : "text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-control aria-expanded:bg-card aria-expanded:text-foreground aria-expanded:shadow-control",
            )}
            aria-label={`主題：${current.label}`}
          />
        }
      >
        <current.icon className="size-[1.125rem]" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className="min-h-10 gap-2.5 pl-3"
            >
              <Icon aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

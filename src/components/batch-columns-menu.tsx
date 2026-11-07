import { useRef, useState } from "react"
import { GripVerticalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { moveItem } from "@/utils/batchColumns.js"

type MenuColumn<K> = { key: K; title: string }

export function BatchColumnsMenu<K extends string>({
  columns,
  order,
  hidden,
  isDefault,
  onOrderChange,
  onHiddenChange,
  onReset,
}: {
  columns: readonly MenuColumn<K>[]
  order: K[]
  hidden: K[]
  isDefault: boolean
  onOrderChange: (order: K[]) => void
  onHiddenChange: (hidden: K[]) => void
  onReset: () => void
}) {
  const listRef = useRef<HTMLUListElement>(null)
  const [dragging, setDragging] = useState<K | null>(null)
  const titles = new Map(columns.map((column) => [column.key, column.title]))

  // The row under the pointer takes the dragged column's place as it passes.
  function startDrag(event: React.PointerEvent<HTMLButtonElement>, key: K) {
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    setDragging(key)
    let current = order
    const move = (moveEvent: PointerEvent) => {
      const items = Array.from(listRef.current?.children ?? [])
      const to = items.findIndex((item) => {
        const rect = item.getBoundingClientRect()
        return moveEvent.clientY >= rect.top && moveEvent.clientY < rect.bottom
      })
      const from = current.indexOf(key)
      if (to < 0 || to === from) return
      current = moveItem(current, from, to)
      onOrderChange(current)
    }
    const end = () => {
      handle.removeEventListener("pointermove", move)
      handle.removeEventListener("pointerup", end)
      handle.removeEventListener("pointercancel", end)
      setDragging(null)
    }
    handle.addEventListener("pointermove", move)
    handle.addEventListener("pointerup", end)
    handle.addEventListener("pointercancel", end)
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" className="min-h-11 px-4" />
        }
      >
        欄位
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 gap-1 rounded-2xl p-1">
        <ul ref={listRef} className="flex flex-col" aria-label="欄位">
          {order.map((key, index) => {
            const title = titles.get(key) ?? key
            const visible = !hidden.includes(key)
            return (
              <li
                key={key}
                className={cn(
                  "flex min-h-10 items-center rounded-xl pr-3 transition-colors duration-150 ease-out",
                  dragging === key ? "bg-accent" : "hover:bg-accent/60",
                )}
              >
                <button
                  type="button"
                  className="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                  aria-label={`移動「${title}」，用上下鍵調整順序`}
                  onPointerDown={(event) => startDrag(event, key)}
                  onKeyDown={(event) => {
                    const to = event.key === "ArrowUp" ? index - 1 : event.key === "ArrowDown" ? index + 1 : -1
                    if (to < 0 || to >= order.length) return
                    event.preventDefault()
                    onOrderChange(moveItem(order, index, to))
                  }}
                >
                  <GripVerticalIcon className="size-4" aria-hidden="true" />
                </button>
                <label className="flex min-h-10 flex-1 cursor-pointer items-center justify-between gap-3 select-none">
                  <span className={cn("truncate", !visible && "text-muted-foreground")}>{title}</span>
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 cursor-pointer accent-primary"
                    checked={visible}
                    onChange={() =>
                      onHiddenChange(
                        visible ? [...hidden, key] : hidden.filter((other) => other !== key),
                      )
                    }
                  />
                </label>
              </li>
            )
          })}
        </ul>
        <div className="border-t pt-1">
          <Button
            type="button"
            variant="ghost"
            className="min-h-10 w-full rounded-xl"
            disabled={isDefault}
            onClick={onReset}
          >
            重置
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

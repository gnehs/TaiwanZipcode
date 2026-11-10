import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  ClipboardPasteIcon,
  CopyIcon,
  CopyPlusIcon,
  ListPlusIcon,
  ScissorsIcon,
  Trash2Icon,
} from "lucide-react"
import type {
  ContextMenuComponentProps,
  ContextMenuItem,
} from "react-datasheet-grid"

import { useText } from "@/lib/locale"
import { cn } from "@/lib/utils"

const MOD_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/u.test(navigator.platform)
    ? "⌘"
    : "Ctrl+"

// The grid lists copy before cut; menus elsewhere read cut, copy, paste.
const CLIPBOARD_ORDER = ["CUT", "COPY", "PASTE"]

const TEXT = {
  zh: {
    menu: "表格操作",
    cut: "剪下",
    copy: "複製",
    paste: "貼上",
    insertBelow: "在下方插入一列",
    duplicateRow: "重複這一列",
    duplicateRows: (from: number, to: number) => `重複第 ${from}–${to} 列`,
    deleteRow: "刪除這一列",
    deleteRows: (from: number, to: number) => `刪除第 ${from}–${to} 列`,
  },
  en: {
    menu: "Table actions",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    insertBelow: "Insert row below",
    duplicateRow: "Duplicate row",
    duplicateRows: (from: number, to: number) => `Duplicate rows ${from}–${to}`,
    deleteRow: "Delete row",
    deleteRows: (from: number, to: number) => `Delete rows ${from}–${to}`,
  },
}

function describe(item: ContextMenuItem, text: (typeof TEXT)[keyof typeof TEXT]) {
  switch (item.type) {
    case "CUT":
      return { icon: ScissorsIcon, label: text.cut, shortcut: `${MOD_KEY}X` }
    case "COPY":
      return { icon: CopyIcon, label: text.copy, shortcut: `${MOD_KEY}C` }
    case "PASTE":
      return { icon: ClipboardPasteIcon, label: text.paste, shortcut: `${MOD_KEY}V` }
    case "INSERT_ROW_BELLOW":
      return { icon: ListPlusIcon, label: text.insertBelow }
    case "DUPLICATE_ROW":
      return { icon: CopyPlusIcon, label: text.duplicateRow }
    case "DUPLICATE_ROWS":
      return {
        icon: CopyPlusIcon,
        label: text.duplicateRows(item.fromRow, item.toRow),
      }
    case "DELETE_ROW":
      return { icon: Trash2Icon, label: text.deleteRow, destructive: true }
    case "DELETE_ROWS":
      return {
        icon: Trash2Icon,
        label: text.deleteRows(item.fromRow, item.toRow),
        destructive: true,
      }
  }
}

// The grid's own menu is unstyled English; this one matches the site's menus.
// It renders into the body so the card's clipping cannot cut it off.
export function BatchContextMenu({
  clientX,
  clientY,
  items: gridItems,
  cursorIndex,
  close,
}: ContextMenuComponentProps) {
  // Only the address column (0) and the row numbers (-1) edit anything; the
  // result columns are read-only, so they offer copy alone.
  const text = useText(TEXT)
  const items =
    cursorIndex.col <= 0
      ? gridItems
      : gridItems.filter((item) => item.type === "COPY")
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: clientX, top: clientY })

  // Flip toward the cursor when the menu would run off the viewport.
  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const { width, height } = menu.getBoundingClientRect()
    setPosition({
      left: clientX + width > window.innerWidth - 8 ? clientX - width : clientX,
      top: clientY + height > window.innerHeight - 8 ? clientY - height : clientY,
    })
  }, [clientX, clientY])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [close])

  const groups = [
    CLIPBOARD_ORDER.flatMap((type) => items.filter((item) => item.type === type)),
    items.filter((item) => !CLIPBOARD_ORDER.includes(item.type)),
  ].filter((group) => group.length)

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={text.menu}
      className="fixed z-50 min-w-48 rounded-2xl bg-popover p-1 text-popover-foreground shadow-popover animate-in duration-150 ease-out fade-in-0 zoom-in-95"
      style={position}
      onContextMenu={(event) => event.preventDefault()}
    >
      {groups.map((group, groupIndex) => (
        <div
          key={groupIndex}
          role="group"
          className={cn(groupIndex > 0 && "mt-1 border-t pt-1")}
        >
          {group.map((item) => {
            const { icon: Icon, label, shortcut, destructive } = describe(item, text)
            return (
              <button
                key={item.type}
                type="button"
                role="menuitem"
                className={cn(
                  "flex min-h-9 w-full cursor-default items-center gap-2.5 rounded-xl px-2.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                  destructive && "text-destructive hover:bg-[color-mix(in_oklab,var(--destructive)_10%,var(--popover))] hover:text-destructive",
                )}
                onClick={() => {
                  item.action()
                  close()
                }}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {shortcut ? (
                  <kbd className="font-sans text-xs text-muted-foreground">
                    {shortcut}
                  </kbd>
                ) : null}
              </button>
            )
          })}
        </div>
      ))}
    </div>,
    document.body,
  )
}

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import {
  DynamicDataSheetGrid,
  keyColumn,
  textColumn,
  type CellProps,
  type Column,
  type DataSheetGridRef,
} from "react-datasheet-grid"
import "react-datasheet-grid/dist/style.css"
import { ChevronDownIcon, CircleHelpIcon, DownloadIcon } from "lucide-react"

import { BatchColumnsMenu } from "@/components/batch-columns-menu"
import { BatchContextMenu } from "@/components/batch-context-menu"
import {
  BatchGuide,
  readGuideDismissed,
  writeGuideDismissed,
} from "@/components/batch-guide"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  addressIndex,
  formatAddress,
  getCorrectionsVersion,
  lookupCleanedAddress,
  subscribeCorrections,
} from "@/lib/addresses"
import {
  getLoadedRoadsVersion,
  peekRoadDoorplates,
  requestRoadDoorplates,
  subscribeLoadedRoads,
} from "@/lib/doorplates"
import { readColumnPrefs, writeColumnPrefs, type ColumnPrefs } from "@/lib/batch-columns"
import { cn } from "@/lib/utils"
import { runViewTransition } from "@/lib/view-transition"
import { clampColumnWidth } from "@/utils/batchColumns.js"
import { toCsv } from "@/utils/batchTable.js"
import { findDoor } from "@/utils/doorplates.js"
import { parseAddressSuffix } from "@/utils/zipcodeScopeMatcher.js"

type Tone = "success" | "warning" | "destructive"

type BatchResult = {
  tone: Tone | null
  status: string
  zipcode: string
  zh: string
  zhCity: string
  zhArea: string
  zhRest: string
  en: string
  line1: string
  line2: string
  district: string
  city: string
}

// The text column clears a cell to null.
type GridRow = BatchResult & { input: string | null }

type ResultKey = Exclude<keyof BatchResult, "tone">

type ColumnKey = ResultKey | "input"

const INPUT_COLUMN = { key: "input", title: "地址", basis: 300, grow: 1 } as const

const RESULT_COLUMNS: {
  key: ResultKey
  title: string
  basis: number
  grow?: number
}[] = [
  { key: "status", title: "狀態", basis: 112 },
  { key: "zipcode", title: "郵遞區號", basis: 96 },
  { key: "zh", title: "中文地址", basis: 260, grow: 1 },
  { key: "zhCity", title: "縣市", basis: 96 },
  { key: "zhArea", title: "鄉鎮市區", basis: 104 },
  { key: "zhRest", title: "詳細地址", basis: 200 },
  { key: "en", title: "英文地址", basis: 380, grow: 1 },
  { key: "line1", title: "Address Line 1", basis: 260 },
  { key: "line2", title: "Address Line 2", basis: 140 },
  { key: "district", title: "District", basis: 140 },
  { key: "city", title: "City", basis: 150 },
]

const RESULT_KEYS = RESULT_COLUMNS.map((column) => column.key)
const DEFAULT_PREFS: ColumnPrefs<ResultKey> = { order: RESULT_KEYS, hidden: [], widths: {} }

const TONE_CLASSES: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
}

const EMPTY_RESULT: BatchResult = {
  tone: null,
  status: "",
  zipcode: "",
  zh: "",
  zhCity: "",
  zhArea: "",
  zhRest: "",
  en: "",
  line1: "",
  line2: "",
  district: "",
  city: "",
}

const MIN_ROWS = 12
const ROW_HEIGHT = 40
const MAX_GRID_HEIGHT = 600

// A row with a full zipcode still waits on the county's doorplates: the
// house it names may not be on the list.
type ResolvedRow = {
  result: BatchResult
  door: { road: string; addressSuffix: string } | null
}

const DOOR_UNLISTED = { tone: "warning", status: "門牌待確認" } as const

function resolveRow(input: string): ResolvedRow {
  const text = input.trim()
  if (!text) return { result: EMPTY_RESULT, door: null }
  const lookup = lookupCleanedAddress(text)
  if (!lookup.road) {
    return {
      result: { ...EMPTY_RESULT, tone: "destructive", status: "無法辨識道路" },
      door: null,
    }
  }

  const { road, addressSuffix, scopeResolution, displayedZipcode } = lookup
  const suffix = addressSuffix.trim()
  const isComplete = displayedZipcode.length === 6
  const parsed = formatAddress(road, addressSuffix, isComplete ? displayedZipcode : "")
  const fields = parsed.enFields
  const place = addressIndex.placeByAddress[road]
  const isStreetUncertain =
    !suffix || !parseAddressSuffix(addressSuffix).complete || parsed.warns.length > 0

  const [tone, status]: [Tone, string] =
    scopeResolution.status === "unmatched"
      ? ["destructive", "找不到門牌範圍"]
      : !isComplete
        ? ["warning", scopeResolution.status === "ambiguous" ? "需補附號或樓層" : "需補門牌"]
        : isStreetUncertain
          ? ["warning", "英文需確認"]
          : ["success", "完成"]

  const result = {
    tone,
    status,
    zipcode: displayedZipcode,
    zh: `${road}${suffix}`,
    zhCity: place?.city || "",
    zhArea: place?.area || "",
    zhRest: place ? `${place.road}${suffix}` : "",
    en: parsed.en,
    line1: fields?.line1 || "",
    line2: fields?.line2 || "",
    district: fields?.district || "",
    city: fields?.city || "",
  }
  return { result, door: isComplete ? { road, addressSuffix } : null }
}

function checkDoor({ result, door }: ResolvedRow): BatchResult {
  if (!door) return result
  const doorplates = peekRoadDoorplates(door.road)
  return findDoor(doorplates, door.addressSuffix) === "missing"
    ? { ...result, ...DOOR_UNLISTED }
    : result
}

// Each input is resolved once per version of the correction tables; editing
// one row leaves the others cached.
const resultCache = new Map<string, ResolvedRow>()
let cachedVersion = -1
function resolveCached(input: string, version: number) {
  if (version !== cachedVersion) {
    resultCache.clear()
    cachedVersion = version
  }
  let result = resultCache.get(input)
  if (!result) {
    result = resolveRow(input)
    resultCache.set(input, result)
  }
  return result
}

// Trailing blank rows are dropped and one empty row is kept, so there is
// always room to type or paste below the last address.
function padInputs(inputs: (string | null)[]) {
  const padded = inputs.map((input) => input ?? "")
  while (padded.length && !padded[padded.length - 1].trim()) padded.pop()
  padded.push("")
  return padded
}

function ResultCell({ rowData, columnData }: CellProps<GridRow, ResultKey>) {
  const value = rowData[columnData]
  return (
    <span
      className={cn(
        "truncate px-2.5",
        columnData === "status" && rowData.tone && TONE_CLASSES[rowData.tone],
      )}
      title={value || undefined}
    >
      {value}
    </span>
  )
}

// Room beside the text: a cell pads 10px a side plus its border.
const CELL_PADDING = 24

let measureContext: CanvasRenderingContext2D | null = null
function measureText(text: string, font: string) {
  measureContext ??= document.createElement("canvas").getContext("2d")
  if (!measureContext) return 0
  measureContext.font = font
  return measureContext.measureText(text).width
}

// Like a spreadsheet's double-click on a column edge: wide enough for the
// title and the longest value, so nothing in the column is cut off.
function fitColumnWidth(grid: HTMLElement, key: ColumnKey, title: string, values: string[]) {
  const style = getComputedStyle(grid)
  const size = key === "input" ? "14px" : style.fontSize
  const font = `${size} ${style.fontFamily}`
  const widest = Math.max(0, ...values.map((value) => measureText(value, font)))
  const header = measureText(title, `12px ${style.fontFamily}`) + CELL_PADDING
  return clampColumnWidth(Math.ceil(Math.max(widest + CELL_PADDING, header)))
}

function ColumnTitle({
  title,
  onResize,
  onAutoFit,
}: {
  title: string
  onResize: (width: number) => void
  onAutoFit: () => void
}) {
  return (
    <span className="flex w-full items-center justify-between gap-1 pl-1.5 text-xs">
      <span className="truncate">{title}</span>
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`調整「${title}」欄寬`}
        className="batch-resize-handle"
        // The grid selects the column on mousedown; resizing must not.
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
          const handle = event.currentTarget
          const cell = handle.closest(".dsg-cell")
          if (!cell) return
          const startWidth = cell.getBoundingClientRect().width
          const startX = event.clientX
          handle.setPointerCapture(event.pointerId)
          handle.dataset.active = ""
          const move = (moveEvent: PointerEvent) =>
            onResize(clampColumnWidth(startWidth + moveEvent.clientX - startX))
          const end = () => {
            delete handle.dataset.active
            handle.removeEventListener("pointermove", move)
            handle.removeEventListener("pointerup", end)
            handle.removeEventListener("pointercancel", end)
          }
          handle.addEventListener("pointermove", move)
          handle.addEventListener("pointerup", end)
          handle.addEventListener("pointercancel", end)
        }}
        onDoubleClick={(event) => {
          event.stopPropagation()
          onAutoFit()
        }}
      />
    </span>
  )
}

function downloadFile(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function exportName(extension: string) {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `批次查詢-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.${extension}`
}

export function BatchLookup() {
  // Always ends with one empty row; the grid is padded to MIN_ROWS for display.
  const correctionsVersion = useSyncExternalStore(
    subscribeCorrections,
    getCorrectionsVersion,
  )
  const roadsVersion = useSyncExternalStore(subscribeLoadedRoads, getLoadedRoadsVersion)
  const [inputs, setInputs] = useState(() => padInputs([]))
  const gridRef = useRef<DataSheetGridRef>(null)
  const [showGuide, setShowGuide] = useState(() => !readGuideDismissed())
  const [prefs, setPrefs] = useState(() => readColumnPrefs(RESULT_KEYS))
  const gridBoxRef = useRef<HTMLDivElement>(null)
  useEffect(() => writeColumnPrefs(prefs), [prefs])
  const resolved = useMemo(
    () =>
      Array.from({ length: Math.max(inputs.length, MIN_ROWS) }, (_, index) => {
        const input = inputs[index] ?? ""
        return { input, row: resolveCached(input, correctionsVersion) }
      }),
    [inputs, correctionsVersion],
  )
  useEffect(() => {
    requestRoadDoorplates(resolved.flatMap(({ row }) => (row.door ? [row.door.road] : [])))
  }, [resolved])
  const rows = useMemo<GridRow[]>(
    () => resolved.map(({ input, row }) => ({ input, ...checkDoor(row) })),
    // roadsVersion stands for the roads checkDoor reads.
    [resolved, roadsVersion],
  )
  // Every row up to the last one with an address, keeping blank rows between.
  const filledRows = useMemo(() => rows.slice(0, inputs.length - 1), [rows, inputs.length])
  const completeCount = filledRows.filter((row) => row.tone === "success").length
  const filledCount = filledRows.filter((row) => row.tone).length

  const visibleColumns = useMemo(() => {
    const byKey = new Map(RESULT_COLUMNS.map((column) => [column.key, column]))
    return prefs.order
      .filter((key) => !prefs.hidden.includes(key))
      .flatMap((key) => byKey.get(key) ?? [])
  }, [prefs.order, prefs.hidden])
  const tableColumns = [INPUT_COLUMN, ...visibleColumns]
  const cellText = (row: GridRow, key: ColumnKey) => row[key] ?? ""

  const columns = useMemo<Column<GridRow>[]>(() => {
    const sizing = ({ key, basis, grow = 0 }: (typeof tableColumns)[number]) => {
      const width = prefs.widths[key]
      return width
        ? { basis: width, grow: 0, shrink: 0, minWidth: width, maxWidth: width }
        : { basis, grow, minWidth: key === "input" ? 220 : basis }
    }
    const title = ({ key, title }: (typeof tableColumns)[number]) => (
      <ColumnTitle
        title={title}
        onResize={(width) =>
          setPrefs((current) => ({ ...current, widths: { ...current.widths, [key]: width } }))
        }
        onAutoFit={() => {
          if (!gridBoxRef.current) return
          const width = fitColumnWidth(
            gridBoxRef.current,
            key,
            title,
            filledRows.map((row) => cellText(row, key)),
          )
          setPrefs((current) => ({ ...current, widths: { ...current.widths, [key]: width } }))
        }}
      />
    )
    return [
      {
        ...keyColumn<GridRow, "input">("input", textColumn),
        title: title(INPUT_COLUMN),
        ...sizing(INPUT_COLUMN),
      },
      ...visibleColumns.map(
        (column): Column<GridRow> => ({
          id: column.key,
          title: title(column),
          ...sizing(column),
          component: ResultCell as Column<GridRow>["component"],
          columnData: column.key,
          disabled: true,
          copyValue: ({ rowData }) => rowData[column.key],
        }),
      ),
    ]
  }, [filledRows, visibleColumns, prefs.widths])

  const tableRows = [
    tableColumns.map((column) => column.title),
    ...filledRows.map((row) => tableColumns.map((column) => cellText(row, column.key))),
  ]
  const isDefaultPrefs = JSON.stringify(prefs) === JSON.stringify(DEFAULT_PREFS)

  async function downloadXlsx() {
    const { toXlsx } = await import("@/utils/xlsx.js")
    const widths = tableColumns.map((column) => prefs.widths[column.key] ?? column.basis)
    downloadFile(
      exportName("xlsx"),
      toXlsx(tableRows, widths) as Uint8Array<ArrayBuffer>,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
  }

  return (
    <section className="flex flex-col gap-3" aria-label="批次查詢">
      {showGuide ? (
        <BatchGuide
          onDismiss={() => {
            writeGuideDismissed(true)
            runViewTransition("guide", () => setShowGuide(false))
          }}
        />
      ) : null}
      <Card className="batch-sheet enter-rise gap-0 py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 py-2 pr-2 pl-(--card-spacing)">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filledCount ? `${completeCount} / ${filledCount} 筆完成` : "貼上地址"}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            {showGuide ? null : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="使用說明"
                onClick={() => {
                  writeGuideDismissed(false)
                  runViewTransition("guide", () => setShowGuide(true))
                }}
              >
                <CircleHelpIcon className="size-[1.125rem]" aria-hidden="true" />
              </Button>
            )}
            <BatchColumnsMenu
              columns={RESULT_COLUMNS}
              order={prefs.order}
              hidden={prefs.hidden}
              isDefault={isDefaultPrefs}
              onOrderChange={(order) => setPrefs((current) => ({ ...current, order }))}
              onHiddenChange={(hidden) => setPrefs((current) => ({ ...current, hidden }))}
              onReset={() => setPrefs(DEFAULT_PREFS)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    className="h-10 gap-1.5 pr-3 pl-3.5 font-semibold text-shadow-[0_1px_2px_oklch(0.4_0.13_48/0.35)] [&_svg]:drop-shadow-[0_1px_2px_oklch(0.4_0.13_48/0.35)]"
                    disabled={!filledCount}
                  />
                }
              >
                <DownloadIcon className="icon-optical size-4 max-sm:hidden" aria-hidden="true" />
                下載
                <ChevronDownIcon className="icon-optical size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto">
                <DropdownMenuItem
                  className="min-h-10 px-3"
                  onClick={() =>
                    downloadFile(exportName("csv"), `\ufeff${toCsv(tableRows)}`, "text/csv;charset=utf-8")
                  }
                >
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-10 px-3" onClick={downloadXlsx}>
                  Excel（.xlsx）
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="batch-grid" ref={gridBoxRef}>
          <DynamicDataSheetGrid<GridRow>
            value={rows}
            onChange={(next) => setInputs(padInputs(next.map((row) => row.input ?? "")))}
            columns={columns}
            createRow={() => ({ input: "", ...EMPTY_RESULT })}
            duplicateRow={({ rowData }) => ({ ...rowData })}
            rowHeight={ROW_HEIGHT}
            headerRowHeight={ROW_HEIGHT}
            height={Math.min(MAX_GRID_HEIGHT, (rows.length + 1) * ROW_HEIGHT + 2)}
            addRowsComponent={false}
            contextMenuComponent={BatchContextMenu}
            ref={gridRef}
            onSelectionChange={({ selection }) => {
              // A header click selects the padding rows too; trim them so a
              // pasted column does not blank the cells below it in Excel.
              const lastRow = filledRows.length - 1
              if (
                selection &&
                lastRow >= 0 &&
                selection.min.row === 0 &&
                selection.max.row === rows.length - 1 &&
                lastRow < selection.max.row
              ) {
                gridRef.current?.setSelection({
                  min: selection.min,
                  max: { col: selection.max.col, row: lastRow },
                })
              }
            }}
          />
        </div>
      </Card>
    </section>
  )
}

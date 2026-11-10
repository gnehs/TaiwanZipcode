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
import { ChevronDownIcon, ClipboardPasteIcon, DownloadIcon } from "lucide-react"

import { BatchColumnsMenu } from "@/components/batch-columns-menu"
import { BatchContextMenu } from "@/components/batch-context-menu"
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
import { useLocale, useText, type Locale } from "@/lib/locale"
import { cn } from "@/lib/utils"
import { clampColumnWidth } from "@/utils/batchColumns.js"
import { toCsv } from "@/utils/batchTable.js"
import { findDoor } from "@/utils/doorplates.js"
import { parseAddressSuffix } from "@/utils/zipcodeScopeMatcher.js"

type Tone = "success" | "warning" | "destructive"

type StatusCode =
  | "unrecognizedRoad"
  | "noRange"
  | "needsSubNumber"
  | "needsHouseNumber"
  | "checkEnglish"
  | "doorUnlisted"
  | "done"

type BatchResult = {
  tone: Tone | null
  status: StatusCode | ""
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

const TEXT = {
  zh: {
    section: "批次查詢",
    input: "地址",
    columns: {
      status: "狀態",
      zipcode: "郵遞區號",
      zh: "中文地址",
      zhCity: "縣市",
      zhArea: "鄉鎮市區",
      zhRest: "詳細地址",
      en: "英文地址",
      line1: "Address Line 1",
      line2: "Address Line 2",
      district: "District",
      city: "City",
    } satisfies Record<ResultKey, string>,
    status: {
      unrecognizedRoad: "無法辨識道路",
      noRange: "找不到門牌範圍",
      needsSubNumber: "需補附號或樓層",
      needsHouseNumber: "需補門牌",
      checkEnglish: "英文需確認",
      doorUnlisted: "門牌待確認",
      done: "完成",
    } satisfies Record<StatusCode, string>,
    progress: (done: number, total: number) => `${done} / ${total} 筆完成`,
    paste: "貼上地址",
    download: "下載",
    resize: (title: string) => `調整「${title}」欄寬`,
    fileName: "批次查詢",
    sheetName: "地址",
  },
  en: {
    section: "Batch lookup",
    input: "Address",
    columns: {
      status: "Status",
      zipcode: "Zip code",
      zh: "Chinese address",
      zhCity: "Chinese city",
      zhArea: "Chinese district",
      zhRest: "Chinese street address",
      en: "English address",
      line1: "Address Line 1",
      line2: "Address Line 2",
      district: "District",
      city: "City",
    } satisfies Record<ResultKey, string>,
    status: {
      unrecognizedRoad: "Road not found",
      noRange: "No matching range",
      needsSubNumber: "Add sub-number or floor",
      needsHouseNumber: "Add house number",
      checkEnglish: "Check English",
      doorUnlisted: "House number unconfirmed",
      done: "Done",
    } satisfies Record<StatusCode, string>,
    progress: (done: number, total: number) => `${done} of ${total} done`,
    paste: "Paste addresses",
    download: "Download",
    resize: (title: string) => `Resize ${title} column`,
    fileName: "batch-lookup",
    sheetName: "Addresses",
  },
}

type Text = (typeof TEXT)[keyof typeof TEXT]

const INPUT_COLUMN = { key: "input", basis: 300, grow: 1 } as const

const RESULT_COLUMNS: {
  key: ResultKey
  title: string
  basis: number
  grow?: number
}[] = [
  { key: "status", title: "", basis: 112 },
  { key: "zipcode", title: "", basis: 96 },
  { key: "zh", title: "", basis: 260, grow: 1 },
  { key: "zhCity", title: "", basis: 96 },
  { key: "zhArea", title: "", basis: 104 },
  { key: "zhRest", title: "", basis: 200 },
  { key: "en", title: "", basis: 380, grow: 1 },
  { key: "line1", title: "", basis: 260 },
  { key: "line2", title: "", basis: 140 },
  { key: "district", title: "", basis: 140 },
  { key: "city", title: "", basis: 150 },
]

const RESULT_KEYS = RESULT_COLUMNS.map((column) => column.key)
// English readers want the English address beside the zipcode, and the
// Chinese one after it for the forms that ask for it.
const DEFAULT_ORDER: Record<Locale, ResultKey[]> = {
  zh: RESULT_KEYS,
  en: ["status", "zipcode", "en", "line1", "line2", "district", "city", "zh", "zhCity", "zhArea", "zhRest"],
}
const defaultPrefs = (locale: Locale): ColumnPrefs<ResultKey> => ({
  order: DEFAULT_ORDER[locale],
  hidden: [],
  widths: {},
})

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

const DOOR_UNLISTED = { tone: "warning", status: "doorUnlisted" } as const

function resolveRow(input: string): ResolvedRow {
  const text = input.trim()
  if (!text) return { result: EMPTY_RESULT, door: null }
  const lookup = lookupCleanedAddress(text)
  if (!lookup.road) {
    return {
      result: { ...EMPTY_RESULT, tone: "destructive", status: "unrecognizedRoad" },
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

  const [tone, status]: [Tone, StatusCode] =
    scopeResolution.status === "unmatched"
      ? ["destructive", "noRange"]
      : !isComplete
        ? ["warning", scopeResolution.status === "ambiguous" ? "needsSubNumber" : "needsHouseNumber"]
        : isStreetUncertain
          ? ["warning", "checkEnglish"]
          : ["success", "done"]

  const result: BatchResult = {
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

function cellText(text: Text, row: GridRow, key: ColumnKey) {
  if (key === "status") return row.status ? text.status[row.status] : ""
  return row[key] ?? ""
}

function ResultCell({ rowData, columnData }: CellProps<GridRow, ResultKey>) {
  const text = useText(TEXT)
  const value = cellText(text, rowData, columnData)
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
  resizeLabel,
  onResize,
  onAutoFit,
}: {
  title: string
  resizeLabel: string
  onResize: (width: number) => void
  onAutoFit: () => void
}) {
  return (
    <span className="flex w-full items-center justify-between gap-1 pl-1.5 text-xs">
      <span className="truncate">{title}</span>
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={resizeLabel}
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

function exportName(base: string, extension: string) {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${base}-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.${extension}`
}

export function BatchLookup() {
  const text = useText(TEXT)
  // Always ends with one empty row; the grid is padded to MIN_ROWS for display.
  const correctionsVersion = useSyncExternalStore(
    subscribeCorrections,
    getCorrectionsVersion,
    getCorrectionsVersion,
  )
  const roadsVersion = useSyncExternalStore(
    subscribeLoadedRoads,
    getLoadedRoadsVersion,
    getLoadedRoadsVersion,
  )
  const [inputs, setInputs] = useState(() => padInputs([]))
  const gridRef = useRef<DataSheetGridRef>(null)
  const locale = useLocale()
  const [prefs, setPrefs] = useState(() => readColumnPrefs(locale, DEFAULT_ORDER[locale]))
  const gridBoxRef = useRef<HTMLDivElement>(null)
  useEffect(() => writeColumnPrefs(locale, prefs), [locale, prefs])
  // The first address cell starts selected, so a paste lands in it.
  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      gridRef.current?.setActiveCell({ col: 0, row: 0 })
  }, [])
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
  const inputColumn = { ...INPUT_COLUMN, title: text.input }
  const resultColumns = useMemo(
    () => visibleColumns.map((column) => ({ ...column, title: text.columns[column.key] })),
    [visibleColumns, text],
  )
  const tableColumns = [inputColumn, ...resultColumns]

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
        resizeLabel={text.resize(title)}
        onResize={(width) =>
          setPrefs((current) => ({ ...current, widths: { ...current.widths, [key]: width } }))
        }
        onAutoFit={() => {
          if (!gridBoxRef.current) return
          const width = fitColumnWidth(
            gridBoxRef.current,
            key,
            title,
            filledRows.map((row) => cellText(text, row, key)),
          )
          setPrefs((current) => ({ ...current, widths: { ...current.widths, [key]: width } }))
        }}
      />
    )
    return [
      {
        ...keyColumn<GridRow, "input">("input", textColumn),
        title: title(inputColumn),
        ...sizing(inputColumn),
      },
      ...resultColumns.map(
        (column): Column<GridRow> => ({
          id: column.key,
          title: title(column),
          ...sizing(column),
          component: ResultCell as Column<GridRow>["component"],
          columnData: column.key,
          disabled: true,
          copyValue: ({ rowData }) => cellText(text, rowData, column.key),
        }),
      ),
    ]
  }, [filledRows, resultColumns, prefs.widths, text])

  const tableRows = [
    tableColumns.map((column) => column.title),
    ...filledRows.map((row) => tableColumns.map((column) => cellText(text, row, column.key))),
  ]
  const isDefaultPrefs = JSON.stringify(prefs) === JSON.stringify(defaultPrefs(locale))

  async function pasteAddresses() {
    try {
      const text = await navigator.clipboard.readText()
      // One address per line; a copied table keeps only its first column.
      setInputs(padInputs(text.split(/\r?\n/u).map((line) => line.split("\t")[0])))
    } catch {
      // Without clipboard access, the keyboard paste still works.
      gridRef.current?.setActiveCell({ col: 0, row: 0 })
    }
  }

  async function downloadXlsx() {
    const { toXlsx } = await import("@/utils/xlsx.js")
    const widths = tableColumns.map((column) => prefs.widths[column.key] ?? column.basis)
    downloadFile(
      exportName(text.fileName, "xlsx"),
      toXlsx(tableRows, widths, text.sheetName) as Uint8Array<ArrayBuffer>,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
  }

  return (
    <section className="flex flex-col gap-3" aria-label={text.section}>
      <Card className="batch-sheet enter-rise gap-0 py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 py-2 pr-2 pl-(--card-spacing)">
          {filledCount ? (
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {text.progress(completeCount, filledCount)}
            </p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="-ml-3 h-10 gap-1.5 px-3"
              onClick={pasteAddresses}
            >
              <ClipboardPasteIcon className="size-4" aria-hidden="true" />
              {text.paste}
            </Button>
          )}
          <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            <BatchColumnsMenu
              columns={RESULT_COLUMNS.map((column) => ({ ...column, title: text.columns[column.key] }))}
              order={prefs.order}
              hidden={prefs.hidden}
              isDefault={isDefaultPrefs}
              onOrderChange={(order) => setPrefs((current) => ({ ...current, order }))}
              onHiddenChange={(hidden) => setPrefs((current) => ({ ...current, hidden }))}
              onReset={() => setPrefs(defaultPrefs(locale))}
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
                <DownloadIcon className="size-4 max-sm:hidden" aria-hidden="true" />
                {text.download}
                <ChevronDownIcon className="size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto">
                <DropdownMenuItem
                  className="min-h-10 px-3"
                  onClick={() =>
                    downloadFile(exportName(text.fileName, "csv"), `\ufeff${toCsv(tableRows)}`, "text/csv;charset=utf-8")
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

import { useMemo, useRef, useState, useSyncExternalStore } from "react"
import {
  DataSheetGrid,
  keyColumn,
  textColumn,
  type CellProps,
  type Column,
  type DataSheetGridRef,
} from "react-datasheet-grid"
import "react-datasheet-grid/dist/style.css"
import { CircleHelpIcon } from "lucide-react"

import { BatchContextMenu } from "@/components/batch-context-menu"
import {
  BatchGuide,
  readGuideDismissed,
  writeGuideDismissed,
} from "@/components/batch-guide"
import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  formatAddress,
  getCorrectionsVersion,
  lookupCleanedAddress,
  subscribeCorrections,
} from "@/lib/addresses"
import { cn } from "@/lib/utils"
import { toTsv } from "@/utils/batchTable.js"
import { parseAddressSuffix } from "@/utils/zipcodeScopeMatcher.js"

type Tone = "success" | "warning" | "destructive"

type BatchResult = {
  tone: Tone | null
  status: string
  zipcode: string
  zh: string
  en: string
  line1: string
  line2: string
  district: string
  city: string
}

// The text column clears a cell to null.
type GridRow = BatchResult & { input: string | null }

type ResultKey = Exclude<keyof BatchResult, "tone">

const RESULT_COLUMNS: {
  key: ResultKey
  title: string
  basis: number
  grow?: number
}[] = [
  { key: "status", title: "狀態", basis: 112 },
  { key: "zipcode", title: "郵遞區號", basis: 96 },
  { key: "zh", title: "中文地址", basis: 260, grow: 1 },
  { key: "en", title: "英文地址", basis: 380, grow: 1 },
  { key: "line1", title: "Address Line 1", basis: 260 },
  { key: "line2", title: "Address Line 2", basis: 140 },
  { key: "district", title: "District", basis: 140 },
  { key: "city", title: "City", basis: 150 },
]

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
  en: "",
  line1: "",
  line2: "",
  district: "",
  city: "",
}

const MIN_ROWS = 12
const ROW_HEIGHT = 40
const MAX_GRID_HEIGHT = 600

function resolveRow(input: string): BatchResult {
  const text = input.trim()
  if (!text) return EMPTY_RESULT
  const lookup = lookupCleanedAddress(text, { bareNumberIsHouse: true })
  if (!lookup.road) {
    return { ...EMPTY_RESULT, tone: "destructive", status: "無法辨識道路" }
  }

  const { road, addressSuffix, scopeResolution, displayedZipcode } = lookup
  const suffix = addressSuffix.trim()
  const isComplete = displayedZipcode.length === 6
  const parsed = formatAddress(road, addressSuffix, isComplete ? displayedZipcode : "")
  const fields = parsed.enFields
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

  return {
    tone,
    status,
    zipcode: displayedZipcode,
    zh: `${road}${suffix}`,
    en: parsed.en,
    line1: fields?.line1 || "",
    line2: fields?.line2 || "",
    district: fields?.district || "",
    city: fields?.city || "",
  }
}

// Each input is resolved once per version of the correction tables; editing
// one row leaves the others cached.
const resultCache = new Map<string, BatchResult>()
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
        columnData === "zipcode" && "font-mono",
      )}
      title={value || undefined}
    >
      {value}
    </span>
  )
}

function ColumnTitle({ title, text }: { title: string; text: string }) {
  return (
    <span className="flex w-full items-center justify-between gap-1 pl-1.5 text-xs">
      <span className="truncate">{title}</span>
      <CopyButton
        text={text}
        label={`複製「${title}」欄`}
        visibleLabel=""
        variant="ghost"
        className="size-7"
      />
    </span>
  )
}

export function BatchLookup() {
  // Always ends with one empty row; the grid is padded to MIN_ROWS for display.
  const correctionsVersion = useSyncExternalStore(
    subscribeCorrections,
    getCorrectionsVersion,
  )
  const [inputs, setInputs] = useState(() => padInputs([]))
  const gridRef = useRef<DataSheetGridRef>(null)
  const [showGuide, setShowGuide] = useState(() => !readGuideDismissed())
  const rows = useMemo<GridRow[]>(
    () =>
      Array.from({ length: Math.max(inputs.length, MIN_ROWS) }, (_, index) => {
        const input = inputs[index] ?? ""
        return { input, ...resolveCached(input, correctionsVersion) }
      }),
    [inputs, correctionsVersion],
  )
  // Every row up to the last one with an address, keeping blank rows between.
  const filledRows = rows.slice(0, inputs.length - 1)
  // The grid keeps the first callback it was given, so read live values here.
  const lastFilledRowRef = useRef(-1)
  const lastRowRef = useRef(-1)
  lastFilledRowRef.current = filledRows.length - 1
  lastRowRef.current = rows.length - 1
  const completeCount = filledRows.filter((row) => row.tone === "success").length
  const filledCount = filledRows.filter((row) => row.tone).length

  const columns = useMemo<Column<GridRow>[]>(
    () => [
      {
        ...keyColumn<GridRow, "input">("input", textColumn),
        title: (
          <ColumnTitle
            title="地址"
            text={toTsv(filledRows.map((row) => [row.input ?? ""]))}
          />
        ),
        basis: 300,
        grow: 1,
        minWidth: 220,
      },
      ...RESULT_COLUMNS.map(
        ({ key, title, basis, grow = 0 }): Column<GridRow> => ({
          id: key,
          title: (
            <ColumnTitle
              title={title}
              text={toTsv(filledRows.map((row) => [row[key]]))}
            />
          ),
          basis,
          grow,
          minWidth: basis,
          component: ResultCell as Column<GridRow>["component"],
          columnData: key,
          disabled: true,
          copyValue: ({ rowData }) => rowData[key],
        }),
      ),
    ],
    [filledRows],
  )

  const tableText = toTsv([
    ["地址", ...RESULT_COLUMNS.map((column) => column.title)],
    ...filledRows.map((row) => [
      row.input ?? "",
      ...RESULT_COLUMNS.map((column) => row[column.key]),
    ]),
  ])

  return (
    <section className="flex flex-col gap-3" aria-label="批次查詢">
      {showGuide ? (
        <BatchGuide
          onDismiss={() => {
            writeGuideDismissed(true)
            setShowGuide(false)
          }}
        />
      ) : null}
      <Card className="enter-rise gap-0 py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 py-2 pr-2 pl-(--card-spacing)">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filledCount ? `${completeCount} / ${filledCount} 筆完成` : "貼上地址"}
          </p>
          <div className="flex items-center gap-2">
            {showGuide ? null : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="使用說明"
                onClick={() => {
                  writeGuideDismissed(false)
                  setShowGuide(true)
                }}
              >
                <CircleHelpIcon className="size-[1.125rem]" aria-hidden="true" />
              </Button>
            )}
            {filledCount ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 px-4"
                onClick={() => setInputs(padInputs([]))}
              >
                清除
              </Button>
            ) : null}
            <CopyButton
              text={filledCount ? tableText : ""}
              label="複製表格"
            />
          </div>
        </div>
        <div className="batch-grid border-t">
          <DataSheetGrid<GridRow>
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
              const lastRow = lastFilledRowRef.current
              if (
                selection &&
                lastRow >= 0 &&
                selection.min.row === 0 &&
                selection.max.row === lastRowRef.current &&
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

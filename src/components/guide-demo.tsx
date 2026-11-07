import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRightIcon, SearchIcon } from "lucide-react"

import {
  addressIndex,
  formatAddress,
  getCorrectionsVersion,
  loadCorrections,
  lookupCleanedAddress,
  subscribeCorrections,
} from "@/lib/addresses"
import { addressSlug, hashOfSlug } from "@/lib/address-path"
import { cn } from "@/lib/utils"

const placeByRoad = new Map(
  addressIndex.places.map((place) => [`${place.city}${place.area}${place.road}`, place]),
)

const TYPE_MS = 110
const HOLD_MS = 2600
const REDUCED_HOLD_MS = 4000

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (listener) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)")
      query.addEventListener("change", listener)
      return () => query.removeEventListener("change", listener)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
}

// Demos only play while on screen, so a long page does not run them all.
function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, inView] as const
}

// The demos read text the way the search does, corrections included.
function useCleanedLookup(text: string) {
  useEffect(() => {
    void loadCorrections()
  }, [])
  useSyncExternalStore(subscribeCorrections, getCorrectionsVersion)
  return lookupCleanedAddress(text)
}

// Types each example a character at a time, holds it, then moves on.
function useTypewriter(examples: string[], playing: boolean) {
  const reduceMotion = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [length, setLength] = useState(0)
  const example = examples[index]
  const shown = reduceMotion ? example.length : length

  useEffect(() => {
    if (!playing) return
    const next = () => {
      setIndex((index + 1) % examples.length)
      setLength(0)
    }
    const timer =
      reduceMotion
        ? window.setTimeout(next, REDUCED_HOLD_MS)
        : length < example.length
          ? window.setTimeout(() => setLength(length + 1), length ? TYPE_MS : HOLD_MS / 4)
          : window.setTimeout(next, HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [playing, reduceMotion, index, length, example, examples.length])

  return { text: example.slice(0, shown), done: shown === example.length }
}

const normalize = (text: string) => text.normalize("NFKC").replaceAll("台", "臺")

type Segment = { text: string; filled: boolean }

// The full address in its parts, each marked when the typed text lacks it:
// those are the parts the lookup filled in or corrected.
function addressSegments(typed: string, road: string, suffix: string): Segment[] {
  const place = placeByRoad.get(road)
  if (!place) return []
  const input = normalize(typed)
  const fullSuffix = formatAddress(road, suffix).zh.slice(road.length)
  return [place.city, place.area, place.road, fullSuffix]
    .filter(Boolean)
    .map((text) => ({ text, filled: !input.includes(text) }))
}

export function TypingDemo({ examples }: { examples: string[] }) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const { text, done } = useTypewriter(examples, inView)
  const { road, addressSuffix, displayedZipcode } = useCleanedLookup(text)
  const segments = addressSegments(text, road, addressSuffix)
  const slug = done ? addressSlug(road, addressSuffix) : null

  return (
    <div ref={ref} className="flex flex-col gap-2 rounded-3xl bg-muted p-2">
      <div aria-hidden="true" className="flex h-12 items-center gap-2.5 rounded-xl bg-card px-3.5 text-base shadow-control">
        <SearchIcon className="icon-optical size-4.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">
          {text}
          <span className="guide-caret ml-px inline-block h-[1.1em] w-0.5 translate-y-[0.15em] bg-primary" />
        </span>
      </div>
      <div aria-hidden="true" className="flex min-h-[4.75rem] items-center gap-4 rounded-xl bg-card px-4 py-3">
        {segments.length ? (
          <>
            <span className="w-[6ch] shrink-0 text-2xl font-bold tracking-tight tabular-nums">
              {displayedZipcode}
            </span>
            <span className="min-w-0 flex-1 text-sm/relaxed">
              {segments.map(({ text, filled }) => (
                <span
                  key={text}
                  className={cn(
                    "transition-colors duration-200",
                    filled && "rounded-sm bg-[color-mix(in_oklab,var(--primary)_16%,var(--card))] font-medium text-primary",
                  )}
                >
                  {text}
                </span>
              ))}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">⋯</span>
        )}
      </div>
      {/* Shown once an example is typed out, to open it in the real search. */}
      <Link
        to="/"
        hash={slug ? hashOfSlug(slug) : undefined}
        tabIndex={slug ? 0 : -1}
        aria-hidden={!slug}
        className={cn(
          "inline-flex min-h-9 items-center gap-1 self-end rounded-full px-3 text-xs font-medium text-muted-foreground outline-none transition-[color,opacity] duration-200 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          !slug && "pointer-events-none opacity-0",
        )}
      >
        開啟這筆查詢
        <ArrowRightIcon className="icon-optical size-3.5" aria-hidden="true" />
      </Link>
    </div>
  )
}

const PASTE_MS = 1400
const FILL_MS = 320
const BATCH_HOLD_MS = 3600

// Pastes a column of messy addresses, then fills in each row's result.
export function BatchDemo({ addresses }: { addresses: string[] }) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const reduceMotion = usePrefersReducedMotion()
  // 0 is empty, 1 pasted, then one step per filled row.
  const [step, setStep] = useState(0)
  const last = addresses.length + 1
  const shown = reduceMotion ? last : step

  useEffect(() => {
    if (!inView || reduceMotion) return
    const delay = step === 0 ? PASTE_MS : step === 1 ? PASTE_MS / 2 : step < last ? FILL_MS : BATCH_HOLD_MS
    const timer = window.setTimeout(() => setStep(step < last ? step + 1 : 0), delay)
    return () => window.clearTimeout(timer)
  }, [inView, reduceMotion, step, last])

  useCleanedLookup("")
  const rows = addresses.map((address) => {
    const { road, addressSuffix, displayedZipcode } = lookupCleanedAddress(address)
    return { address, zipcode: displayedZipcode, zh: formatAddress(road, addressSuffix).zh }
  })

  return (
    <div ref={ref} className="rounded-3xl bg-muted p-2" aria-hidden="true">
      <div className="overflow-hidden rounded-xl bg-card text-xs">
        <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_3.5rem] border-b font-medium text-muted-foreground sm:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)_3.5rem]">
          <span className="px-3 py-2">地址</span>
          <span className="px-3 py-2">郵遞區號</span>
          <span className="px-3 py-2 max-sm:hidden">中文地址</span>
          <span className="px-3 py-2">狀態</span>
        </div>
        {rows.map(({ address, zipcode, zh }, index) => {
          const pasted = shown >= 1
          const filled = shown >= index + 2
          return (
            <div
              key={address}
              className="grid h-9 grid-cols-[minmax(0,1fr)_4.5rem_3.5rem] items-center border-b last:border-b-0 sm:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)_3.5rem]"
            >
              <span
                className={cn(
                  "truncate px-3 transition-opacity duration-200",
                  !pasted && "opacity-0",
                )}
              >
                {address}
              </span>
              {[zipcode, zh].map((value, column) => (
                <span
                  key={column}
                  className={cn(
                    "truncate px-3 transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none",
                    column === 0 ? "font-semibold tabular-nums" : "max-sm:hidden",
                    !filled && "translate-y-1 opacity-0",
                  )}
                >
                  {value}
                </span>
              ))}
              <span
                className={cn(
                  "px-3 font-medium text-success transition-opacity duration-300",
                  !filled && "opacity-0",
                )}
              >
                完成
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

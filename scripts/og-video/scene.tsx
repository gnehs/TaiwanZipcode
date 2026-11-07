// The home page's link preview as a loop: the og.jpg layout, with a flowing
// background and the phone typing addresses the way the guide's demo does.
// Every frame is a pure function of time, so render.mjs can step through it
// with Takumi, which lays out flex boxes only, as the address images do.
import type { CSSProperties, ReactNode } from "react"

import iconSvg from "../../public/icon.svg?raw"
import { addressIndex, formatAddress, loadCorrections, lookupCleanedAddress } from "@/lib/addresses"

// Each address as typed with Zhuyin: a word's keys per character ("_" is the
// first-tone space), then Enter; digits go straight in. 中歷 is the classic
// slip of picking the wrong ㄌㄧˋ.
const INPUTS = [
  "北市:ㄅㄟˇ ㄕˋ|中正區:ㄓㄨㄥ_ ㄓㄥˋ ㄑㄩ_|丹陽:ㄉㄢ_ ㄧㄤˊ|3",
  "冬山鄉:ㄉㄨㄥ_ ㄕㄢ_ ㄒㄧㄤ_|九分路:ㄐㄧㄡˇ ㄈㄣ_ ㄌㄨˋ|8|號:ㄏㄠˋ",
  "桃園市:ㄊㄠˊ ㄩㄢˊ ㄕˋ|中歷區:ㄓㄨㄥ_ ㄌㄧˋ ㄑㄩ_|七和路:ㄑㄧ_ ㄏㄜˊ ㄌㄨˋ|1|號:ㄏㄠˋ",
]
const TYPE_START_S = 0.25
// Every address takes the same time to type, however many keys it needs.
const TYPE_S = 1.5
const HOLD_S = 1
const EXIT_S = 0.35
const TONES = new Set(["ˊ", "ˇ", "ˋ", "˙", "_"])

// The search box after each key: text sent to the search, and the IME's
// underlined composition still waiting for Enter.
type Step = { at: number; committed: string; composing: string }

function stepsFor(input: string) {
  const steps: Step[] = [{ at: 0, committed: "", composing: "" }]
  let at = TYPE_START_S
  let committed = ""
  let key = 0
  // A hand's uneven rhythm, the same on every run.
  const press = (composing: string, pause = 0) => {
    at += pause
    steps.push({ at, committed, composing })
    key += 1
    at += 0.06 + (Math.abs(Math.sin(key * 12.9898 + input.length) * 43758.5453) % 1) * 0.05
  }
  for (const token of input.split("|")) {
    const [word, spelling] = token.split(":")
    if (!spelling) {
      committed += word
      press("", 0.08)
      continue
    }
    let converted = ""
    spelling.split(" ").forEach((keys, index) => {
      let pending = ""
      for (const symbol of keys) {
        if (TONES.has(symbol)) {
          pending = ""
          converted += word[index]
        } else pending += symbol
        press(converted + pending)
      }
    })
    committed += converted
    press("", 0.14)
  }
  const typing = steps[steps.length - 1].at - TYPE_START_S
  return steps.map((step, index) =>
    index ? { ...step, at: TYPE_START_S + ((step.at - TYPE_START_S) / typing) * TYPE_S } : step,
  )
}

const STEPS = INPUTS.map(stepsFor)
const DURATIONS = STEPS.map((steps) => steps[steps.length - 1].at + HOLD_S + EXIT_S)
export const LOOP_S = DURATIONS.reduce((sum, duration) => sum + duration, 0)

const PRIMARY = "oklch(0.66 0.19 50)"
const GOLD = "oklch(0.82 0.17 80)"
const INK = "oklch(0.2 0.006 60)"
const MUTED = "oklch(0.55 0.01 60)"
const ICON = `data:image/svg+xml,${encodeURIComponent(iconSvg)}`

// The typo examples resolve only with the correction tables loaded.
await loadCorrections()

const placeByRoad = new Map(
  addressIndex.places.map((place) => [`${place.city}${place.area}${place.road}`, place]),
)
const normalize = (text: string) => text.normalize("NFKC").replaceAll("台", "臺")

type Screen = {
  digits: string
  place: string
  house: string
  segments: { text: string; filled: boolean }[]
  en: string
}

const EMPTY: Screen = { digits: "", place: "", house: "", segments: [], en: "" }

// What the phone shows once `typed` is in the search box.
function screenFor(typed: string): Screen {
  const { road, addressSuffix, displayedZipcode } = lookupCleanedAddress(typed)
  const place = placeByRoad.get(road)
  if (!place) return EMPTY
  const full = displayedZipcode.length === 6 ? displayedZipcode : ""
  const { zh, en } = formatAddress(road, addressSuffix, full)
  const house = zh.slice(road.length)
  const input = normalize(typed)
  return {
    digits: displayedZipcode,
    place: road,
    house,
    segments: [place.city, place.area, place.road, house]
      .filter(Boolean)
      .map((text) => ({ text, filled: !input.includes(text) })),
    en: full ? en : "",
  }
}

// Half-typed text can match some other road for a moment ("冬山" is 冬山路)
// before it narrows; at video speed that only flickers, so the phone shows a
// step's result only once it is on the way to the final one.
const screensCache = new Map<number, Screen[]>()
function screensOf(index: number) {
  let screens = screensCache.get(index)
  if (screens) return screens
  const steps = STEPS[index]
  const final = screenFor(steps[steps.length - 1].committed)
  screens = steps.map(({ committed }) => {
    const screen = screenFor(committed)
    return screen.place === final.place ? screen : EMPTY
  })
  screensCache.set(index, screens)
  return screens
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))
// Close to the app's --ease-out.
const easeOut = (value: number) => 1 - (1 - clamp(value)) ** 4

// Where the loop stands at time t: the example, how far it is typed, and
// every step's screen so far (to time each change's animation).
function frameAt(t: number) {
  const time = ((t % LOOP_S) + LOOP_S) % LOOP_S
  let index = 0
  let local = time
  while (local >= DURATIONS[index]) local -= DURATIONS[index++]
  const steps = STEPS[index]
  const stamps = steps.map((step) => step.at)
  let typed = 0
  while (typed < steps.length - 1 && stamps[typed + 1] <= local) typed += 1
  const exit = easeOut((local - (DURATIONS[index] - EXIT_S)) / EXIT_S)
  return { time, local, steps, typed, last: steps.length - 1, stamps, screens: screensOf(index), exit }
}
type Frame = ReturnType<typeof frameAt>

type Change = { value: string; previous: string; progress: number }

// A value on screen, the one it replaced, and how far the swap has eased.
function changeOf(frame: Frame, pick: (screen: Screen) => string, duration: number): Change {
  const { screens, typed, stamps, local } = frame
  const value = pick(screens[typed])
  let count = typed
  while (count > 0 && pick(screens[count - 1]) === value) count -= 1
  if (count === 0) return { value, previous: "", progress: 1 }
  return { value, previous: pick(screens[count - 1]), progress: easeOut((local - stamps[count]) / duration) }
}

// The new value rises in as the old one rises out, both softly blurred.
function Swap({ change, distance = 6, render = (value) => value }: { change: Change; distance?: number; render?: (value: string) => ReactNode }) {
  const { value, previous, progress } = change
  const layer = (shown: number, offset: number): CSSProperties => ({
    opacity: shown,
    transform: `translateY(${offset}px)`,
    filter: shown < 1 ? `blur(${(1 - shown) * 4}px)` : undefined,
  })
  return (
    <div style={{ position: "relative" }}>
      <div style={layer(value ? progress : 0, (1 - progress) * distance)}>{render(value) || " "}</div>
      {previous && progress < 1 ? (
        <div style={{ position: "absolute", inset: 0, ...layer(1 - progress, -progress * distance) }}>{render(previous)}</div>
      ) : null}
    </div>
  )
}

// Blobs of the band's colours drifting on closed paths, each a whole number
// of laps per loop, so the last frame meets the first.
const BLOBS = [
  { color: "oklch(0.62 0.21 44)", size: 900, x: 80, y: 20, rx: 160, ry: 90, laps: 1, phase: 0 },
  { color: "oklch(0.84 0.17 82)", size: 760, x: 1000, y: 40, rx: 140, ry: 110, laps: 1, phase: 2.1 },
  { color: "oklch(0.74 0.19 58)", size: 700, x: 520, y: 260, rx: 220, ry: 80, laps: 2, phase: 4.2 },
  { color: "oklch(0.97 0.03 72)", size: 980, x: 760, y: 720, rx: 180, ry: 60, laps: 1, phase: 1.3 },
]

const GRAIN = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/><feComponentTransfer><feFuncA type="discrete" tableValues="0 0 0 0 0 0 0.25 0.4 0.55 0.7"/></feComponentTransfer></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`,
)}`

const PLUS_GRID = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="308" height="220">${Array.from(
    { length: 10 },
    (_, row) =>
      `<path stroke="white" stroke-opacity="${(0.15 * (1 - row / 10)).toFixed(3)}" stroke-width="1.6" stroke-linecap="round" d="${Array.from(
        { length: 14 },
        (_, column) => `M${column * 22 + 11} ${row * 22 + 7.5}v7M${column * 22 + 7.5} ${row * 22 + 11}h7`,
      ).join("")}"/>`,
  ).join("")}</svg>`,
)}`

function Background({ time }: { time: number }) {
  const turn = (time / LOOP_S) * Math.PI * 2
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(to bottom, oklch(0.7 0.18 54), oklch(0.8 0.14 68) 58%, oklch(0.97 0.02 75))" }}>
      {BLOBS.map((blob, index) => {
        const angle = turn * blob.laps + blob.phase
        const x = blob.x + Math.cos(angle) * blob.rx - blob.size / 2
        const y = blob.y + Math.sin(angle) * blob.ry - blob.size / 2
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              width: blob.size,
              height: blob.size,
              borderRadius: "50%",
              background: `radial-gradient(closest-side, ${blob.color}, transparent)`,
              transform: `translate(${x}px, ${y}px)`,
            }}
          />
        )
      })}
      <img src={GRAIN} width={1200} height={630} style={{ position: "absolute", inset: 0, opacity: 0.22 }} />
    </div>
  )
}

function ZipcodeCells({ frame, exit }: { frame: Frame; exit: CSSProperties }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 16 }}>
      {[0, 3].map((start) => (
        <div key={start} style={{ display: "flex", gap: 5 }}>
          {[0, 1, 2].map((offset) => {
            const position = start + offset
            return (
              <div
                key={offset}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 50,
                  overflow: "hidden",
                  borderRadius: 10,
                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.18), 0 4px 10px -4px oklch(0.4 0.13 48 / 0.35)",
                  fontSize: 30,
                  fontWeight: 600,
                  lineHeight: 1,
                  textShadow: "0 1px 2px oklch(0.4 0.13 48 / 0.35)",
                }}
              >
                <div style={exit}>
                  <Swap
                    distance={18}
                    // Each cell starts a beat after the one before, so a new code reads left to right.
                    change={changeOf(frame, (screen) => screen.digits[position] ?? "", 0.45 + position * 0.06)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function SearchText({ frame }: { frame: Frame }) {
  const { steps, typed, last, stamps, local } = frame
  const { committed, composing } = steps[typed]
  const text = committed + composing
  // Solid while typing, then a soft blink.
  const idle = typed < last ? 0 : local - stamps[typed]
  const caret = idle < 0.3 ? 1 : 0.5 + 0.5 * Math.cos(((idle - 0.3) / 1.05) * Math.PI * 2)
  // A character eases in from the step it took its place, so a tone key
  // turning ㄅㄟ into 北 fades the character in where the symbols were.
  const since = (position: number) => {
    let step = typed
    const prefix = text.slice(0, position + 1)
    while (step > 0) {
      const before = steps[step - 1]
      if ((before.committed + before.composing).slice(0, position + 1) !== prefix) break
      step -= 1
    }
    return local - stamps[step]
  }
  // The IME underlines its composition until Enter, as macOS does.
  const underline = (position: number): CSSProperties =>
    position >= committed.length
      ? { boxShadow: `inset 0 -1.5px 0 ${PRIMARY}` }
      : {}
  return (
    <div style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
      {[...text].map((char, position) => {
        const shown = easeOut(since(position) / 0.14)
        return (
          <span key={position} style={{ paddingBottom: 1, ...underline(position) }}>
            <span style={{ display: "inline-block", opacity: shown, transform: `translateY(${(1 - shown) * 3}px)` }}>{char}</span>
          </span>
        )
      })}
      <span style={{ width: 1.5, height: 16, marginLeft: 1, borderRadius: 1, backgroundColor: PRIMARY, opacity: caret }} />
    </div>
  )
}

function Phone({ frame }: { frame: Frame }) {
  const screen = frame.screens[frame.typed]
  const label: CSSProperties = { fontSize: 11, color: MUTED }
  // The whole answer lifts away before the next address is typed.
  const exit: CSSProperties = {
    opacity: 1 - frame.exit,
    transform: `translateY(${-frame.exit * 6}px)`,
    filter: frame.exit ? `blur(${frame.exit * 4}px)` : undefined,
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 722,
        top: 160,
        width: 340,
        height: 560,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        padding: "14px 18px",
        borderRadius: 56,
        border: "9px solid rgba(255, 255, 255, 0.92)",
        backgroundColor: "oklch(0.985 0.004 60)",
        boxShadow: "0 0 0 1px oklch(0.5 0.1 50 / 0.12), 0 30px 60px -20px oklch(0.45 0.14 50 / 0.45)",
        overflow: "hidden",
        color: INK,
      }}
    >
      <div style={{ position: "relative", height: 48, margin: "-14px -18px 0", fontSize: 14, fontWeight: 600 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 104, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>9:41</div>
        <div style={{ position: "absolute", top: 9, left: 111, width: 100, height: 30, borderRadius: 15, backgroundColor: "#111" }} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginTop: 14,
          height: 36,
          padding: "0 14px",
          borderRadius: 18,
          backgroundColor: "white",
          boxShadow: "0 0 0 1px oklch(0.2 0.02 60 / 0.07), 0 2px 6px -2px oklch(0.2 0.02 60 / 0.08)",
          fontSize: 13.5,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.01 60)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <div style={exit}>
          <SearchText frame={frame} />
        </div>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          marginTop: 14,
          padding: "18px 18px 20px",
          borderRadius: 22,
          overflow: "hidden",
          color: "white",
          backgroundImage: `linear-gradient(to bottom, color-mix(in oklab, ${PRIMARY}, ${GOLD} 35%), color-mix(in oklab, ${PRIMARY}, black 4%))`,
          boxShadow: "inset 0 0 14px rgba(255, 255, 255, 0.16), 0 0 0 1px oklch(0.58 0.18 46), 0 10px 20px -8px oklch(0.55 0.17 52 / 0.5)",
        }}
      >
        <img src={PLUS_GRID} width={308} height={220} style={{ position: "absolute", left: 0, top: 0 }} />
        <div style={{ position: "relative", ...exit }}>
          {/* Fixed line heights, so an empty card is as tall as a full one. */}
          <div style={{ height: 24, fontSize: 17, lineHeight: "24px", fontWeight: 600, whiteSpace: "nowrap" }}>
            <Swap change={changeOf(frame, (s) => s.place, 0.5)} />
          </div>
          <div style={{ height: 18, marginTop: 2, fontSize: 13, lineHeight: "18px", color: "rgba(255, 255, 255, 0.78)" }}>
            <Swap change={changeOf(frame, (s) => s.house, 0.45)} />
          </div>
        </div>
        {/* The cells stay put; only their digits leave with the answer. */}
        <ZipcodeCells frame={frame} exit={exit} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16, padding: "0 4px", ...exit }}>
        <div style={{ opacity: easeOut(changeOf(frame, (s) => (s.place ? "on" : ""), 0.4).progress) * (screen.place ? 1 : 0) }}>
          <div style={label}>中文地址</div>
          <div style={{ marginTop: 3, fontSize: 13.5, lineHeight: 1.5 }}>
            {[0, 1, 2, 3].map((index) => {
              const segment = screen.segments[index]
              if (!segment) return null
              const shown = changeOf(frame, (s) => s.segments[index]?.text ?? "", 0.4).progress
              return (
                <span
                  key={index}
                  style={{
                    display: "inline-block",
                    opacity: shown,
                    filter: shown < 1 ? `blur(${(1 - shown) * 3}px)` : undefined,
                    ...(segment.filled && {
                      borderRadius: 4,
                      backgroundColor: `color-mix(in oklab, ${PRIMARY} 16%, white)`,
                      color: PRIMARY,
                      fontWeight: 500,
                    }),
                  }}
                >
                  {segment.text}
                </span>
              )
            })}
          </div>
        </div>
        <div>
          <div style={{ ...label, opacity: changeOf(frame, (s) => (s.en ? "on" : ""), 0.4).progress * (screen.en ? 1 : 0) }}>英文地址</div>
          <div style={{ marginTop: 3, fontSize: 13.5, lineHeight: 1.35 }}>
            <Swap change={changeOf(frame, (s) => s.en, 0.5)} distance={4} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function Scene({ time }: { time: number }) {
  const frame = frameAt(time)
  return (
    <div style={{ position: "relative", width: 1200, height: 630, overflow: "hidden", fontFamily: "Geist, Noto Sans TC", color: "white" }}>
      <Background time={frame.time} />
      <div style={{ position: "absolute", left: 88, top: 160, display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 700 }}>
        <img src={ICON} width={60} height={60} />
        閃電地址
      </div>
      <div style={{ position: "absolute", left: 85, top: 252, fontSize: 80, fontWeight: 700, lineHeight: 1.22, letterSpacing: "-0.01em" }}>
        <div>填表不卡關，</div>
        <div style={{ color: "rgba(255, 255, 255, 0.62)" }}>地址閃電查。</div>
      </div>
      <Phone frame={frame} />
    </div>
  )
}


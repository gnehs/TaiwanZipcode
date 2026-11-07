// The home page's link preview as a loop: the og.jpg layout, with a flowing
// background and the phone typing addresses the way the guide's demo does.
// Every frame is a pure function of time, so capture.mjs can step through it.
import { useState, type CSSProperties } from "react"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"

import "@/index.css"
import iconSvg from "../../public/icon.svg?raw"
import { addressIndex, formatAddress, loadCorrections, lookupCleanedAddress } from "@/lib/addresses"

const EXAMPLES = ["北市中正區丹陽3", "冬山鄉九分路8號", "桃園市中歷區七和路1號"]
const EXAMPLE_S = 4
export const LOOP_S = EXAMPLES.length * EXAMPLE_S
const TYPE_START_S = 0.35
const TYPE_S = 0.11
const CLEAR_S = 0.3

const PRIMARY = "oklch(0.66 0.19 50)"
const GOLD = "oklch(0.82 0.17 80)"
const INK = "oklch(0.2 0.006 60)"
const MUTED = "oklch(0.55 0.01 60)"
const ICON = `data:image/svg+xml,${encodeURIComponent(iconSvg)}`

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

// What the phone shows once `typed` is in the search box.
function screenFor(typed: string): Screen {
  const { road, addressSuffix, displayedZipcode } = lookupCleanedAddress(typed)
  const place = placeByRoad.get(road)
  if (!place) return { digits: "", place: "", house: "", segments: [], en: "" }
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

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const easeOut = (value: number) => 1 - (1 - clamp(value)) ** 3

// Where the loop stands at time t: the example, how much of it is typed, and
// the screen after each keystroke so far (to time each change's animation).
function frameAt(t: number) {
  const time = ((t % LOOP_S) + LOOP_S) % LOOP_S
  const index = Math.floor(time / EXAMPLE_S)
  const local = time - index * EXAMPLE_S
  const example = EXAMPLES[index]
  const typed = Math.max(0, Math.min(example.length, Math.floor((local - TYPE_START_S) / TYPE_S) + 1))
  const keystrokeAt = (count: number) => (count === 0 ? 0 : TYPE_START_S + (count - 1) * TYPE_S)
  const screens = Array.from({ length: typed + 1 }, (_, count) => screenFor(example.slice(0, count)))
  const fadeOut = clamp((local - (EXAMPLE_S - CLEAR_S)) / CLEAR_S)
  return { time, local, example, typed, keystrokeAt, screens, fadeOut }
}

// Seconds since the screen last changed `pick`, so new values can ease in.
function sinceChange(frame: ReturnType<typeof frameAt>, pick: (screen: Screen) => string) {
  const { screens, typed, keystrokeAt, local } = frame
  const current = pick(screens[typed])
  let count = typed
  while (count > 0 && pick(screens[count - 1]) === current) count -= 1
  return local - keystrokeAt(count)
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

function ZipcodeCells({ frame }: { frame: ReturnType<typeof frameAt> }) {
  const digits = frame.screens[frame.typed].digits
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 16 }}>
      {[0, 3].map((start) => (
        <div key={start} style={{ display: "flex", gap: 5 }}>
          {[0, 1, 2].map((offset) => {
            const position = start + offset
            const digit = digits[position] ?? ""
            const enter = easeOut(sinceChange(frame, (screen) => screen.digits[position] ?? "") / 0.28)
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
                <span style={{ opacity: digit ? enter : 0, transform: `translateY(${(1 - enter) * 14}px)`, filter: `blur(${(1 - enter) * 3}px)` }}>
                  {digit}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Phone({ frame }: { frame: ReturnType<typeof frameAt> }) {
  const screen = frame.screens[frame.typed]
  const typing = frame.typed < frame.example.length
  const caretOn = typing || Math.floor(frame.time / 0.5) % 2 === 0
  const shown = 1 - frame.fadeOut
  const cardIn = easeOut(sinceChange(frame, (s) => s.place) / 0.3)
  const rowsIn = easeOut(sinceChange(frame, (s) => (s.en ? "en" : "")) / 0.35)
  const label: CSSProperties = { fontSize: 11, color: MUTED }

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
        <div style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap", opacity: shown }}>
          {frame.example.slice(0, frame.typed)}
          <span style={{ width: 1.5, height: 16, marginLeft: 1, backgroundColor: PRIMARY, opacity: caretOn ? 1 : 0 }} />
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
        <div style={{ position: "relative", height: 44, opacity: (screen.place ? cardIn : 0) * shown }}>
          <div style={{ fontSize: 17, fontWeight: 600, whiteSpace: "nowrap" }}>{screen.place}</div>
          <div style={{ marginTop: 2, fontSize: 13, color: "rgba(255, 255, 255, 0.78)" }}>{screen.house}</div>
        </div>
        <div style={{ position: "relative", opacity: shown }}>
          <ZipcodeCells frame={frame} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16, padding: "0 4px", opacity: shown }}>
        <div style={{ opacity: screen.segments.length ? 1 : 0 }}>
          <div style={label}>中文地址</div>
          <div style={{ marginTop: 3, fontSize: 13.5, lineHeight: 1.5 }}>
            {screen.segments.map(({ text, filled }) => (
              <span
                key={text}
                style={
                  filled
                    ? {
                        borderRadius: 4,
                        backgroundColor: `color-mix(in oklab, ${PRIMARY} 16%, white)`,
                        color: PRIMARY,
                        fontWeight: 500,
                      }
                    : undefined
                }
              >
                {text}
              </span>
            ))}
          </div>
        </div>
        <div style={{ opacity: screen.en ? rowsIn : 0, transform: `translateY(${(1 - rowsIn) * 6}px)` }}>
          <div style={label}>英文地址</div>
          <div style={{ marginTop: 3, fontSize: 13.5, lineHeight: 1.35 }}>{screen.en}</div>
        </div>
      </div>
    </div>
  )
}

function Scene({ time }: { time: number }) {
  const frame = frameAt(time)
  return (
    <div style={{ position: "relative", width: 1200, height: 630, overflow: "hidden", fontFamily: "var(--font-sans)", color: "white" }}>
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

let setTime: (time: number) => void = () => {}
function App() {
  const [time, update] = useState(0)
  setTime = update
  return <Scene time={time} />
}

declare global {
  interface Window {
    ogReady: Promise<number>
    ogRender: (time: number) => void
  }
}

createRoot(document.getElementById("root")!).render(<App />)
window.ogRender = (time) => flushSync(() => setTime(time))

// Ready once the corrections load and every glyph the loop shows has a font.
window.ogReady = loadCorrections().then(async () => {
  for (let time = 0; time < LOOP_S; time += 0.1) window.ogRender(time)
  await document.fonts.ready
  window.ogRender(0)
  return LOOP_S
})

// Opened by hand (no ?capture), it simply plays.
if (!location.search.includes("capture")) {
  void window.ogReady.then(() => {
    const start = performance.now()
    const tick = () => {
      window.ogRender((performance.now() - start) / 1000)
      requestAnimationFrame(tick)
    }
    tick()
  })
}

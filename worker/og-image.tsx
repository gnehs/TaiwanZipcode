import { googleFonts } from "takumi-js/helpers"
import { ImageResponse } from "takumi-js/response"

import iconSvg from "../public/icon.svg?raw"
import { addressIndex, formatAddress, type AddressLookup } from "@/lib/addresses"
import type { Locale } from "@/lib/locale"
import { SITE_TITLE } from "@/lib/site"

// What the phone in the image shows: the app's result card for one address.
type PhoneScreen = {
  query: string
  place: string
  house: string
  digits: string
  rows: { label: string; value: string }[]
}

function phoneScreen(lookup: AddressLookup, locale: Locale): PhoneScreen {
  const { road, addressSuffix, displayedZipcode } = lookup
  const house = addressSuffix.trim()
  const fullZipcode = displayedZipcode.length === 6 ? displayedZipcode : ""
  const { en, enFields } = formatAddress(road, house, fullZipcode)
  const chinese = { label: locale === "en" ? "In Chinese" : "中文地址", value: `${fullZipcode} ${road}${house}`.trim() }
  const english = en ? [{ label: locale === "en" ? "In English" : "英文地址", value: en }] : []
  if (locale === "en" && enFields) {
    const place = addressIndex.englishByAddress[road]
    return {
      query: en,
      place: `${place.road}, ${place.district}`,
      house: enFields.line1.slice(0, -place.road.length).replace(/,\s*$/, ""),
      digits: displayedZipcode,
      rows: [...english, chinese],
    }
  }
  return {
    query: `${road}${house}`,
    place: road,
    house,
    digits: displayedZipcode,
    rows: [chinese, ...english],
  }
}

const HEADLINE: Record<Locale, { lines: [string, string]; size: number }> = {
  zh: { lines: ["填表不卡關，", "地址閃電查。"], size: 80 },
  en: { lines: ["Taiwan zip codes,", "in a flash."], size: 64 },
}

const PRIMARY = "oklch(0.66 0.19 50)"
const GOLD = "oklch(0.82 0.17 80)"
const INK = "oklch(0.2 0.006 60)"
const ICON = `data:image/svg+xml,${encodeURIComponent(iconSvg)}`
// The card's "+" texture, fading toward the bottom like the app's plus-grid.
// Each row carries its own opacity, since the renderer ignores SVG masks.
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

// Soft light speckles over the background, like the app's grain on orange.
const GRAIN = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/><feComponentTransfer><feFuncA type="discrete" tableValues="0 0 0 0 0 0 0.25 0.4 0.55 0.7"/></feComponentTransfer></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`,
)}`

// Fetched on the first request (Workers allow no I/O at startup) and kept for
// the isolate; a render downloads only the subsets its text uses.
let fonts: ReturnType<typeof googleFonts> | undefined

function ZipcodeCells({ digits }: { digits: string }) {
  const group = (start: number) => (
    <div style={{ display: "flex", gap: 5 }}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 50,
            borderRadius: 10,
            backgroundColor: "rgba(255, 255, 255, 0.16)",
            boxShadow:
              "inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.18), 0 4px 10px -4px oklch(0.4 0.13 48 / 0.35)",
            fontSize: 30,
            fontWeight: 600,
            textShadow: "0 1px 2px oklch(0.4 0.13 48 / 0.35)",
          }}
        >
          {digits[start + index] ?? ""}
        </div>
      ))}
    </div>
  )
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 16 }}>
      {group(0)}
      <div style={{ fontSize: 20, fontWeight: 700 }}>+</div>
      {group(3)}
    </div>
  )
}

// A 402pt-wide iPhone screen scaled onto the mockup's 322px one: the island
// sits 11pt from the top, the time centres 65pt from the left edge, the
// right-hand icons 75pt from the right, and both share the line 32pt down.
function StatusBar() {
  const slot = { position: "absolute", top: 0, height: 52, display: "flex", alignItems: "center", justifyContent: "center" } as const
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        height: 48,
        margin: "-14px -18px 0",
        fontSize: 14,
        fontWeight: 600,
        color: INK,
      }}
    >
      <div style={{ ...slot, left: 0, width: 104 }}>9:41</div>
      <div style={{ position: "absolute", top: 9, left: 111, width: 100, height: 30, borderRadius: 15, backgroundColor: "#111" }} />
      <div style={{ ...slot, right: 0, width: 120, gap: 5 }}>
        <svg width="15" height="10" viewBox="0 0 18 12" fill={INK}>
          <rect x="0" y="7.5" width="3.3" height="4.5" rx="1.65" />
          <rect x="4.9" y="5" width="3.3" height="7" rx="1.65" />
          <rect x="9.8" y="2.5" width="3.3" height="9.5" rx="1.65" />
          <rect x="14.7" y="0" width="3.3" height="12" rx="1.65" />
        </svg>
        <svg width="14" height="10" viewBox="0 0 17 12" fill="none" stroke={INK} stroke-linecap="round" stroke-linejoin="round">
          <path d="M1.61 3.85a10.3 10.3 0 0 1 13.78 0" stroke-width="2.4" />
          <path d="M4.22 6.74a6.4 6.4 0 0 1 8.56 0" stroke-width="2.6" />
          <path d="M8.5 11.5 6.24 9.24a3.2 3.2 0 0 1 4.52 0Z" fill={INK} stroke-width="1" />
        </svg>
        <div style={{ position: "relative", display: "flex" }}>
          <svg width="22" height="10" viewBox="0 0 29 13">
            <rect width="26" height="13" rx="4" fill={INK} fill-opacity="0.38" />
            <path d="M4 0H20V13H4A4 4 0 0 1 0 9V4A4 4 0 0 1 4 0Z" fill={INK} />
            <path d="M27 4.3v4.4c.9-.3 1.5-1.2 1.5-2.2s-.6-1.9-1.5-2.2Z" fill={INK} fill-opacity="0.38" />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: "0 2px 0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              fontWeight: 700,
              color: "white",
            }}
          >
            80
          </div>
        </div>
      </div>
    </div>
  )
}

const BAND = [
  "radial-gradient(70% 90% at 0% 0%, oklch(0.64 0.2 46) 0%, transparent 70%)",
  "radial-gradient(60% 70% at 85% 10%, oklch(0.82 0.17 80) 0%, transparent 70%)",
  "radial-gradient(80% 60% at 70% 100%, oklch(0.97 0.03 70) 0%, transparent 70%)",
  "linear-gradient(to bottom, oklch(0.7 0.18 54) 0%, oklch(0.8 0.14 68) 58%, oklch(0.97 0.02 75) 100%)",
].join(", ")

function OgImage({ screen, locale }: { screen: PhoneScreen; locale: Locale }) {
  const headline = HEADLINE[locale]
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        fontFamily: "Geist, Noto Sans TC",
        backgroundImage: BAND,
      }}
    >
      <img src={GRAIN} width={1200} height={630} style={{ position: "absolute", inset: 0, opacity: 0.22 }} />
      <div
        style={{
          position: "absolute",
          // The glyphs' own side bearing (~3px at 80px) puts their ink on the icon's edge.
          left: 85,
          top: 252,
          display: "flex",
          flexDirection: "column",
          fontSize: headline.size,
          fontWeight: 700,
          lineHeight: 1.22,
          letterSpacing: "-0.01em",
        }}
      >
        <div style={{ color: "white" }}>{headline.lines[0]}</div>
        <div style={{ color: "rgba(255, 255, 255, 0.62)" }}>{headline.lines[1]}</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 88,
          top: 160,
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "white",
          fontSize: 30,
          fontWeight: 700,
        }}
      >
        <img src={ICON} width={60} height={60} />
        {SITE_TITLE[locale]}
      </div>

      <div
        style={{
          position: "absolute",
          left: 722,
          top: 160,
          width: 340,
          height: 560,
          display: "flex",
          flexDirection: "column",
          padding: "14px 18px",
          borderRadius: 56,
          border: "9px solid rgba(255, 255, 255, 0.92)",
          backgroundColor: "oklch(0.985 0.004 60)",
          boxShadow: "0 0 0 1px oklch(0.5 0.1 50 / 0.12), 0 30px 60px -20px oklch(0.45 0.14 50 / 0.45)",
          overflow: "hidden",
        }}
      >
        <StatusBar />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 14,
            height: 36,
            padding: "0 16px",
            borderRadius: 18,
            backgroundColor: "white",
            boxShadow: "0 0 0 1px oklch(0.2 0.02 60 / 0.07), 0 2px 6px -2px oklch(0.2 0.02 60 / 0.08)",
            fontSize: 13,
            color: "oklch(0.45 0.01 60)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.01 60)" stroke-width="2.5" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{screen.query}</div>
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
          <div style={{ fontSize: 17, fontWeight: 600 }}>{screen.place}</div>
          {screen.house ? (
            <div style={{ marginTop: 2, fontSize: 13, color: "rgba(255, 255, 255, 0.75)" }}>{screen.house}</div>
          ) : null}
          <ZipcodeCells digits={screen.digits} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16, padding: "0 4px" }}>
          {screen.rows.map((row) => (
            <div key={row.label} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 11, color: "oklch(0.55 0.01 60)" }}>{row.label}</div>
              <div style={{ marginTop: 2, fontSize: 13.5, lineHeight: 1.35, color: INK }}>{row.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export async function ogImageResponse(lookup: AddressLookup, locale: Locale) {
  return new ImageResponse(<OgImage screen={phoneScreen(lookup, locale)} locale={locale} />, {
    // The 1200×630 card at 1.5×, sharp on high-density screens without
    // the weight of 2×.
    width: 1800,
    height: 945,
    devicePixelRatio: 1.5,
    format: "jpeg",
    quality: 85,
    fonts: await (fonts ??= googleFonts([{ name: "Noto Sans TC", weight: "100..900" }])),
    headers: { "Cache-Control": "public, max-age=86400" },
  })
}

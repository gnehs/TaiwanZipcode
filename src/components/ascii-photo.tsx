import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

// Brighter cells get denser glyphs; the darkest stay bare photo.
const RAMP = "   .:+xX08S$"
const CELL_WIDTH = 8
const CELL_HEIGHT = 12

// A fixed pseudo-random number in [0, 1) per cell and stream, so every redraw
// scatters the glyphs the same way.
function cellNoise(column: number, row: number, stream: number) {
  const value = Math.sin(column * 12.9898 + row * 78.233 + stream * 37.719) * 43758.5453
  return value - Math.floor(value)
}
// Blur radius (CSS px) and how far down it reaches, as a share of the blurred
// edge. Weaker blurs reach further, so the blur builds towards the top.
const BLUR_STEPS = [
  [1, 1],
  [2, 0.8],
  [4, 0.6],
  [8, 0.42],
  [16, 0.26],
] as const

// Blurs the canvas's top `reach` device pixels, strongest at the edge. Every
// step blurs the same untouched copy, and its mask fades out over its lower
// half, so the steps blend without visible bands.
function blurTopEdge(canvas: HTMLCanvasElement, reach: number, ratio: number) {
  const context = canvas.getContext("2d")
  if (!context) return
  // Room above the edge, filled with its top row, so the blur does not pull
  // in transparency there.
  const pad = Math.ceil(BLUR_STEPS.at(-1)![0] * ratio * 3)
  const source = document.createElement("canvas")
  source.width = canvas.width
  source.height = reach + pad * 2
  const sourceContext = source.getContext("2d")
  const layer = document.createElement("canvas")
  layer.width = source.width
  layer.height = source.height
  const layerContext = layer.getContext("2d")
  if (!sourceContext || !layerContext) return
  sourceContext.drawImage(canvas, 0, 0, canvas.width, 1, 0, 0, canvas.width, pad)
  sourceContext.drawImage(canvas, 0, 0, canvas.width, reach + pad, 0, pad, canvas.width, reach + pad)

  context.setTransform(1, 0, 0, 1, 0, 0)
  for (const [radius, share] of BLUR_STEPS) {
    const end = reach * share
    layerContext.globalCompositeOperation = "copy"
    layerContext.filter = `blur(${radius * ratio}px)`
    layerContext.drawImage(source, 0, 0)
    layerContext.filter = "none"
    layerContext.globalCompositeOperation = "destination-in"
    const mask = layerContext.createLinearGradient(0, pad, 0, pad + end)
    mask.addColorStop(0, "black")
    mask.addColorStop(0.5, "black")
    mask.addColorStop(1, "transparent")
    layerContext.fillStyle = mask
    layerContext.fillRect(0, 0, layer.width, layer.height)
    context.drawImage(layer, 0, pad, layer.width, reach, 0, 0, layer.width, reach)
  }
}

// A photo cropped to cover its box, with ASCII glyphs traced over its light
// parts. Given `text`, the glyphs spell it out row by row instead, still only
// where the photo is light. The canvas's CSS `color` washes the photo under
// the glyphs. Given `blurTop`, its top that many CSS pixels fade into blur.
// `focus` is the point of the photo, as shares of its width and height, that
// the crop keeps as near its middle as the photo allows.
type AsciiPhotoProps = {
  src: string
  focus?: Focus
  text?: string
  blurTop?: number
  className?: string
}

export type Focus = readonly [x: number, y: number]
const CENTER: Focus = [0.5, 0.5]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

// The photo and its glyphs, drawn once at a width. It covers more height than
// the canvas shows, so the band growing or shrinking only re-crops it.
type Rendering = {
  bitmap: HTMLCanvasElement
  width: number
  scale: number
  // CSS pixels of photo it holds, centred on the focus where the photo allows.
  height: number
  // Where the focus falls in it, in CSS pixels from its top.
  focusTop: number
  ratio: number
}

function renderPhoto(
  image: HTMLImageElement,
  width: number,
  height: number,
  ratio: number,
  color: string,
  text: string | undefined,
  [focusX, focusY]: Focus,
): Rendering | null {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  // Room for the band to grow to twice its height before drawing again.
  const renderHeight = Math.min(drawHeight, height * 2)
  const left = clamp(width / 2 - focusX * drawWidth, width - drawWidth, 0)
  const top = clamp(renderHeight / 2 - focusY * drawHeight, renderHeight - drawHeight, 0)

  const bitmap = document.createElement("canvas")
  bitmap.width = Math.round(width * ratio)
  bitmap.height = Math.round(renderHeight * ratio)
  const context = bitmap.getContext("2d")
  if (!context) return null
  context.scale(ratio, ratio)
  context.drawImage(image, left, top, drawWidth, drawHeight)
  context.fillStyle = color
  context.fillRect(0, 0, width, renderHeight)

  // Shrinking the photo to one pixel per cell averages each cell's colour.
  const columns = Math.ceil(width / CELL_WIDTH)
  const rows = Math.ceil(renderHeight / CELL_HEIGHT)
  const sampler = document.createElement("canvas")
  sampler.width = columns
  sampler.height = rows
  const sample = sampler.getContext("2d", { willReadFrequently: true })
  if (!sample) return null
  sample.drawImage(
    image,
    left / CELL_WIDTH,
    top / CELL_HEIGHT,
    drawWidth / CELL_WIDTH,
    drawHeight / CELL_HEIGHT,
  )
  const pixels = sample.getImageData(0, 0, columns, rows).data

  context.font = `600 ${CELL_HEIGHT - 1}px ui-monospace, "SF Mono", Menlo, monospace`
  context.textAlign = "center"
  context.textBaseline = "middle"
  for (let row = 0; row < rows; row++) {
    // Each row picks up the text somewhere else, so the words never stack
    // into columns; skipped cells still use up a letter, keeping words whole.
    const textOffset = text ? Math.floor(cellNoise(0, row, 1) * text.length) : 0
    for (let column = 0; column < columns; column++) {
      const index = (row * columns + column) * 4
      const red = pixels[index]
      const green = pixels[index + 1]
      const blue = pixels[index + 2]
      const light = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
      // A fixed per-cell jitter mixes neighbouring glyphs, so flat sky
      // reads as scattered text rather than one repeated character.
      const jitter = (cellNoise(column, row, 0) * 2 - 1) * 1.6
      const level = Math.floor(light * RAMP.length + jitter)
      const shade = RAMP[Math.max(0, Math.min(RAMP.length - 1, level))]
      if (shade === " " || cellNoise(column, row, 2) < 0.15) continue
      const glyph = text ? text[(textOffset + column) % text.length] : shade
      // Glyphs carry the colour under them, lifted halfway to white, each a
      // little brighter or fainter than its neighbours.
      const alpha = (light - 0.2) * 0.35 * (0.5 + cellNoise(column, row, 3) * 0.9)
      context.fillStyle = `rgb(${(red + 255) / 2} ${(green + 255) / 2} ${(blue + 255) / 2} / ${alpha})`
      context.fillText(
        glyph,
        column * CELL_WIDTH + CELL_WIDTH / 2,
        row * CELL_HEIGHT + CELL_HEIGHT / 2,
      )
    }
  }
  return { bitmap, width, scale, height: renderHeight, focusTop: top + focusY * drawHeight, ratio }
}

function AsciiCanvas({ src, focus = CENTER, text, blurTop, className }: AsciiPhotoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawn, setIsDrawn] = useState(false)
  // Read when drawing, so a new blur reach re-crops instead of redrawing glyphs.
  const blurTopRef = useRef(blurTop)
  const redrawRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const image = new Image()
    image.src = src
    let isCancelled = false
    let rendering: Rendering | null = null

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return
      const ratio = window.devicePixelRatio || 1
      const scale = Math.max(width / image.width, height / image.height)
      if (
        !rendering ||
        rendering.width !== width ||
        rendering.ratio !== ratio ||
        rendering.scale !== scale ||
        rendering.height < height
      ) {
        rendering = renderPhoto(image, width, height, ratio, getComputedStyle(canvas).color, text, focus)
        if (!rendering) return
      }

      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      const context = canvas.getContext("2d")
      if (!context) return
      // The focus as near the middle as the rendering reaches.
      const offset = Math.round(
        clamp(rendering.focusTop - height / 2, 0, rendering.height - height) * ratio,
      )
      context.drawImage(rendering.bitmap, 0, -offset)
      const reach = blurTopRef.current
      if (reach) blurTopEdge(canvas, Math.round(reach * ratio), ratio)
      setIsDrawn(true)
    }
    redrawRef.current = draw

    const observer = new ResizeObserver(() => {
      if (image.complete && image.naturalWidth) draw()
    })
    void image.decode().then(
      () => {
        if (isCancelled) return
        draw()
        observer.observe(canvas)
      },
      () => {},
    )
    return () => {
      isCancelled = true
      redrawRef.current = null
      observer.disconnect()
    }
  }, [src, focus, text])

  useEffect(() => {
    if (blurTopRef.current === blurTop) return
    blurTopRef.current = blurTop
    redrawRef.current?.()
  }, [blurTop])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        "text-[rgb(24_12_4/0.55)] transition-opacity duration-700 ease-out motion-reduce:transition-none",
        isDrawn ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  )
}

// A new photo fades in over the one it replaces, which stays drawn beneath so
// the change never shows the background between them.
// The outgoing photo keeps the text it was drawn with: it is fading away, and
// spelling the new address on it would mean drawing all its glyphs again.
export function AsciiPhoto(props: AsciiPhotoProps) {
  const [layers, setLayers] = useState([{ src: props.src, focus: props.focus, text: props.text }])
  const current = layers.at(-1)!
  if (current.src !== props.src) {
    setLayers([current, { src: props.src, focus: props.focus, text: props.text }])
  } else if (current.text !== props.text) {
    setLayers([...layers.slice(0, -1), { ...current, text: props.text }])
  }
  return layers.map((layer) => (
    <AsciiCanvas key={layer.src} {...props} {...layer} />
  ))
}

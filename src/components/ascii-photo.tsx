import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

// Brighter cells get denser glyphs; the darkest stay bare photo.
const RAMP = "   .:+xX08S$"
const CELL_WIDTH = 8
const CELL_HEIGHT = 12
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
type AsciiPhotoProps = {
  src: string
  text?: string
  blurTop?: number
  className?: string
}

function AsciiCanvas({ src, text, blurTop, className }: AsciiPhotoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawn, setIsDrawn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const image = new Image()
    image.src = src
    let isCancelled = false

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      const context = canvas.getContext("2d")
      if (!context) return
      context.scale(ratio, ratio)

      const scale = Math.max(width / image.width, height / image.height)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      const left = (width - drawWidth) / 2
      const top = (height - drawHeight) / 2
      context.drawImage(image, left, top, drawWidth, drawHeight)
      context.fillStyle = getComputedStyle(canvas).color
      context.fillRect(0, 0, width, height)

      // Shrinking the photo to one pixel per cell averages each cell's colour.
      const columns = Math.ceil(width / CELL_WIDTH)
      const rows = Math.ceil(height / CELL_HEIGHT)
      const sampler = document.createElement("canvas")
      sampler.width = columns
      sampler.height = rows
      const sample = sampler.getContext("2d", { willReadFrequently: true })
      if (!sample) return
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
        for (let column = 0; column < columns; column++) {
          const index = (row * columns + column) * 4
          const red = pixels[index]
          const green = pixels[index + 1]
          const blue = pixels[index + 2]
          const light = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
          // A fixed per-cell jitter mixes neighbouring glyphs, so flat sky
          // reads as scattered text rather than one repeated character.
          const jitter = ((Math.sin(column * 12.9898 + row * 78.233) * 43758.5453) % 1) * 1.6
          const level = Math.floor(light * RAMP.length + jitter)
          const shade = RAMP[Math.max(0, Math.min(RAMP.length - 1, level))]
          if (shade === " ") continue
          const glyph = text ? text[(row * columns + column) % text.length] : shade
          // Glyphs carry the colour under them, lifted halfway to white.
          context.fillStyle = `rgb(${(red + 255) / 2} ${(green + 255) / 2} ${(blue + 255) / 2} / ${(light - 0.2) * 0.35})`
          context.fillText(
            glyph,
            column * CELL_WIDTH + CELL_WIDTH / 2,
            row * CELL_HEIGHT + CELL_HEIGHT / 2,
          )
        }
      }
      if (blurTop) blurTopEdge(canvas, Math.round(blurTop * ratio), ratio)
      setIsDrawn(true)
    }

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
      observer.disconnect()
    }
  }, [src, text, blurTop])

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
export function AsciiPhoto(props: AsciiPhotoProps) {
  const [sources, setSources] = useState([props.src])
  if (sources.at(-1) !== props.src) setSources([sources.at(-1)!, props.src])
  return sources.map((src) => <AsciiCanvas key={src} {...props} src={src} />)
}

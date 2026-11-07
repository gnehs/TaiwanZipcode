// Renders scene.tsx frame by frame with Takumi, the renderer behind the
// address pages' images, and encodes public/og.mp4 for the home page's
// og:video. Pass --peek <seconds…> to write PNG frames instead.
//   node scripts/og-video/render.mjs
import { spawn } from "node:child_process"
import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import react from "@vitejs/plugin-react"
import { googleFonts } from "takumi-js/helpers"
import { runnerImport } from "vite"

const FPS = 60
const root = fileURLToPath(new URL("../..", import.meta.url))
const output = `${root}/public/og.mp4`

// The scene reads the address data through Vite's aliases and ?raw imports.
const { module: scene } = await runnerImport(fileURLToPath(new URL("scene.tsx", import.meta.url)), {
  configFile: false,
  root,
  logLevel: "error",
  plugins: [react()],
  resolve: { alias: { "@": `${root}/src` } },
})
const { createElement } = await import("react")
const { render } = await import("takumi-js")

const fonts = await googleFonts([{ name: "Noto Sans TC", weight: "100..900" }])
const frameAt = (time, format) =>
  render(createElement(scene.Scene, { time }), { width: 1800, height: 945, devicePixelRatio: 1.5, format, fonts })

const peek = process.argv.indexOf("--peek")
if (peek !== -1) {
  const [directory, ...times] = process.argv.slice(peek + 1)
  for (const [index, time] of times.entries()) {
    await writeFile(`${directory}/peek-${index}.png`, await frameAt(Number(time), "png"))
  }
  process.exit(0)
}

const ffmpeg = spawn(
  "ffmpeg",
  [
    "-y", "-loglevel", "error",
    "-f", "rawvideo", "-pixel_format", "rgba", "-video_size", "1800x945", "-framerate", String(FPS), "-i", "-",
    // The card at 1.5×, like the address images. H.264 wants even sides, so
    // the last row goes.
    "-vf", "crop=1800:944:0:0,format=yuv420p",
    "-c:v", "libx264", "-preset", "veryslow", "-crf", "20", "-tune", "animation",
    "-movflags", "+faststart", "-an",
    output,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
)
const closed = new Promise((resolve, reject) =>
  ffmpeg.on("close", (code) => (code ? reject(new Error(`ffmpeg exited ${code}`)) : resolve())),
)

const frames = Math.round(scene.LOOP_S * FPS)
for (let frame = 0; frame < frames; frame += 1) {
  const pixels = await frameAt(frame / FPS, "raw")
  if (!ffmpeg.stdin.write(pixels)) await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve))
}
ffmpeg.stdin.end()
await closed
console.log(`${frames} frames → ${output}`)

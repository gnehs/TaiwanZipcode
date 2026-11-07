// Renders scene.tsx frame by frame and encodes public/og.mp4 for the home
// page's og:video. Start the dev server first, then:
//   node scripts/og-video/capture.mjs http://localhost:5173
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

import { chromium } from "playwright-core"

const FPS = 30
const origin = process.argv[2] ?? "http://localhost:5173"
const output = fileURLToPath(new URL("../../public/og.mp4", import.meta.url))

const browser = await chromium.launch({ channel: "chrome" })
// Drawn at twice the size and scaled down, for crisper text.
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 })
await page.goto(`${origin}/scripts/og-video/index.html?capture`)
const loop = await page.evaluate(() => window.ogReady)
const frames = Math.round(loop * FPS)

const ffmpeg = spawn(
  "ffmpeg",
  [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-vf", "scale=1200:630:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-preset", "veryslow", "-crf", "24", "-tune", "animation",
    "-movflags", "+faststart", "-an",
    output,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
)

for (let frame = 0; frame < frames; frame += 1) {
  await page.evaluate((time) => window.ogRender(time), frame / FPS)
  ffmpeg.stdin.write(await page.screenshot({ type: "png" }))
}
ffmpeg.stdin.end()
await new Promise((resolve, reject) =>
  ffmpeg.on("close", (code) => (code ? reject(new Error(`ffmpeg exited ${code}`)) : resolve())),
)
await browser.close()
console.log(`${frames} frames → ${output}`)

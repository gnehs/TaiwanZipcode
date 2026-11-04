import { fileURLToPath, URL } from "node:url"

import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { seoFiles } from "./seo.ts"

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", quoteStyle: "double" }),
    react(),
    tailwindcss(),
    cloudflare(),
    seoFiles(),
  ],
  server: {
    // The database tools' Wine prefix links z: to the filesystem root.
    watch: { ignored: ["**/.tmpwine/**"] },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})

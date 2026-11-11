import { fileURLToPath, URL } from "node:url"

import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { seoFiles } from "./seo.ts"

export default defineConfig(({ command, isPreview }) => ({
  plugins: [
    tanstackRouter({ target: "react", quoteStyle: "double" }),
    react(),
    tailwindcss(),
    // The dev server has no built pages or 404.html, so there every path that
    // is not a file gets the app, as the fixed pages do once built.
    cloudflare({
      config: (worker) => {
        if (command === "serve" && !isPreview && worker.assets) {
          worker.assets.not_found_handling = "single-page-application"
        }
      },
    }),
    seoFiles(),
  ],
  // The zipcode data is most of what the app downloads and changes once a
  // month, so it is a file of its own: a new release of the app leaves it,
  // and its name, as they were, and returning visitors keep their copy.
  environments: {
    client: {
      build: {
        rolldownOptions: {
          output: { codeSplitting: { groups: [{ name: "zipcode", test: /zipcode\.txt/ }] } },
        },
      },
    },
  },
  server: {
    // The database tools' Wine prefix links z: to the filesystem root.
    watch: { ignored: ["**/.tmpwine/**"] },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}))

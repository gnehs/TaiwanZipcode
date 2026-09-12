import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "@/App"
import { initializeTheme } from "@/lib/theme"
import "@/index.css"

const disposeTheme = initializeTheme()
if (import.meta.hot) import.meta.hot.dispose(disposeTheme)

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

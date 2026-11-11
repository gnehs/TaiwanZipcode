import { useEffect } from "react"
import { Link } from "@tanstack/react-router"

import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { pathInApp, useLocale, useText } from "@/lib/locale"
import { placePage } from "@/lib/page-meta"

const TEXT = {
  zh: { trail: "導覽路徑", zipcode: "郵遞區號", districts: "行政區", roads: "道路" },
  en: { trail: "Breadcrumb", zipcode: "Zip code", districts: "Districts", roads: "Roads" },
}

const LINK = "rounded-md outline-none underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"

// A city's districts or a district's roads, each with its zipcode and a link
// down to it.
export function PlacePage({ city, area }: { city: string; area: string | null }) {
  const locale = useLocale()
  const text = useText(TEXT)
  const page = placePage(locale, city, area)
  useEffect(() => {
    document.title = page.meta.title
  }, [page.meta.title])

  return (
    <PageShell page="place" raised>
      <Card flatOnPhone className="enter-rise">
        <CardContent className="flex flex-col gap-5">
          <nav aria-label={text.trail}>
            <ol className="flex flex-wrap gap-x-2 text-sm text-muted-foreground">
              {page.trail.slice(0, -1).map((step, index) => (
                <li key={step.path}>
                  {index ? "› " : ""}
                  <Link to={pathInApp(step.path)} className={LINK}>
                    {step.name}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight">{page.name}</h2>
            {page.prefixes.length ? (
              <p className="text-muted-foreground">
                {text.zipcode}{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {page.prefixes.join(" / ")}
                </span>
              </p>
            ) : null}
          </div>
          <section className="flex flex-col gap-2" aria-labelledby="place-entries">
            <h3 id="place-entries" className="font-semibold">
              {area ? text.roads : text.districts}
            </h3>
            <ul className="grid gap-x-6 sm:grid-cols-2">
              {page.entries.map((entry) => (
                <li key={entry.path} className="flex items-baseline justify-between gap-3 border-b border-border py-2">
                  <Link to={pathInApp(entry.path)} className={`min-w-0 font-medium ${LINK}`}>
                    {entry.name}
                  </Link>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{entry.zipcode}</span>
                </li>
              ))}
            </ul>
          </section>
        </CardContent>
      </Card>
    </PageShell>
  )
}

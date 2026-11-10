import { createFileRoute, Link, useLocation } from "@tanstack/react-router"

import { PageShell } from "@/components/page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { CITIES, CITY_REGIONS } from "@/lib/cities"
import { pathInApp, useLocale, useText } from "@/lib/locale"
import { placePage } from "@/lib/page-meta"
import { usePageTitle } from "@/lib/page-title"

export const Route = createFileRoute("/zipcodes")({
  component: ZipcodesPage,
})

const TEXT = {
  zh: { title: "三碼郵遞區號表", cities: "縣市" },
  en: { title: "Taiwan Zip Code List", cities: "Cities and counties" },
}

const LINK =
  "rounded-md outline-none underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"

// Every district's first three digits on one page, county by county, each
// linking to the district's own page of roads.
function ZipcodesPage() {
  const locale = useLocale()
  const text = useText(TEXT)
  usePageTitle("zipcodes")
  // The app replaces the prerendered page after the browser has matched the
  // hash, so the county it names is read from the router rather than :target.
  const current = useLocation({ select: (location) => location.hash })
  const cities = CITIES.map((city) => ({ city, page: placePage(locale, city, null) }))
  const pageOf = new Map(cities.map(({ city, page }) => [city, page]))

  return (
      <PageShell page="zipcodes" raised>
        <Card className="enter-rise">
          <CardContent className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold tracking-tight">{text.title}</h2>
            <nav aria-label={text.cities}>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                {CITY_REGIONS.map((region) => (
                  <div key={region.name.zh} className="contents">
                    <dt className="font-medium">{region.name[locale]}</dt>
                    <dd>
                      <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
                        {region.cities.map((city) => (
                          <li key={city}>
                            <Link
                              to="."
                              hash={city}
                              className={`text-muted-foreground hover:text-foreground ${LINK}`}
                            >
                              {pageOf.get(city)!.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ))}
              </dl>
            </nav>
            {CITY_REGIONS.map((region) => (
              <section
                key={region.name.zh}
                aria-labelledby={`${region.name.en}-title`}
                className="flex flex-col gap-6 pt-4"
              >
                <h3 id={`${region.name.en}-title`} className="text-lg font-bold tracking-tight">
                  {region.name[locale]}
                </h3>
                {region.cities.map((city) => {
                  const page = pageOf.get(city)!
                  return (
                  <section
                    key={city}
                    id={city}
                    aria-labelledby={`${city}-title`}
                    data-current={current === city || undefined}
                    // The county a link points at stands out. Inset 12px into the
                    // card's 20px (28px) padding, so 26 − 8 = 18 (26 − 16 = 10).
                    className="-mx-3 -my-3 flex scroll-mt-21 flex-col gap-1 rounded-2xl px-3 py-3 transition-colors duration-300 ease-out data-current:bg-muted sm:rounded-lg"
                  >
                    <h4 id={`${city}-title`} className="font-semibold">
                      <Link to={pathInApp(page.meta.path)} className={LINK}>
                        {page.name}
                      </Link>
                    </h4>
                    <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
                      {page.entries.map((entry) => (
                        <li
                          key={entry.path}
                          className="flex items-baseline justify-between gap-3 border-b border-border py-2"
                        >
                          <Link to={pathInApp(entry.path)} className={`min-w-0 truncate ${LINK}`}>
                            {entry.name}
                          </Link>
                          <span className="shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
                            {entry.zipcode}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </section>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  )
}

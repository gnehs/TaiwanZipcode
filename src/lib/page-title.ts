import { useEffect } from "react"

import { useLocale } from "@/lib/locale"
import { fixedPageMeta, type FixedPage } from "@/lib/site"

export function usePageTitle(page: FixedPage) {
  const locale = useLocale()
  useEffect(() => {
    document.title = fixedPageMeta(page, locale).title
  }, [page, locale])
}

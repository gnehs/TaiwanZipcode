import { zipcodeData } from "@/lib/addresses"
import { createAddressUrls } from "@/utils/addressUrls.js"

// The one place address URLs are made and read; see utils/addressUrls.js
// for the forms.
const urls = createAddressUrls(zipcodeData)

export const {
  addressSlug,
  parseAddressSlug,
  slugOfShareParts,
  slugOfSharePath,
  currentSharePath,
  hashOfSlug,
  slugOfHash,
  slugOfLegacyHash,
} = urls

export const sharePath = (slug: string): string => urls.sharePath(slug) ?? "/"
export const shareUrl = (origin: string, slug: string): string =>
  urls.shareUrl(origin, slug) ?? origin

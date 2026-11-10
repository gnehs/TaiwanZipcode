/**
 * Every page is index.html with its own title, description and links. The
 * build writes the fixed pages this way and the Worker writes each address
 * page, so both change the same tags the same way.
 */

const TITLE_TAGS = ['name="title"', 'property="og:title"', 'property="twitter:title"'];
const DESCRIPTION_TAGS = [
  'name="description"',
  'property="og:description"',
  'property="twitter:description"',
];
const URL_TAGS = ['property="og:url"', 'property="twitter:url"'];
const IMAGE_TAGS = ['property="og:image"', 'property="twitter:image"'];

export function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function setContent(html, tags, value) {
  return tags.reduce(
    (result, tag) =>
      result.replace(new RegExp(`(<meta ${tag} content=")[^"]*`), (_, start) => start + value),
    html,
  );
}

/**
 * @param {string} html
 * Without an image or structured data the page keeps the site's own. The
 * content, already HTML, fills the app's root until the app replaces it, and
 * stays hidden meanwhile (see index.css).
 *
 * A page in both languages lists each one's URL (`alternates`, keyed by
 * the html lang), and the Chinese one stands for any other language.
 *
 * @param {{ title: string, description: string, url: string, lang: string, siteName: string, alternates?: Record<string, string>, image?: string, indexable: boolean, structuredData?: object, content?: string }} page
 */
export function writePageHead(
  html,
  { title, description, url, lang, siteName, alternates, image, indexable, structuredData, content },
) {
  const safeTitle = escapeHtml(title);
  const safeUrl = escapeHtml(url);
  let result = html.replace(/<html lang="[^"]*">/, () => `<html lang="${escapeHtml(lang)}">`);
  result = result.replace(/<title>[^<]*<\/title>/, () => `<title>${safeTitle}</title>`);
  result = setContent(result, ['property="og:site_name"'], escapeHtml(siteName));
  result = setContent(result, TITLE_TAGS, safeTitle);
  result = setContent(result, DESCRIPTION_TAGS, escapeHtml(description));
  result = setContent(result, URL_TAGS, safeUrl);
  // A page with its own image drops the site's looping video, which would
  // otherwise play in its place.
  if (image) {
    result = setContent(result, IMAGE_TAGS, escapeHtml(image));
    result = result.replace(/\s*<meta property="og:video[^>]*>/g, '');
  }
  if (structuredData) {
    // "<" is escaped so no text can close the script early.
    const json = JSON.stringify(structuredData).replaceAll('<', '\\u003c');
    result = result.replace(
      /(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/,
      (_, start, end) => start + json + end,
    );
  }
  // The home page's own content is replaced too, since the Worker writes
  // address pages over the built home page.
  if (content) {
    result = result.replace(
      /<div id="app">(?:<!--content-->[\s\S]*?<!--\/content-->)?<\/div>/,
      () => `<div id="app"><!--content--><div data-prerender>${content}</div><!--/content--></div>`,
    );
  }
  // A page that does not exist names no canonical address and stays out of
  // search results.
  // The Worker writes over a built page, which already lists its own languages.
  result = result.replace(/\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*" \/>/g, '');
  const links = [`<link rel="canonical" href="${safeUrl}" />`];
  if (alternates) {
    for (const [hreflang, href] of Object.entries(alternates)) {
      links.push(`<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}" />`);
    }
    if (alternates['zh-TW']) {
      links.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(alternates['zh-TW'])}" />`);
    }
  }
  return result.replace(/<link rel="canonical" href="[^"]*" \/>/, () =>
    indexable ? links.join('\n  ') : '<meta name="robots" content="noindex" />',
  );
}

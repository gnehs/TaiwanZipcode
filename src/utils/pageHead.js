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
 * content, already HTML, fills the app's root until the app replaces it.
 *
 * @param {{ title: string, description: string, url: string, image?: string, indexable: boolean, structuredData?: object, content?: string }} page
 */
export function writePageHead(html, { title, description, url, image, indexable, structuredData, content }) {
  const safeTitle = escapeHtml(title);
  const safeUrl = escapeHtml(url);
  let result = html.replace(/<title>[^<]*<\/title>/, () => `<title>${safeTitle}</title>`);
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
      () => `<div id="app"><!--content-->${content}<!--/content--></div>`,
    );
  }
  // A page that does not exist names no canonical address and stays out of
  // search results.
  return result.replace(/<link rel="canonical" href="[^"]*" \/>/, () =>
    indexable
      ? `<link rel="canonical" href="${safeUrl}" />`
      : '<meta name="robots" content="noindex" />',
  );
}

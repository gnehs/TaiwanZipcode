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

function escapeHtml(value) {
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
 * @param {{ title: string, description: string, url: string, indexable: boolean }} page
 */
export function writePageHead(html, { title, description, url, indexable }) {
  const safeTitle = escapeHtml(title);
  const safeUrl = escapeHtml(url);
  let result = html.replace(/<title>[^<]*<\/title>/, () => `<title>${safeTitle}</title>`);
  result = setContent(result, TITLE_TAGS, safeTitle);
  result = setContent(result, DESCRIPTION_TAGS, escapeHtml(description));
  result = setContent(result, URL_TAGS, safeUrl);
  // A page that does not exist names no canonical address and stays out of
  // search results.
  return result.replace(/<link rel="canonical" href="[^"]*" \/>/, () =>
    indexable
      ? `<link rel="canonical" href="${safeUrl}" />`
      : '<meta name="robots" content="noindex" />',
  );
}

// Reads the date a county's doorplate file was taken from the text around it
// (a resource name, title or file name), as ROC year, month and day. Only ROC
// dates count: a western date in a file name is an upload system's stamp,
// which a portal keeps when the file is replaced.
const PATTERNS = [
  // 115年10月, 迄115年6月30日, 114年
  [/(1\d{2})年(?:(\d{1,2})月(?:(\d{1,2})日)?)?/u, (y, m, d) => [y, m, d]],
  // 1150914, 1140505, 11510
  [/(?<!\d)(1[0-2]\d)(0[1-9]|1[0-2])((?:0[1-9]|[12]\d|3[01]))?(?!\d)/u, (y, m, d) => [y, m, d]],
];

/** The most precise date found in any of the texts, as "115-10" or "115-9-14", or null. */
export function dataDateOf(texts) {
  let best = null;
  for (const text of texts) {
    for (const [pattern, read] of PATTERNS) {
      const match = String(text ?? '').match(pattern);
      if (!match) continue;
      const parts = read(...match.slice(1)).filter(Boolean).map(Number);
      if (!best || parts.length > best.length) best = parts;
    }
  }
  return best ? best.join('-') : null;
}

/** An ISO timestamp (a dataset's last update) as an ROC date. */
export function rocDateOf(iso) {
  const [year, month, day] = String(iso).slice(0, 10).split('-').map(Number);
  return `${year - 1911}-${month}-${day}`;
}

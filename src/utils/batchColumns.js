export const MIN_COLUMN_WIDTH = 64;
export const MAX_COLUMN_WIDTH = 800;

export function clampColumnWidth(width) {
  return Math.round(Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width)));
}

/**
 * Stored preferences can predate a column or name one that was removed, so
 * unknown keys are dropped and new columns join the end of the order.
 *
 * @param {string | null} raw
 * @param {{ columns: string[], resizable: string[] }} keys
 * @returns {{ order: string[], hidden: string[], widths: Record<string, number> }}
 */
export function parseColumnPrefs(raw, { columns, resizable }) {
  let value = null;
  try {
    value = JSON.parse(raw ?? 'null');
  } catch {
    // Fall back to the defaults below.
  }
  const known = new Set(columns);
  const stored = Array.isArray(value?.order) ? value.order.filter((key) => known.has(key)) : [];
  const order = [...new Set([...stored, ...columns])];
  const hidden = Array.isArray(value?.hidden)
    ? [...new Set(value.hidden.filter((key) => known.has(key)))]
    : [];
  const widths = {};
  const sizable = new Set(resizable);
  for (const [key, width] of Object.entries(value?.widths ?? {})) {
    if (sizable.has(key) && Number.isFinite(width)) widths[key] = clampColumnWidth(width);
  }
  return { order, hidden, widths };
}

export function moveItem(list, from, to) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

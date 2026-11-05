function escapeCell(value, pattern) {
  const text = String(value ?? '');
  return pattern.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// Tab-separated values paste into Excel and Google Sheets as separate cells.
export function toTsv(rows) {
  return rows.map((row) => row.map((cell) => escapeCell(cell, /[\t\n\r"]/u)).join('\t')).join('\n');
}

export function toCsv(rows) {
  return rows.map((row) => row.map((cell) => escapeCell(cell, /[,\n\r"]/u)).join(',')).join('\r\n');
}

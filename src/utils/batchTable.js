function escapeCell(value) {
  const text = String(value ?? '');
  return /[\t\n\r"]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// Tab-separated values paste into Excel and Google Sheets as separate cells.
export function toTsv(rows) {
  return rows.map((row) => row.map(escapeCell).join('\t')).join('\n');
}

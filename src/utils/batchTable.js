function escapeCell(value, pattern) {
  const text = String(value ?? '');
  return pattern.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(rows) {
  return rows.map((row) => row.map((cell) => escapeCell(cell, /[,\n\r"]/u)).join(',')).join('\r\n');
}

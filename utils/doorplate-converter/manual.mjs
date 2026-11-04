// Packs a county's doorplate files, downloaded by hand from a server that
// refuses automated downloads, into ./manual/<county>.csv. Only the columns
// build.mjs reads are kept, so the file stays small enough to commit.
//
//   node manual.mjs 雲林縣 ~/Downloads/a.json ~/Downloads/b.json
import fs from 'node:fs/promises';

const [county, ...files] = process.argv.slice(2);
if (!county || !files.length) throw new Error('Usage: node manual.mjs <county> <file.json>...');

const quote = (value) => (/[",\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
// The MOI layout, with coordinates left out.
const lines = ['省市縣市代碼,鄉鎮市區代碼,村里,鄰,街路段,地區,巷,弄,號'];
for (const file of files) {
  for (const row of JSON.parse(await fs.readFile(file, 'utf8'))) {
    lines.push([
      row['省市縣市代碼'],
      row['鄉鎮市區代碼'],
      '',
      '',
      row['街_路段'] ?? row['街路段'],
      row['地區'],
      row['巷'],
      row['弄'],
      row['號'],
    ].map((value) => quote(String(value ?? '').normalize('NFKC').trim())).join(','));
  }
}
await fs.mkdir(new URL('./manual/', import.meta.url), { recursive: true });
await fs.writeFile(new URL(`./manual/${county}.csv`, import.meta.url), `${lines.join('\n')}\n`);
console.log(`${county}: packed ${lines.length - 1} rows`);

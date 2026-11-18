// Tells search engines through IndexNow which pages a data update changed:
//   node scripts/indexnow.mjs <git ref> [--dry-run]
// compares the zipcode database and doorplates at <ref> with the working
// tree and submits the city, district and road pages, in both languages,
// whose content differs, including pages that were added or removed.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { createAddressUrls } from '../src/utils/addressUrls.js';
import { decodeZipcodeData } from '../src/utils/zipcodeCodec.js';

const HOST = 'zipcode.gnehs.net';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
// IndexNow takes at most 10,000 URLs a request.
const BATCH_SIZE = 10_000;
const DOORPLATES = 'public/doorplates';
// The FAQ lists when each county's doorplates were taken.
const DATES_PAGES = ['/faq'];

/**
 * Every page the data shapes, keyed by path, with a string that changes
 * whenever what the page shows does: a road's zip code scopes and house
 * numbers, a district's roads and their scopes, a city's districts.
 */
export function pageContents({ database, doorplates, dates }) {
  const urls = createAddressUrls(database);
  const pages = new Map(DATES_PAGES.map((path) => [path, dates]));
  for (const [city, { areas }] of Object.entries(database)) {
    const cityContent = [];
    for (const [area, { roads }] of Object.entries(areas)) {
      const houses = doorplates[`${city}${area}`] ?? {};
      const areaContent = [];
      for (const [road, { scopes }] of Object.entries(roads)) {
        pages.set(urls.sharePath(`${city}${area}${road}`), JSON.stringify([scopes, houses[road] ?? null]));
        areaContent.push(road, scopes);
      }
      const content = JSON.stringify(areaContent);
      pages.set(urls.placePath(city, area), content);
      cityContent.push(area, content);
    }
    pages.set(urls.placePath(city), JSON.stringify(cityContent));
  }
  return pages;
}

/** The URLs of the pages that differ between two sets, in both languages. */
export function changedUrls(before, after) {
  const paths = new Set();
  for (const [path, content] of after) if (before.get(path) !== content) paths.add(path);
  for (const path of before.keys()) if (!after.has(path)) paths.add(path);
  return [...paths].flatMap((path) => [`https://${HOST}${path}`, `https://${HOST}/en${path}`]);
}

function readData(ref) {
  const read = ref
    ? (path) => execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8', maxBuffer: 1 << 28 })
    : (path) => readFileSync(path, 'utf8');
  const files = ref
    ? execFileSync('git', ['ls-tree', '--name-only', '-z', `${ref}:${DOORPLATES}`], { encoding: 'utf8' })
        .split('\0')
        .filter(Boolean)
    : readdirSync(DOORPLATES);
  const doorplates = {};
  for (const file of files) {
    if (file === 'dates.json' || file === 'index.json' || !file.endsWith('.json')) continue;
    doorplates[file.slice(0, -'.json'.length)] = JSON.parse(read(`${DOORPLATES}/${file}`));
  }
  return {
    database: decodeZipcodeData(read('src/assets/zipcode.txt')),
    doorplates,
    dates: read(`${DOORPLATES}/dates.json`),
  };
}

// The key is public by design: search engines fetch it from the site to
// check that the submission is the site's own.
function indexNowKey() {
  const file = readdirSync('public').find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
  if (!file) throw new Error('public/ has no IndexNow key file');
  return file.slice(0, -'.txt'.length);
}

async function submit(urlList) {
  const key = indexNowKey();
  for (let start = 0; start < urlList.length; start += BATCH_SIZE) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: `https://${HOST}/${key}.txt`,
        urlList: urlList.slice(start, start + BATCH_SIZE),
      }),
    });
    // 200 and 202 both mean the URLs were received.
    if (!response.ok) throw new Error(`IndexNow answered ${response.status}: ${await response.text()}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [ref, flag] = process.argv.slice(2);
  if (!ref) throw new Error('Usage: node scripts/indexnow.mjs <git ref> [--dry-run]');
  const urls = changedUrls(pageContents(readData(ref)), pageContents(readData(null)));
  console.log(`${urls.length} changed URLs since ${ref}`);
  for (const url of urls.slice(0, 20)) console.log(decodeURI(url));
  if (flag !== '--dry-run' && urls.length > 0) {
    await submit(urls);
    console.log('Submitted to IndexNow');
  }
}

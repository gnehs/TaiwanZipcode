// Downloads each county's newest doorplate CSV into ./temp as UTF-8.
import fs from 'node:fs/promises';

import { SOURCES } from './sources.mjs';

const TEMP = new URL('./temp/', import.meta.url);
const TIMEOUT_MS = 600_000;
const MINIMUM_ROWS = 10_000;
const HEADERS = { 'user-agent': 'TaiwanZipcode doorplate updater' };

async function fetchWithRetry(url, options = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...HEADERS, ...options.headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`  retry ${attempt}/${attempts}: ${error.message}`);
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError.message}`);
}

// The numbers in a title or description, read as a date-like key: "115年6月" → [115, 6].
const periodOf = (text) => (String(text).match(/\d+/gu) ?? []).map(Number);

function comparePeriods(a, b) {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

async function findDataset({ search, title }) {
  const response = await fetchWithRetry('https://data.gov.tw/api/front/dataset/list', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      bool: [{ fulltext: { value: search } }],
      filter: [],
      page_num: 1,
      page_limit: 50,
      tids: [],
      sort: '_score_desc',
    }),
  });
  const results = (await response.json()).payload.search_result
    .map((dataset) => ({ nid: dataset.nid, match: dataset.title.match(title) }))
    .filter(({ match }) => match)
    .sort((a, b) => comparePeriods(b.match.slice(1).map(Number), a.match.slice(1).map(Number)));
  if (!results.length) throw new Error(`No dataset titled like ${title}`);
  return results[0].nid;
}

async function newestCsv(datasetId) {
  const response = await fetchWithRetry(`https://data.gov.tw/api/v2/rest/dataset/${datasetId}`);
  const { result } = await response.json();
  const csvs = result.distribution.filter((resource) => (
    resource.resourceFormat === 'CSV' || /\.csv(?:$|\?)/iu.test(resource.resourceDownloadUrl)
  ));
  if (!csvs.length) throw new Error(`Dataset ${datasetId} has no CSV resource`);
  csvs.sort((a, b) => comparePeriods(periodOf(b.resourceDescription), periodOf(a.resourceDescription)));
  return { title: result.title, url: csvs[0].resourceDownloadUrl.trim(), description: csvs[0].resourceDescription };
}

function decode(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/u, '');
  } catch {
    return new TextDecoder('big5').decode(bytes);
  }
}

await fs.mkdir(TEMP, { recursive: true });
const manifest = [];
for (const source of SOURCES) {
  const dataset = source.dataset ?? await findDataset(source);
  const resource = await newestCsv(dataset);
  console.log(`${source.county}: ${resource.title} ${resource.description ?? ''}`);
  const response = await fetchWithRetry(resource.url);
  const text = decode(new Uint8Array(await response.arrayBuffer()));
  const lines = text.split(/\r?\n/u).filter(Boolean);
  if (lines[0].split(',').length < 11 || lines.length < MINIMUM_ROWS) {
    throw new Error(`${source.county}: unexpected CSV (${lines.length} lines, header ${lines[0].slice(0, 80)})`);
  }
  await fs.writeFile(new URL(`${source.county}.csv`, TEMP), text);
  manifest.push({ county: source.county, dataset, url: resource.url, rows: lines.length - 1 });
}
await fs.writeFile(new URL('manifest.json', TEMP), `${JSON.stringify(manifest, null, 2)}\n`);

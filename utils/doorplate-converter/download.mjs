// Downloads each county's newest doorplate files into ./temp as UTF-8.
import fs from 'node:fs/promises';
import https from 'node:https';
import tls from 'node:tls';

import { dataDateOf, rocDateOf } from './dataDate.mjs';
import { SOURCES } from './sources.mjs';

const TEMP = new URL('./temp/', import.meta.url);
const TIMEOUT_MS = 600_000;
const MINIMUM_ROWS = 10_000;
const HEADERS = { 'user-agent': 'TaiwanZipcode doorplate updater' };
// Some county servers send no intermediate certificate, or stop short of a
// root Node trusts; TWCA's public intermediates complete their chains, so
// every download is still verified.
const CA = [...tls.rootCertificates, await fs.readFile(new URL('./twca.pem', import.meta.url), 'utf8')];
const FORMATS = { csv: 'CSV', json: 'JSON', 'address-csv': 'CSV' };

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

// The resources of the newest period; a county split by district (Hsinchu
// City) lists several that share it.
async function newestResources(datasetId, format) {
  const response = await fetchWithRetry(`https://data.gov.tw/api/v2/rest/dataset/${datasetId}`);
  const { result } = await response.json();
  const type = FORMATS[format];
  const resources = result.distribution.filter((resource) => (
    resource.resourceFormat === type
    || new RegExp(`\\.${type}(?:$|\\?)`, 'iu').test(resource.resourceDownloadUrl)
  ));
  if (!resources.length) throw new Error(`Dataset ${datasetId} has no ${type} resource`);
  const periods = resources.map((resource) => periodOf(resource.resourceDescription));
  const newest = periods.reduce((best, period) => (comparePeriods(period, best) > 0 ? period : best));
  return {
    title: result.title,
    updated: result.modifiedDate,
    resources: resources.filter((_, index) => comparePeriods(periods[index], newest) === 0),
  };
}

// Taichung lists one Google Drive file per month in a CSV on its own portal.
async function newestDriveFile(indexUrl) {
  const rows = (await (await fetchWithRetry(indexUrl)).text()).split(/\r?\n/u).slice(1).filter(Boolean)
    .map((line) => line.match(/^"([^"]*)",(?:"[^"]*",){2}"https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/u))
    .filter(Boolean);
  if (!rows.length) throw new Error(`No Drive files listed in ${indexUrl}`);
  const [, title, id] = rows.reduce((best, row) => (
    comparePeriods(periodOf(row[1]), periodOf(best[1])) > 0 ? row : best
  ));
  return {
    title,
    resources: [{
      resourceDescription: '',
      resourceDownloadUrl: `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
    }],
  };
}

// Keelung links its newest CSV from a page on its own site.
async function linkedCsv(pageUrl) {
  const page = await (await fetchWithRetry(pageUrl)).text();
  const href = page.match(/href="([^"]*\/Attachment\/[^"]*\.csv)"/iu)?.[1];
  if (!href) throw new Error(`No CSV linked from ${pageUrl}`);
  return {
    title: pageUrl,
    resources: [{ resourceDescription: '', resourceDownloadUrl: new URL(href, pageUrl).href }],
  };
}

function get(url, options, redirects = 5) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { ...options, ca: CA, headers: HEADERS, timeout: TIMEOUT_MS }, (response) => {
      const { statusCode, headers } = response;
      if (statusCode >= 300 && statusCode < 400 && headers.location && redirects > 0) {
        response.resume();
        resolve(get(new URL(headers.location, url).href, options, redirects - 1));
        return;
      }
      if (statusCode !== 200) {
        response.resume();
        reject(new Error(`${statusCode} ${response.statusMessage}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ body: Buffer.concat(chunks), headers }));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('timed out')));
    request.on('error', reject);
  });
}

async function download(url, options, attempts = 4) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await get(url, options);
    } catch (error) {
      console.warn(`  retry ${attempt}/${attempts}: ${error.message}`);
      if (attempt >= attempts) throw new Error(`Failed to download ${url}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
    }
  }
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
for (const { county, format = 'csv', tls: tlsOptions, ...source } of SOURCES) {
  if (source.manual) {
    const file = `${county}-0.csv`;
    await fs.copyFile(new URL(source.manual, import.meta.url), new URL(file, TEMP));
    console.log(`${county}: ${source.manual}`);
    manifest.push({ county, format, files: [file], date: { date: source.date, kind: 'data' } });
    continue;
  }
  const dataset = source.page ?? source.driveIndex ?? source.dataset ?? await findDataset(source);
  const { title, updated, resources } = source.page
    ? await linkedCsv(source.page)
    : source.driveIndex
      ? await newestDriveFile(source.driveIndex)
      : await newestResources(dataset, format);
  const files = [];
  let rows = 0;
  let date = null;
  for (const [index, resource] of resources.entries()) {
    const url = resource.resourceDownloadUrl.trim();
    console.log(`${county}: ${title} ${resource.resourceDescription ?? ''}`);
    const { body, headers } = await download(url, tlsOptions);
    const text = decode(new Uint8Array(body));
    // A date the county wrote into the name says what the file holds; file
    // names in URLs are not trusted, since portals keep them across uploads.
    const fileName = headers['content-disposition']?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/iu)?.[1];
    const named = dataDateOf([resource.resourceDescription, title, fileName && decodeURIComponent(fileName)]);
    const uploaded = headers['last-modified'] ?? updated;
    date = named
      ? { date: named, kind: 'data' }
      : date ?? (uploaded ? { date: rocDateOf(new Date(uploaded).toISOString()), kind: 'updated' } : null);
    const count = format === 'json' ? JSON.parse(text).length : text.split(/\r?\n/u).filter(Boolean).length - 1;
    const file = `${county}-${index}.${format === 'json' ? 'json' : 'csv'}`;
    await fs.writeFile(new URL(file, TEMP), text);
    files.push(file);
    rows += count;
  }
  if (rows < MINIMUM_ROWS) throw new Error(`${county}: only ${rows} rows`);
  manifest.push({ county, format, dataset, files, rows, date });
}
await fs.writeFile(new URL('manifest.json', TEMP), `${JSON.stringify(manifest, null, 2)}\n`);

// Turns the downloaded county CSVs into one doorplate file per district.
import fs from 'node:fs/promises';

import { decodeZipcodeData } from '../../src/utils/zipcodeCodec.js';
import {
  compareDoorNumbers,
  normalizeRoadName,
  parseDoorNumber,
  parseDoorPath,
} from '../../src/utils/doorplates.js';
import { SOURCES } from './sources.mjs';

const TEMP = new URL('./temp/', import.meta.url);
const RESULT = new URL('./result/doorplates/', import.meta.url);
// Below this share of usable rows, a county's export has changed shape.
const MINIMUM_KEPT = 0.85;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

const zipcodeData = decodeZipcodeData(
  await fs.readFile(new URL('../../src/assets/zipcode.txt', import.meta.url), 'utf8'),
);

// district file name → road → door path → house numbers
const districts = new Map();
for (const { county } of SOURCES) {
  const areasOfRoad = new Map();
  for (const [area, { roads }] of Object.entries(zipcodeData[county].areas)) {
    for (const road of Object.keys(roads)) {
      if (!areasOfRoad.has(road)) areasOfRoad.set(road, new Set());
      areasOfRoad.get(road).add(area);
    }
  }

  // The files name districts by code only; each code is the district its roads fall in.
  const rows = parseCsv(await fs.readFile(new URL(`${county}.csv`, TEMP), 'utf8')).slice(1);
  const doors = [];
  const votes = new Map();
  for (const [, areaCode, , , street, place, lane, alley, number] of rows) {
    const road = normalizeRoadName(street) || normalizeRoadName(place);
    const doorPath = parseDoorPath(lane, alley);
    const door = parseDoorNumber(number);
    const areas = areasOfRoad.get(road);
    if (!areas || doorPath === null || !door) continue;
    if (!votes.has(areaCode)) votes.set(areaCode, new Map());
    for (const area of areas) votes.get(areaCode).set(area, (votes.get(areaCode).get(area) ?? 0) + 1);
    doors.push({ areaCode, road, doorPath, door });
  }
  const areaOfCode = new Map([...votes].map(([code, tally]) => [
    code,
    [...tally].sort((a, b) => b[1] - a[1])[0][0],
  ]));

  let kept = 0;
  for (const { areaCode, road, doorPath, door } of doors) {
    const area = areaOfCode.get(areaCode);
    if (!areasOfRoad.get(road).has(area)) continue;
    const name = `${county}${area}`;
    if (!districts.has(name)) districts.set(name, new Map());
    const roads = districts.get(name);
    if (!roads.has(road)) roads.set(road, new Map());
    if (!roads.get(road).has(doorPath)) roads.get(road).set(doorPath, new Set());
    roads.get(road).get(doorPath).add(door);
    kept += 1;
  }
  const share = kept / rows.length;
  console.log(`${county}: kept ${kept} of ${rows.length} rows (${(share * 100).toFixed(1)}%)`);
  if (share < MINIMUM_KEPT) throw new Error(`${county}: only ${(share * 100).toFixed(1)}% of rows were usable`);
}

await fs.rm(RESULT, { recursive: true, force: true });
await fs.mkdir(RESULT, { recursive: true });
const names = [...districts.keys()].sort();
for (const name of names) {
  const roads = Object.fromEntries([...districts.get(name)].sort().map(([road, paths]) => [
    road,
    Object.fromEntries([...paths].sort().map(([doorPath, doors]) => [
      doorPath,
      [...doors].sort(compareDoorNumbers).join(','),
    ])),
  ]));
  await fs.writeFile(new URL(`${name}.json`, RESULT), JSON.stringify(roads));
}
await fs.writeFile(new URL('index.json', RESULT), JSON.stringify(names));
console.log(`Wrote ${names.length} district files`);

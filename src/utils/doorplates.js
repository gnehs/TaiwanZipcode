/*
 * Doorplate lists from the counties' open data, used to tell whether a house
 * number exists and to suggest the lanes, alleys and numbers on a road.
 *
 * A district file maps each road to its lanes and alleys ("" for the road
 * itself, "527巷", "527巷101弄"), each holding its house numbers as a sorted,
 * comma-separated list ("2,10,51-1"). Floors are dropped: a door is the house.
 */

import { parseAddressSuffix } from './zipcodeScopeMatcher.js';

// Spellings the county files use where the post office's road names do not.
const VARIANTS = new Map(Object.entries({
  台: '臺', 峯: '峰', 厦: '廈', 脚: '腳', 塩: '鹽', 双: '雙', 舘: '館', 啓: '啟', 鷄: '雞',
}));

export function normalizeRoadName(value) {
  return Array.from(String(value ?? '').normalize('NFKC').trim(), (char) => VARIANTS.get(char) ?? char).join('');
}

// Hsinchu County's export loses its unit characters to "G-", "H-" and "I-".
const GARBLED_UNITS = { 'G-': '巷', 'H-': '弄', 'I-': '號' };

function normalizeDoorField(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/[GHI]-/gu, (unit) => GARBLED_UNITS[unit]);
}

// The branch comes before 號 (97之1號) or, in some counties, right after it
// (97號之1); a 之 after a floor (34號六樓之1) is the floor's, not the house's.
const DOOR_NUMBER = /^(?:\d+衖)?(\d+)(?:之(\d+))?號(?:之(\d+)$)?/u;

/**
 * The house a county row's 號 field names, as "175" or "175-2". Rows the
 * site cannot match against typed input (臨/特 numbers, 附號, named
 * buildings) give null.
 */
export function parseDoorNumber(value) {
  const match = normalizeDoorField(value).match(DOOR_NUMBER);
  if (!match) return null;
  const branch = match[2] ?? match[3];
  return branch ? `${Number(match[1])}-${Number(branch)}` : `${Number(match[1])}`;
}

/** The lane and alley a row sits on, as a file key, or null when malformed. */
export function parseDoorPath(lane, alley) {
  const laneText = normalizeDoorField(lane);
  const alleyText = normalizeDoorField(alley);
  const laneMatch = laneText ? laneText.match(/^(\d+)巷$/u) : [];
  const alleyMatch = alleyText ? alleyText.match(/^(\d+)弄$/u) : [];
  if (!laneMatch || !alleyMatch) return null;
  return `${laneMatch[1] ? `${Number(laneMatch[1])}巷` : ''}${alleyMatch[1] ? `${Number(alleyMatch[1])}弄` : ''}`;
}

export function compareDoorNumbers(a, b) {
  const [baseA, branchA = 0] = a.split('-').map(Number);
  const [baseB, branchB = 0] = b.split('-').map(Number);
  return baseA - baseB || branchA - branchB;
}

function houseOf(suffix) {
  const { path, complete } = parseAddressSuffix(suffix);
  if (!complete) return null;
  let doorPath = '';
  let house = null;
  for (const part of path) {
    if (part.value === null || house) return null;
    if (part.unit === '號') house = part;
    else if (part.branch !== null) return null;
    else doorPath += `${part.value}${part.unit}`;
  }
  return house ? { doorPath, value: house.value, branch: house.branch } : null;
}

/**
 * Whether the house typed after a road is on the county's list. A road the
 * file does not carry, or input that is not a plain lane/alley/house path,
 * is 'unknown': a gap in the data is not a missing door.
 */
export function findDoor(lanes, suffix) {
  const house = houseOf(suffix);
  if (!lanes || !house) return 'unknown';
  const numbers = lanes[house.doorPath]?.split(',') ?? [];
  const found = house.branch === null
    ? numbers.some((n) => n === `${house.value}` || n.startsWith(`${house.value}-`))
    : numbers.includes(`${house.value}-${house.branch}`);
  return found ? 'exists' : 'missing';
}

function formatDoorNumber(number) {
  const [base, branch] = number.split('-');
  return branch ? `${base}之${branch}號` : `${base}號`;
}

/**
 * The lanes, alleys and houses that can follow the typed query, in number
 * order. The cleaned suffix reads a bare trailing number as a house number
 * (52 → 52號), so the number still being typed is read from the query.
 */
export function suggestDoors(lanes, query, suffix, limit = 30) {
  if (!lanes) return [];
  const text = String(query ?? '').trimEnd();
  const partial = text.normalize('NFKC').match(/\d*$/u)[0];
  const compact = String(suffix ?? '').normalize('NFKC').replace(/\s+/gu, '');
  const doorPath = partial ? compact.replace(new RegExp(`${partial}號?$`, 'u'), '') : compact;
  if (!/^(?:\d+巷)?(?:\d+弄)?$/u.test(doorPath)) return [];

  const candidates = [];
  for (const number of lanes[doorPath]?.split(',') ?? []) {
    if (number.startsWith(partial)) {
      candidates.push({ value: Number.parseInt(number, 10), order: 0, text: formatDoorNumber(number) });
    }
  }
  for (const key of Object.keys(lanes)) {
    if (!key.startsWith(doorPath)) continue;
    const child = key.slice(doorPath.length).match(/^(\d+)[巷弄]$/u);
    if (child?.[1].startsWith(partial)) {
      candidates.push({ value: Number(child[1]), order: 1, text: child[0] });
    }
  }
  const base = text.slice(0, text.length - partial.length);
  return candidates
    .sort((a, b) => a.value - b.value || a.order - b.order)
    .slice(0, limit)
    .map(({ text: tail }) => `${base}${tail}`);
}

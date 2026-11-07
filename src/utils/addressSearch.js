/**
 * The search index stores canonical Taiwanese address names, while users may
 * type full-width characters, 台 instead of 臺, or add spaces between levels.
 * Keep this normalisation independent from the data source so it can be
 * tested with small, fictional indexes.
 */
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replaceAll('台', '臺')
    .trim();
}

export function compactSearchText(value) {
  return normalizeSearchText(value).replace(/\s+/gu, '');
}

function compactSearchTextWithSource(value) {
  const source = String(value ?? '');
  const compact = [];
  const sourceStarts = [];
  const sourceEnds = [];
  let sourceIndex = 0;

  for (const sourceCharacter of source) {
    const sourceStart = sourceIndex;
    sourceIndex += sourceCharacter.length;
    const normalizedCharacter = sourceCharacter
      .normalize('NFKC')
      .replaceAll('台', '臺');
    for (const character of normalizedCharacter) {
      if (/\s/u.test(character)) continue;
      compact.push(character);
      sourceStarts.push(sourceStart);
      sourceEnds.push(sourceIndex);
    }
  }

  return { compact: compact.join(''), sourceStarts, sourceEnds };
}

function isSubsequence(query, target) {
  let index = 0;
  for (const character of target) {
    if (character === query[index]) index += 1;
    if (index === query.length) return true;
  }
  return index === query.length;
}

/**
 * Match the query characters in order inside the target, using as few
 * contiguous runs as possible ("永和信義" → 永和|區|信義). On a tie the path that
 * extends the current run wins, so "臺北市信義路" highlights 信義路 together.
 */
function findFuzzyMatch(query, target) {
  const queryCharacters = Array.from(query);
  if (!queryCharacters.length || !isSubsequence(queryCharacters, target)) {
    return null;
  }
  const targetCharacters = Array.from(target);

  const parents = [];
  let previous = targetCharacters.map((character) =>
    character === queryCharacters[0] ? { runs: 1, parent: -1 } : null,
  );
  parents.push(previous);

  for (let queryIndex = 1; queryIndex < queryCharacters.length; queryIndex += 1) {
    const current = new Array(targetCharacters.length).fill(null);
    let bestBefore = null;
    let bestBeforeIndex = -1;
    for (let targetIndex = 0; targetIndex < targetCharacters.length; targetIndex += 1) {
      const gapIndex = targetIndex - 2;
      if (gapIndex >= 0 && previous[gapIndex] &&
        (!bestBefore || previous[gapIndex].runs < bestBefore.runs)) {
        bestBefore = previous[gapIndex];
        bestBeforeIndex = gapIndex;
      }
      if (targetCharacters[targetIndex] !== queryCharacters[queryIndex]) continue;

      const contiguous = targetIndex > 0 ? previous[targetIndex - 1] : null;
      if (contiguous && (!bestBefore || contiguous.runs <= bestBefore.runs + 1)) {
        current[targetIndex] = { runs: contiguous.runs, parent: targetIndex - 1 };
      } else if (bestBefore) {
        current[targetIndex] = { runs: bestBefore.runs + 1, parent: bestBeforeIndex };
      }
    }
    parents.push(current);
    previous = current;
  }

  let endIndex = -1;
  for (let targetIndex = 0; targetIndex < previous.length; targetIndex += 1) {
    if (previous[targetIndex] &&
      (endIndex < 0 || previous[targetIndex].runs < previous[endIndex].runs)) {
      endIndex = targetIndex;
    }
  }
  if (endIndex < 0) return null;

  const indices = [];
  for (let queryIndex = parents.length - 1, targetIndex = endIndex; queryIndex >= 0; queryIndex -= 1) {
    indices.unshift(targetIndex);
    targetIndex = parents[queryIndex][targetIndex].parent;
  }
  return {
    runs: previous[endIndex].runs,
    span: indices[indices.length - 1] - indices[0],
    indices,
  };
}

function suffixAfterPrefix(query, compactAddress) {
  const queryData = compactSearchTextWithSource(query);
  const prefixCharacters = Array.from(compactAddress).length;
  const sourceIndex = queryData.sourceEnds[prefixCharacters - 1] ?? 0;

  // Spaces between the road and the house number are separators. Preserve
  // every character after that separator, including spaces and 台/臺 choices.
  return String(query ?? '').slice(sourceIndex).replace(/^\s+/u, '');
}

function startsWithAddressSuffix(value) {
  const normalizedValue = normalizeSearchText(value);
  return /^(?:\d|地下\s*\d|[Bb]\s*\d)/u.test(normalizedValue);
}

/**
 * Split "測試路一段 120號" into the road keywords and the house number, so a
 * road typed without its city or area can still be looked up.
 */
function splitAtAddressSuffix(query) {
  const source = String(query ?? '');
  const index = source.normalize('NFKC').search(/\d|地下\s*\d/u);
  if (index <= 0 || source.normalize('NFKC').length !== source.length) {
    return null;
  }
  const road = source.slice(0, index).trim();
  return road ? { road, suffix: source.slice(index) } : null;
}

const compactListCache = new WeakMap();

// The address list is fixed for the page's lifetime, so normalize it once.
function getCompactList(list) {
  let compactList = compactListCache.get(list);
  if (!compactList) {
    compactList = list.map((address) =>
      typeof address === 'string' ? compactSearchText(address) : '',
    );
    compactListCache.set(list, compactList);
  }
  return compactList;
}

const prefixIndexCache = new WeakMap();

// Each compact name maps to its first address, so duplicates resolve as a scan would.
function getPrefixIndex(list) {
  let prefixIndex = prefixIndexCache.get(list);
  if (!prefixIndex) {
    const addressByCompact = new Map();
    const compactList = getCompactList(list);
    for (const [index, compactAddress] of compactList.entries()) {
      if (compactAddress && !addressByCompact.has(compactAddress)) {
        addressByCompact.set(compactAddress, list[index]);
      }
    }
    const lengths = [...new Set([...addressByCompact.keys()].map((key) => key.length))]
      .sort((a, b) => b - a);
    prefixIndex = { addressByCompact, lengths };
    prefixIndexCache.set(list, prefixIndex);
  }
  return prefixIndex;
}

/**
 * Find the longest canonical road name at the start of a pasted address.
 * Returning the remaining text lets the caller open the detail view with the
 * house number already filled in.
 */
export function findLongestAddressPrefix(query, addresses) {
  const compactQuery = compactSearchTextWithSource(query).compact;
  if (!compactQuery || !Array.isArray(addresses)) return null;

  const { addressByCompact, lengths } = getPrefixIndex(addresses);
  for (const length of lengths) {
    if (length > compactQuery.length) continue;
    const compactAddress = compactQuery.slice(0, length);
    const address = addressByCompact.get(compactAddress);
    if (address !== undefined) {
      return { address, suffix: suffixAfterPrefix(query, compactAddress) };
    }
  }
  return null;
}

/**
 * Resolve a selected road against the current input. A suffix is returned
 * only when the input starts with that road, so a normal road-only selection
 * does not accidentally clear or overwrite an existing detail suffix.
 */
export function getAddressSelection(query, selectedAddress) {
  if (typeof selectedAddress !== 'string' || !selectedAddress) {
    return null;
  }

  const compactQueryData = compactSearchTextWithSource(query);
  const compactQuery = compactQueryData.compact;
  const compactAddress = compactSearchText(selectedAddress);
  if (!compactQuery.startsWith(compactAddress)) {
    const split = splitAtAddressSuffix(query);
    const roadKeyword = split && compactSearchText(split.road);
    return {
      address: selectedAddress,
      suffix:
        roadKeyword && findFuzzyMatch(roadKeyword, compactAddress)
          ? split.suffix
          : '',
    };
  }

  return {
    address: selectedAddress,
    suffix: suffixAfterPrefix(query, compactAddress),
  };
}

/**
 * Search a supplied address list and cap the visible window. `hasMore` keeps
 * the UI honest when the list is intentionally truncated.
 */
export function searchAddressList(query, addresses, limit = 30) {
  const normalizedQuery = normalizeSearchText(query);
  const list = Array.isArray(addresses) ? addresses : [];
  const safeLimit = Math.max(1, Math.trunc(Number(limit) || 30));

  if (!normalizedQuery) {
    return { matches: [], hasMore: false, prefixMatch: null };
  }

  const prefixMatch = findLongestAddressPrefix(query, list);
  if (prefixMatch && startsWithAddressSuffix(prefixMatch.suffix)) {
    return { matches: [prefixMatch.address], hasMore: false, prefixMatch };
  }

  const result = searchByKeywords(normalizedQuery, list, safeLimit);
  const split = result.matches.length ? null : splitAtAddressSuffix(query);
  return split
    ? searchByKeywords(normalizeSearchText(split.road), list, safeLimit)
    : result;
}

function searchByKeywords(normalizedQuery, list, safeLimit) {
  const keywords = normalizedQuery
    .split(/\s+/u)
    .map(compactSearchText)
    .filter(Boolean);
  if (!keywords.length) {
    return { matches: [], hasMore: false, prefixMatch: null };
  }

  const matches = [];
  const fuzzyMatches = [];
  const compactQuery = keywords.join('');
  // Scattered single characters are noise: each run must average two characters.
  const maxFuzzyRuns = Math.ceil(Array.from(compactQuery).length / 2);
  const compactList = getCompactList(list);
  for (const [index, address] of list.entries()) {
    const compactAddress = compactList[index];
    if (!compactAddress) continue;
    if (keywords.every((keyword) => compactAddress.includes(keyword))) {
      matches.push(address);
      if (matches.length > safeLimit) break;
      continue;
    }
    if (matches.length >= safeLimit) continue;

    const fuzzyMatch = findFuzzyMatch(compactQuery, compactAddress);
    if (fuzzyMatch && fuzzyMatch.runs <= maxFuzzyRuns) {
      fuzzyMatches.push({ address, ...fuzzyMatch });
    }
  }

  fuzzyMatches.sort((a, b) => a.runs - b.runs || a.span - b.span);
  const ranked = [...matches, ...fuzzyMatches.map((match) => match.address)];
  return {
    matches: ranked.slice(0, safeLimit),
    hasMore: ranked.length > safeLimit,
    prefixMatch: null,
  };
}

/**
 * Source-string ranges of the suggestion characters that matched the query,
 * for highlighting. A trailing house number is ignored.
 */
export function getMatchRanges(query, address) {
  const addressData = compactSearchTextWithSource(address);
  const split = splitAtAddressSuffix(query);
  const match =
    findFuzzyMatch(compactSearchText(query), addressData.compact) ||
    (split && findFuzzyMatch(compactSearchText(split.road), addressData.compact));
  if (!match) return [];

  const ranges = [];
  for (const index of match.indices) {
    const start = addressData.sourceStarts[index];
    const end = addressData.sourceEnds[index];
    const last = ranges[ranges.length - 1];
    if (last && last[1] === start) last[1] = end;
    else ranges.push([start, end]);
  }
  return ranges;
}

// The units that can follow a number, by the last unit written before it.
const NEXT_UNITS = { '': ['號', '巷'], 巷: ['號', '弄'], 弄: ['號'], 號: ['樓', '室'], 樓: ['室'] };

// A numbered pair (25-1, 3-1) is an attached house number on a road, lane or
// alley, and a room number after a house number or floor.
const PAIR_UNITS = { '': ['號'], 巷: ['號'], 弄: ['號'], 號: ['室'], 樓: ['室'] };

/**
 * Complete a number typed at the end of an address with the units that can
 * follow it: "…路25" offers "…路25號" and "…路25巷", "…號3-1" offers
 * "…號3-1室". A branch right after a unit (25號之1) needs nothing more.
 */
export function getUnitCompletions(query) {
  const text = String(query ?? '').trimEnd();
  const normalized = text.normalize('NFKC');
  if (!/\d$/u.test(normalized)) return [];
  let before = normalized.replace(/\d+$/u, '');
  let next = NEXT_UNITS;
  if (/[之-]\s*$/u.test(before)) {
    const pair = before.match(/^(.*?)\d+\s*[之-]\s*$/u);
    if (!pair) return [];
    before = pair[1];
    next = PAIR_UNITS;
  }
  const units = before.match(/[巷弄號樓室]/gu);
  const last = units ? units[units.length - 1] : '';
  return (next[last] ?? []).map((unit) => `${text}${unit}`);
}

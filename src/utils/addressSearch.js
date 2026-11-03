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
  const sourceEnds = [];
  let sourceIndex = 0;

  for (const sourceCharacter of source) {
    sourceIndex += sourceCharacter.length;
    const normalizedCharacter = sourceCharacter
      .normalize('NFKC')
      .replaceAll('台', '臺');
    for (const character of normalizedCharacter) {
      if (/\s/u.test(character)) continue;
      compact.push(character);
      sourceEnds.push(sourceIndex);
    }
  }

  return { compact: compact.join(''), sourceEnds };
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

/**
 * Find the longest canonical road name at the start of a pasted address.
 * Returning the remaining text lets the caller open the detail view with the
 * house number already filled in.
 */
export function findLongestAddressPrefix(query, addresses) {
  const compactQuery = compactSearchTextWithSource(query).compact;
  if (!compactQuery || !Array.isArray(addresses)) return null;

  let best = null;
  for (const address of addresses) {
    if (typeof address !== 'string' || !address) continue;
    const compactAddress = compactSearchText(address);
    if (!compactAddress || !compactQuery.startsWith(compactAddress)) continue;

    if (!best || compactAddress.length > best.compactAddress.length) {
      best = {
        address,
        suffix: suffixAfterPrefix(query, compactAddress),
        compactAddress,
      };
    }
  }

  if (!best) return null;
  return { address: best.address, suffix: best.suffix };
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
      suffix: roadKeyword && compactAddress.includes(roadKeyword) ? split.suffix : '',
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
  let hasMore = false;
  for (const address of list) {
    if (typeof address !== 'string' || !address) continue;
    const compactAddress = compactSearchText(address);
    if (!keywords.every((keyword) => compactAddress.includes(keyword))) {
      continue;
    }

    if (matches.length < safeLimit) {
      matches.push(address);
    } else {
      hasMore = true;
      break;
    }
  }

  return { matches, hasMore, prefixMatch: null };
}

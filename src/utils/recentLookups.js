import { compactSearchText } from './addressSearch.js';

export const RECENT_LOOKUP_LIMIT = 6;

function lookupKey(lookup) {
  return compactSearchText(`${lookup.road}${lookup.suffix}`);
}

/**
 * Put a resolved lookup at the front. Earlier entries for the same road whose
 * house number is a prefix of the new one ("12號" → "12號3樓") are drafts of
 * the same address, so they are replaced rather than kept.
 */
export function addRecentLookup(lookups, entry, limit = RECENT_LOOKUP_LIMIT) {
  const key = lookupKey(entry);
  const rest = lookups.filter(
    (lookup) => lookup.road !== entry.road || !key.startsWith(lookupKey(lookup)),
  );
  return [entry, ...rest].slice(0, limit);
}

export function parseRecentLookups(value) {
  try {
    const parsed = JSON.parse(value ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (lookup) =>
          typeof lookup?.road === 'string' &&
          lookup.road &&
          typeof lookup.suffix === 'string' &&
          /^\d{6}$/u.test(lookup.zipcode),
      )
      .map(({ road, suffix, zipcode }) => ({ road, suffix, zipcode }))
      .slice(0, RECENT_LOOKUP_LIMIT);
  } catch {
    return [];
  }
}

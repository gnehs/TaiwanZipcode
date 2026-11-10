import { buildDistrictCodes } from './districtCodes.js';

// An address is named by a slug: a road as the database spells it, with its
// city and district, then the house number as typed. Where the slug goes in
// a URL depends on whether the address is being looked up or shared.
//   in the app   /#<district>/<rest>  the hash never reaches a server
//   shared       /a/<district>/<rest>  <rest> is the slug after the district
//   shared once  /a/<slug>             redirected to the form above
// A city or district has a page of its own one level up: /a/<city> lists
// its districts and /a/<district> its roads.

// Chinese stays readable, and only characters that would end or break a link
// (spaces, #, ?, %) are escaped.
export const readable = (text) => text.replace(/[^\p{L}\p{N}\-._~]/gu, encodeURIComponent);

export function createAddressUrls(database) {
  const codes = buildDistrictCodes(database);
  const districtOfRoad = new Map();
  const placeOfDistrict = new Map();
  for (const [city, { areas }] of Object.entries(database)) {
    for (const [area, { roads }] of Object.entries(areas)) {
      placeOfDistrict.set(`${city}${area}`, { city, area });
      for (const road of Object.keys(roads)) districtOfRoad.set(`${city}${area}${road}`, `${city}${area}`);
    }
  }

  function addressSlug(road, suffix) {
    return districtOfRoad.has(road) ? `${road}${suffix.trim()}` : null;
  }

  // Some roads begin with another road's name, so the longest one is the road.
  function parseAddressSlug(slug) {
    for (let end = slug.length; end > 0; end--) {
      const road = slug.slice(0, end);
      if (districtOfRoad.has(road)) return { road, suffix: slug.slice(end) };
    }
    return null;
  }

  function splitSlug(slug) {
    const address = parseAddressSlug(slug);
    if (!address) return null;
    const district = districtOfRoad.get(address.road);
    return { segment: codes.segmentOf(district), rest: slug.slice(district.length) };
  }

  function sharePath(slug) {
    const parts = splitSlug(slug);
    return parts && `/a/${encodeURIComponent(parts.segment)}/${encodeURIComponent(parts.rest)}`;
  }

  function shareUrl(origin, slug) {
    const parts = splitSlug(slug);
    return parts && `${origin}/a/${readable(parts.segment)}/${readable(parts.rest)}`;
  }

  function decode(text) {
    try {
      return decodeURIComponent(text);
    } catch {
      return null;
    }
  }

  // The slug of a district (code or name) and the rest, both already decoded,
  // or null when they do not name an address.
  function slugOfShareParts(segment, rest) {
    const district = codes.districtOf(segment);
    if (!district || !rest) return null;
    const slug = `${district}${rest}`;
    const address = parseAddressSlug(slug);
    return address && districtOfRoad.get(address.road) === district ? slug : null;
  }

  function slugOfSharePath(pathname) {
    const [, prefix, segment, rest, ...extra] = pathname.split('/');
    if (prefix !== 'a' || !segment || !rest || extra.length) return null;
    const district = decode(segment);
    const text = decode(rest);
    return district === null || text === null ? null : slugOfShareParts(district, text);
  }

  // The new path of a link shared as /a/<slug>, or null for any other path.
  function currentSharePath(pathname) {
    const [, prefix, segment, ...extra] = pathname.split('/');
    if (prefix !== 'a' || !segment || extra.length) return null;
    const slug = decode(segment);
    return slug === null ? null : sharePath(slug);
  }

  // The segment that names a city or district (no area for a city).
  /** @param {string} city @param {string | null} area */
  function placeSegment(city, area) {
    return area ? codes.segmentOf(`${city}${area}`) : city in database ? city : null;
  }

  /** @param {string} city @param {string | null} [area] */
  function placePath(city, area = null) {
    const segment = placeSegment(city, area);
    return segment && `/a/${encodeURIComponent(segment)}`;
  }

  /** @param {string} origin @param {string} city @param {string | null} [area] */
  function placeUrl(origin, city, area = null) {
    const segment = placeSegment(city, area);
    return segment && `${origin}/a/${readable(segment)}`;
  }

  // The city, and the district within it, that a path names; area is null
  // for a city's own page.
  function placeOfPath(pathname) {
    const [, prefix, segment, ...extra] = pathname.split('/');
    if (prefix !== 'a' || !segment || extra.length) return null;
    const name = decode(segment);
    if (name === null) return null;
    if (Object.hasOwn(database, name)) return { city: name, area: null };
    const district = codes.districtOf(name);
    return district ? placeOfDistrict.get(district) : null;
  }

  function hashOfSlug(slug) {
    const parts = splitSlug(slug);
    return parts ? `${readable(parts.segment)}/${readable(parts.rest)}` : readable(slug);
  }

  // The router hands the hash over already decoded. A hash made before the
  // district was shortened holds the whole slug.
  function slugOfHash(hash) {
    const text = hash.replace(/^#/, '');
    const split = text.indexOf('/');
    if (split > 0) return slugOfShareParts(text.slice(0, split), text.slice(split + 1));
    return parseAddressSlug(text) ? text : null;
  }

  // Links made before the address moved into the hash, either #z=…&a=…&s=…
  // or the older #zipcode_address_suffix.
  function slugOfLegacyHash(hash) {
    const raw = hash.replace(/^#/, '');
    try {
      if (raw.startsWith('z=')) {
        const params = new URLSearchParams(raw);
        return addressSlug(params.get('a') || '', params.get('s') || '');
      }
      const [, address = '', ...suffix] = decodeURIComponent(raw).split('_');
      return addressSlug(address, suffix.join('_'));
    } catch {
      return null;
    }
  }

  return {
    addressSlug,
    parseAddressSlug,
    sharePath,
    shareUrl,
    placePath,
    placeUrl,
    placeOfPath,
    slugOfShareParts,
    slugOfSharePath,
    currentSharePath,
    hashOfSlug,
    slugOfHash,
    slugOfLegacyHash,
  };
}

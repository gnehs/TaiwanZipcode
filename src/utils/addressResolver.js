import {
  cleanAddressSuffix,
  cleanAddressText,
  collapseRepeatedUnits,
  withoutVillage,
} from './addressCleanup.js';
import { expandPlaceAliases } from './placeAliases.js';

const ROAD_TYPES = ['路', '街', '大道'];
const MAX_ROAD_LENGTH = 24;

/**
 * A house-number suffix begins with a number (or 地下); anything else means
 * the road was read too short, as when the village 山頂 is taken for the road
 * in 山頂里宏德司法新村108號.
 */
function isHouseSuffix(suffix) {
  return !suffix.trim() || /^\s*(?:\d|地下)/u.test(suffix);
}

// A road is only accepted where the house number (or a lane) follows it.
function endsAtNumber(text, index) {
  return index >= text.length || /[\d巷弄]/u.test(text[index]);
}

// The longest key of `map` that `text` starts with.
function longestPrefix(text, map, maxLength) {
  for (let length = Math.min(maxLength, text.length); length > 0; length -= 1) {
    const key = text.slice(0, length);
    if (map.has(key)) return key;
  }
  return null;
}

/**
 * Build a resolver over every known place. `lookup(text)` must return the
 * road it recognises at the start of `text` (or an empty road) plus the rest
 * as `addressSuffix`.
 *
 * `corrections` holds the postal service's own lookup tables, when loaded:
 * `roads` (misspelt → real road, per district), `words` (wrong → right
 * anywhere), `places` (abbreviated or former district names, see
 * placeAliases.js) and `parks`
 * (industrial and science park names → their district).
 *
 * The resolver first cleans spellings, then tries readings in order of how
 * little they assume: the text as written, the text without a village name,
 * a known misspelling in the stated district, and finally readings that fill
 * in or replace the city or district. A guess is only made when exactly one
 * place fits.
 *
 * @param {{ city: string, area: string, road: string }[]} places
 * @param {(text: string) => { road: string, addressSuffix: string }} lookup
 * @param {{
 *   roads?: Record<string, Record<string, string>>,
 *   words?: string[][],
 *   places?: Parameters<typeof expandPlaceAliases>[1],
 *   parks?: Record<string, string>,
 * } | null} [corrections]
 */
export function createAddressResolver(places, lookup, corrections = null) {
  const cities = new Set();
  const areasByCity = new Map();
  const citiesByArea = new Map();
  const roadsByName = new Map();
  const cityAreas = new Set();

  for (const { city, area, road } of places) {
    cities.add(city);
    cityAreas.add(`${city}${area}`);
    if (!areasByCity.has(city)) areasByCity.set(city, new Set());
    areasByCity.get(city).add(area);
    if (!citiesByArea.has(area)) citiesByArea.set(area, new Set());
    citiesByArea.get(area).add(city);
    if (!roadsByName.has(road)) roadsByName.set(road, []);
    roadsByName.get(road).push({ city, area, road });
  }
  const hasArea = (name) => cityAreas.has(name);
  const splitPlace = (place) => {
    const city = [...cities].find((name) => place.startsWith(name));
    return city ? { city, area: place.slice(city.length) } : null;
  };

  // A misspelt name maps to the real road in each district that lists it.
  const correctedByName = new Map();
  for (const [place, roads] of Object.entries(corrections?.roads ?? {})) {
    const split = splitPlace(place);
    if (!split) continue;
    for (const [from, to] of Object.entries(roads)) {
      if (!correctedByName.has(from)) correctedByName.set(from, []);
      correctedByName.get(from).push({ ...split, road: to });
    }
  }
  const districts = [...cityAreas].map(splitPlace);
  const placeAliases = corrections?.places
    ? expandPlaceAliases(districts, corrections.places)
    : new Map();
  const placeAliasLength = Math.max(0, ...[...placeAliases.keys()].map((key) => key.length));
  const parks = Object.entries(corrections?.parks ?? {}).sort(([a], [b]) => b.length - a.length);
  const words = corrections?.words ?? [];

  const inScope = (scope) => (place) =>
    (!scope.city || place.city === scope.city) && (!scope.area || place.area === scope.area);

  // The longest road at `start` that lies in one district of the scope: a
  // real road, a real road missing its 路/街/大道 (莊敬168), or a listed
  // misspelling of one. Real roads win over misspellings of the same length.
  function roadAt(text, start, scope) {
    for (let length = Math.min(MAX_ROAD_LENGTH, text.length - start); length >= 2; length -= 1) {
      if (!endsAtNumber(text, start + length)) continue;
      const written = text.slice(start, start + length);
      const names = [written, ...ROAD_TYPES.map((type) => `${written}${type}`)];
      for (const source of [roadsByName, correctedByName]) {
        for (const name of names) {
          const matches = (source.get(name) ?? []).filter(inScope(scope));
          const districts = new Set(matches.map((place) => `${place.city}${place.area}`));
          if (districts.size === 1) {
            return { ...matches[0], rest: text.slice(start + length) };
          }
        }
      }
    }
    return null;
  }

  // Where a road may start after the city: right away, or after a district
  // the city does not have (新竹區). Other words before the road are not
  // skipped, since they are as likely part of its name (艋舺大道路).
  function roadAfterCity(text, city) {
    const starts = [0];
    const fakeArea = text.match(/^\S{1,4}?[區鄉鎮市]/u)?.[0];
    if (fakeArea && !areasByCity.get(city).has(fakeArea)) starts.push(fakeArea.length);
    for (const start of starts) {
      const road = roadAt(text, start, { city });
      if (road) return road;
    }
    return null;
  }

  function* readings(text, aliased = false) {
    yield text;

    // Some short forms are the start of the full name (臺北市中正 for
    // 臺北市中正區), so a text already written in full is left alone.
    // A bare short form followed by a road type is the road's own name
    // (太平路); one ending in a district suffix is a district either way.
    const alias = aliased ? null : longestPrefix(text, placeAliases, placeAliasLength);
    if (
      alias &&
      !text.startsWith(placeAliases.get(alias)) &&
      (/[區鄉鎮市]$/u.test(alias) || !/^(?:路|街|大道|巷|段)/u.test(text.slice(alias.length)))
    ) {
      yield* readings(`${placeAliases.get(alias)}${text.slice(alias.length)}`, true);
      return;
    }

    const city = [...cities].find((name) => text.startsWith(name));
    const afterCity = city ? text.slice(city.length) : text;

    // A park named where the district belongs: 臺北市內湖科技園區瑞光路….
    for (const [name, place] of parks) {
      const index = afterCity.indexOf(name);
      if (index < 0 || index > 4) continue;
      const split = splitPlace(place);
      if (!split || (city && split.city !== city)) continue;
      const rest = afterCity.slice(index + name.length);
      const afterArea = split.area && rest.startsWith(split.area) ? rest.slice(split.area.length) : rest;
      yield* readings(`${split.city}${split.area}${afterArea}`, true);
      return;
    }

    const area = city
      ? [...areasByCity.get(city)].find((name) => afterCity.startsWith(name))
      : [...citiesByArea.keys()].find((name) => text.startsWith(name));

    if (city && area) {
      const afterArea = afterCity.slice(area.length);
      for (const rest of withoutVillage(afterArea)) yield `${city}${area}${rest}`;
      // A misspelling listed for this district comes before any guess that
      // moves the address to another one.
      for (const rest of [afterArea, ...withoutVillage(afterArea)]) {
        const road = roadAt(rest, 0, { city, area });
        if (road) yield `${city}${area}${road.road}${road.rest}`;
      }
      const elsewhere = roadAt(afterArea, 0, { city });
      if (elsewhere) yield `${city}${elsewhere.area}${elsewhere.road}${elsewhere.rest}`;
      return;
    }

    if (city) {
      // A district written after a landmark: 新竹市新竹科學園區東區….
      for (const name of areasByCity.get(city)) {
        const index = afterCity.indexOf(name);
        if (index > 0) yield `${city}${afterCity.slice(index)}`;
      }
      const road = roadAfterCity(afterCity, city);
      if (road) yield `${city}${road.area}${road.road}${road.rest}`;
      return;
    }

    if (area) {
      const owners = citiesByArea.get(area);
      if (owners.size === 1) yield* readings(`${[...owners][0]}${text}`, aliased);
      return;
    }

    // Only a road: it must start the text and exist in one district.
    const road = roadAt(text, 0, {});
    if (road) yield `${road.city}${road.area}${road.road}${road.rest}`;
  }

  function finish(result, options) {
    if (!result.road) return result;
    const suffix = cleanAddressSuffix(result.addressSuffix, options);
    return suffix === result.addressSuffix ? result : lookup(`${result.road}${suffix}`);
  }

  function correctWords(text) {
    let corrected = text;
    for (const [wrong, right] of words) corrected = corrected.replaceAll(wrong, right);
    return corrected;
  }

  /**
   * @param {string} input
   * @param {{ bareNumberIsHouse?: boolean }} [options] set for finished text
   *   (a pasted list), where `莊敬168` means house number 168.
   */
  return function resolve(input, options = {}) {
    const cleaned = cleanAddressText(input, hasArea);
    const corrected = correctWords(cleaned);
    const spellings = [...new Set([cleaned, corrected, collapseRepeatedUnits(corrected)])];
    // A reading whose house number is not a number is kept only as a last
    // resort, after every spelling has had its chance (丹陽街街3號).
    let fallback = null;
    for (const spelling of spellings) {
      for (const reading of readings(spelling.replace(/\s+/gu, ''))) {
        const result = finish(lookup(reading), options);
        if (!result.road) continue;
        if (isHouseSuffix(result.addressSuffix)) return result;
        fallback ??= result;
      }
    }
    return fallback ?? lookup(cleaned);
  };
}

/**
 * Abbreviated and former place names follow a few patterns: a city written
 * in short (北市, 新北) or by another name (臺北縣), and a district written
 * without its suffix (金山) or with a former one (金山鄉). The data keeps only
 * the parts no pattern produces, and this module expands them into every
 * written form, so the converter and the browser read them the same way.
 */

const AREA_SUFFIXES = ['區', '鄉', '鎮', '市'];

function stemOf(name) {
  return /[區鄉鎮市縣]$/u.test(name) && Array.from(name).length > 2 ? name.slice(0, -1) : null;
}

// A district as written: in full, or its stem (at least two characters) bare
// or with any district suffix. Misspelt stems (蘆州 for 蘆洲) are added too.
export function areaForms(area, misspeltStems = []) {
  const forms = new Set([area]);
  for (const stem of [stemOf(area), ...misspeltStems]) {
    if (!stem) continue;
    forms.add(stem);
    for (const suffix of AREA_SUFFIXES) forms.add(`${stem}${suffix}`);
  }
  return forms;
}

/**
 * @param {{ city: string, area: string }[]} districts
 * @param {{
 *   cities?: Record<string, string[]>,
 *   areas?: Record<string, Record<string, string>>,
 *   names?: Record<string, string>,
 * }} compact `cities`: another written form → the cities it can mean;
 *   `areas`: per city, a misspelt stem → the district; `names`: forms no
 *   pattern produces.
 * @returns {Map<string, string>} written form → "city + district"
 */
export function expandPlaceAliases(districts, compact = {}) {
  const aliases = new Map();
  const add = (alias, place) => {
    if (!alias || alias === place) return;
    // A form that could mean two places means neither.
    aliases.set(alias, aliases.has(alias) && aliases.get(alias) !== place ? null : place);
  };

  const otherNames = new Map();
  for (const [alias, cities] of Object.entries(compact.cities ?? {})) {
    for (const city of cities) {
      if (!otherNames.has(city)) otherNames.set(city, []);
      otherNames.get(city).push(alias);
    }
  }
  const misspelt = new Map();
  for (const [city, stems] of Object.entries(compact.areas ?? {})) {
    for (const [stem, area] of Object.entries(stems)) {
      const key = `${city}${area}`;
      if (!misspelt.has(key)) misspelt.set(key, []);
      misspelt.get(key).push(stem);
    }
  }

  for (const { city, area } of districts) {
    const place = `${city}${area}`;
    const cityForms = [city, stemOf(city), ...(otherNames.get(city) ?? [])].filter(Boolean);
    for (const form of areaForms(area, misspelt.get(place))) {
      for (const cityForm of cityForms) add(`${cityForm}${form}`, place);
      // Without a city only a suffixed district is a place name; a bare
      // stem is as likely the start of a road (成功 in 成功路).
      if (AREA_SUFFIXES.some((suffix) => form.endsWith(suffix))) add(form, place);
    }
  }
  for (const [alias, place] of Object.entries(compact.names ?? {})) aliases.set(alias, place);

  for (const [alias, place] of aliases) if (place === null) aliases.delete(alias);
  return aliases;
}

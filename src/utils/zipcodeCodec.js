/**
 * Compact text forms of the zipcode database and the road corrections. Both
 * are shipped to every visitor, so they drop what can be rebuilt: field
 * names, the three digits a district's zipcodes share, padding in rule text,
 * and English that follows from the Chinese name. The converter encodes and
 * checks that decoding gives back exactly what it started from.
 *
 * zipcode.txt, one record per line:
 *   #city⇥English
 *   @district⇥English⇥shared first three digits
 *   road⇥English⇥zipcode:rule[|bulk recipient]⇥…
 * A zipcode of three digits follows the district's shared prefix. Road
 * English is stored as described at `encodeRoadEnglish`.
 */

const SECTIONS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const ROAD_TYPES = [
  ['大道', ' Blvd.'],
  ['路', ' Rd.'],
  ['街', ' St.'],
  ['巷', ' Ln.'],
];
const FIELD_BREAK = /[\t\n|]/u;

function splitSection(road) {
  const match = road.match(/^(.*?)([一二三四五六七八九十])段$/u);
  return match ? { base: match[1], section: SECTIONS.indexOf(match[2]) } : { base: road, section: 0 };
}

/**
 * Road English as stored: "Sec. N, " is dropped when the road ends in N段,
 * and the " Rd." of a 路 (" St." of a 街, …) is dropped too, leaving only the
 * name; a leading "!" marks English that keeps its own ending, and a leading
 * "~" English that keeps its own section. An empty field repeats the English
 * last given for the same name without its section, since most names recur
 * across districts.
 */
function englishKey(road) {
  return splitSection(road).base;
}

function encodeRoadEnglish(road, english, seen) {
  const { base, section } = splitSection(road);
  const prefix = `Sec. ${section}, `;
  const dropsSection = section > 0 && english.startsWith(prefix);
  const name = dropsSection ? base : road;
  const rest = dropsSection ? english.slice(prefix.length) : english;
  const type = ROAD_TYPES.find(([zh]) => name.endsWith(zh));
  const token = type && rest.endsWith(type[1]) && !rest.includes(',')
    ? rest.slice(0, -type[1].length)
    : `!${rest}`;
  if (section > 0 && !dropsSection) return `~${token}`;
  if (seen.get(englishKey(road)) === token) return '';
  seen.set(englishKey(road), token);
  return token;
}

function decodeRoadEnglish(road, field, seen) {
  const { base, section } = splitSection(road);
  const keepsSection = field.startsWith('~');
  let token = keepsSection ? field.slice(1) : field;
  if (!keepsSection) {
    if (token === '') token = seen.get(englishKey(road));
    else seen.set(englishKey(road), token);
  }
  const dropsSection = section > 0 && !keepsSection;
  const name = dropsSection ? base : road;
  const type = ROAD_TYPES.find(([zh]) => name.endsWith(zh));
  const rest = token.startsWith('!') ? token.slice(1) : `${token}${type ? type[1] : ''}`;
  return dropsSection ? `Sec. ${section}, ${rest}` : rest;
}

function sharedPrefix(roads) {
  const counts = new Map();
  for (const { scopes } of Object.values(roads)) {
    for (const { zipcode } of scopes) {
      const prefix = String(zipcode).slice(0, 3);
      counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

function checkField(value) {
  if (FIELD_BREAK.test(value)) throw new Error(`A field contains a separator: ${JSON.stringify(value)}`);
  return value;
}

export function compactRule(scope) {
  return String(scope).replace(/[\s　]+/gu, ' ').trim();
}

/** @param {Record<string, any>} database the converter's zipcode.json */
export function encodeZipcodeData(database) {
  const lines = [];
  for (const [city, { en, areas }] of Object.entries(database)) {
    lines.push(`#${checkField(city)}\t${checkField(en)}`);
    for (const [area, { en: areaEn, roads }] of Object.entries(areas)) {
      const prefix = sharedPrefix(roads);
      lines.push(`@${checkField(area)}\t${checkField(areaEn)}\t${prefix}`);
      const seen = new Map();
      for (const [road, { en: roadEn, scopes }] of Object.entries(roads)) {
        const fields = [checkField(road), checkField(encodeRoadEnglish(road, roadEn, seen))];
        for (const { zipcode, scope, department } of scopes) {
          const code = String(zipcode);
          const zip = code.startsWith(prefix) ? code.slice(3) : code;
          const rule = checkField(compactRule(scope));
          if (rule.includes(':')) throw new Error(`A rule contains a colon: ${rule}`);
          fields.push(`${zip}:${rule}${department ? `|${checkField(department)}` : ''}`);
        }
        lines.push(fields.join('\t'));
      }
    }
  }
  return lines.join('\n');
}

export function decodeZipcodeData(text) {
  const database = {};
  let city = null;
  let area = null;
  let prefix = '';
  let seen = new Map();
  for (const line of text.split('\n')) {
    if (!line) continue;
    const fields = line.split('\t');
    if (line[0] === '#') {
      city = { en: fields[1], areas: {} };
      database[fields[0].slice(1)] = city;
    } else if (line[0] === '@') {
      area = { en: fields[1], roads: {} };
      city.areas[fields[0].slice(1)] = area;
      prefix = fields[2];
      seen = new Map();
    } else {
      const [road, english, ...scopes] = fields;
      area.roads[road] = {
        en: decodeRoadEnglish(road, english, seen),
        scopes: scopes.map((field) => {
          const colon = field.indexOf(':');
          const zip = field.slice(0, colon);
          const [scope, department] = field.slice(colon + 1).split('|');
          const item = { scope, zipcode: Number(zip.length === 3 ? `${prefix}${zip}` : zip) };
          if (department) item.department = department;
          return item;
        }),
      };
    }
  }
  return database;
}

// A misspelling as an edit of the road it means: ".太3" puts 太 in place
// of the fourth character, "+路2" adds 路 before the third, "-1" drops the
// second, and "=名稱" spells out anything else. The character comes before
// the position so a digit in a name (本街1巷) cannot run into it.
function encodeEdit(from, to) {
  const source = Array.from(from);
  const target = Array.from(to);
  if (source.length === target.length) {
    const changed = target
      .map((character, index) => (character === source[index] ? -1 : index))
      .filter((index) => index >= 0);
    if (changed.length === 1) return `.${source[changed[0]]}${changed[0]}`;
  }
  if (source.length === target.length + 1) {
    for (let index = 0; index < source.length; index += 1) {
      if ([...source.slice(0, index), ...source.slice(index + 1)].join('') === to) {
        return `+${source[index]}${index}`;
      }
    }
  }
  if (source.length === target.length - 1) {
    for (let index = 0; index < target.length; index += 1) {
      if ([...target.slice(0, index), ...target.slice(index + 1)].join('') === from) return `-${index}`;
    }
  }
  return `=${from}`;
}

function decodeEdit(edit, to) {
  const target = Array.from(to);
  const operation = edit[0];
  if (operation === '=') return edit.slice(1);
  if (operation === '-') {
    const index = Number(edit.slice(1));
    return [...target.slice(0, index), ...target.slice(index + 1)].join('');
  }
  const [character, ...digits] = Array.from(edit.slice(1));
  const index = Number(digits.join(''));
  const kept = operation === '+' ? target.slice(index) : target.slice(index + 1);
  return [...target.slice(0, index), character, ...kept].join('');
}

/**
 * Road corrections, one district per line: "city+district⇥entry,entry…".
 * Each entry is the gap from the previous entry's road index in that
 * district's road list, then the edit that spells the misspelling.
 *
 * @param {Record<string, Record<string, string>>} roads
 * @param {Map<string, string[]>} roadLists road names in database order
 */
export function encodeRoadCorrections(roads, roadLists) {
  const lines = [];
  for (const [place, corrections] of Object.entries(roads)) {
    const index = new Map(roadLists.get(place).map((road, position) => [road, position]));
    const entries = Object.entries(corrections)
      .map(([from, to]) => [index.get(to), encodeEdit(from, to)])
      .sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1));
    let previous = 0;
    const fields = entries.map(([position, edit]) => {
      if (/[,\t\n]/u.test(edit)) throw new Error(`An edit contains a separator: ${edit}`);
      const field = `${position - previous}${edit}`;
      previous = position;
      return field;
    });
    lines.push(`${checkField(place)}\t${fields.join(',')}`);
  }
  return lines.join('\n');
}

export function decodeRoadCorrections(text, roadLists) {
  const roads = {};
  for (const line of text.split('\n')) {
    if (!line) continue;
    const [place, list] = line.split('\t');
    const names = roadLists.get(place);
    const corrections = {};
    let position = 0;
    for (const field of list.split(',')) {
      const match = field.match(/^(\d+)(.*)$/u);
      position += Number(match[1]);
      const to = names[position];
      corrections[decodeEdit(match[2], to)] = to;
    }
    roads[place] = corrections;
  }
  return roads;
}

/** Road names per "city+district", in database order. */
export function roadListsOf(database) {
  const lists = new Map();
  for (const [city, { areas }] of Object.entries(database)) {
    for (const [area, { roads }] of Object.entries(areas)) lists.set(`${city}${area}`, Object.keys(roads));
  }
  return lists;
}

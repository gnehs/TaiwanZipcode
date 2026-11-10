/*
 * Reads an English (or mixed English/Chinese) Taiwanese address back into the
 * Chinese address the rest of the app parses.
 *
 * Input and the database's own English go through the same reader, so a name
 * matches when both sides reduce to the same words. An address is read as
 * units (No. 10, 25 Ln, 3F, Sec. 5, ...) plus the leftover words; every run of
 * words is looked up as a city, district or road name, and the consistent
 * combination that leaves the fewest words unexplained wins.
 */

const SECTIONS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

const WORD_FORMS = {
  rd: 'road',
  st: 'street',
  str: 'street',
  ave: 'avenue',
  av: 'avenue',
  blvd: 'boulevard',
  ln: 'lane',
  aly: 'alley',
  dist: 'district',
  twp: 'township',
  vil: 'village',
  hwy: 'highway',
  bldg: 'building',
  e: 'east',
  w: 'west',
  s: 'south',
  n: 'north',
};
const DROPPED_WORDS = new Set(['no', 'number', 'sec', 'section', 'floor', 'room', 'rm', 'of', 'the']);

const CITY_TYPES = new Set(['city', 'county']);
const AREA_TYPES = new Set(['district', 'township', 'city']);
const ROAD_TYPES = new Set(['road', 'street', 'avenue', 'boulevard', 'lane', 'village', 'highway']);

// Spellings still in use that differ from the database's. Keys and values are
// name keys (lowercase, no spaces or apostrophes) and apply to cities and
// districts alike, so "ilan" reaches both 宜蘭縣 and its 宜蘭市.
const NAME_ALIASES = {
  taibei: 'taipei',
  xinbei: 'newtaipei',
  taizhong: 'taichung',
  gaoxiong: 'kaohsiung',
  jilong: 'keelung',
  xinzhu: 'hsinchu',
  jiayi: 'chiayi',
  zhanghua: 'changhua',
  pingdong: 'pingtung',
  hualian: 'hualien',
  taidong: 'taitung',
  ilan: 'yilan',
  jinmen: 'kinmen',
  quemoy: 'kinmen',
  lianjiang: 'lienchiang',
  matsu: 'lienchiang',
  danshui: 'tamsui',
  taan: 'daan',
  panchiao: 'banqiao',
  hsintien: 'xindian',
  yungho: 'yonghe',
  chungho: 'zhonghe',
  sanchung: 'sanchong',
  hsinchuang: 'xinzhuang',
  hsichih: 'xizhi',
  shihlin: 'shilin',
  peitou: 'beitou',
  sungshan: 'songshan',
  nankang: 'nangang',
  chungcheng: 'zhongzheng',
  chungshan: 'zhongshan',
  hsinyi: 'xinyi',
  chungli: 'zhongli',
  chupei: 'zhubei',
  tsoying: 'zuoying',
};

// Counties merged into a city in 2010 and 2014; old addresses still use them.
const FORMER_COUNTIES = {
  taipei: '新北市',
  taoyuan: '桃園市',
  taichung: '臺中市',
  tainan: '臺南市',
  kaohsiung: '高雄市',
};

const PENALTY = {
  untypedCity: 0.5,
  untypedArea: 1,
  nearArea: 0.5,
  wrongArea: 2,
  untypedRoad: 1.5,
  untypedNamedPlace: 1,
  wrongRoad: 3,
  missingSection: 0.5,
  missingUnit: 1,
  prefix: 2,
};
const KIND_RANK = { city: 0, district: 1, road: 2 };
const MAX_SPAN = 8;
const UNNARROWED_ROAD_PREFIX_LIMIT = 300;

function bare(word) {
  return word.replace(/['’-]/gu, '');
}

function canon(word) {
  const ordinal = word.match(/^(\d+)(?:st|nd|rd|th)$/u);
  if (ordinal) return ordinal[1];
  return WORD_FORMS[word] ?? word;
}

function unitKey(unit) {
  const dash = unit.dash ? `-${unit.dash}` : '';
  return `${unit.type}:${unit.basement ? 'B' : ''}${unit.value}${dash}`;
}

function arabicSection(text) {
  return text.replace(/(\d+)\s*段/gu, (match, digits) => (SECTIONS[Number(digits)] ? `${SECTIONS[Number(digits)]}段` : match));
}

/**
 * Splits text into address units, Chinese runs and canonical Latin words.
 * Every recognised piece is replaced by "|" so the words on either side never
 * join into one name.
 */
function readText(input) {
  let text = arabicSection(String(input ?? '').normalize('NFKC'))
    .replace(/台/gu, '臺')
    .replace(/[‐‑‒–—−]/gu, '-');
  const units = [];
  let zip = null;
  const add = (type, value, extra = {}) => {
    if (value === undefined || value === null || value === '') return;
    const unit = { type, value: String(value), ...extra };
    units.push({ ...unit, key: unitKey(unit) });
  };
  const take = (pattern, read) => {
    text = text.replace(pattern, (...match) => (read(...match) === false ? match[0] : '|'));
  };

  take(/([0-9A-Za-z]+(?:\s*[之-]\s*[0-9A-Za-z]+)*)\s*室/gu, (_, room) => add('room', room.replace(/\s*[之-]\s*/gu, '-').toUpperCase()));
  take(/(\d+)\s*(?:[之-]\s*(\d+)\s*)?號(?:\s*[之-]\s*(\d+))?/gu, (_, no, a, b) => add('no', no, { dash: a ?? b }));
  take(/(地下)?\s*(\d+)\s*樓(?:\s*[之-]\s*(\d+))?/gu, (_, basement, floor, dash) => add('floor', floor, { basement: Boolean(basement), dash }));
  take(/(\d+)\s*巷/gu, (_, lane) => add('lane', lane));
  take(/(\d+)\s*弄/gu, (_, alley) => add('alley', alley));
  take(/(\d+)\s*衖/gu, (_, sub) => add('sub', sub));

  take(/\btaiwan\b(?!\s*(?:blvd|boulevard|rd|road|st|street|ave|avenue)\b)\s*(?:\(?\s*r\s*\.?\s*o\s*\.?\s*c\b\s*\.?\s*\)?)?|\(?\br\s*\.\s*o\s*\.\s*c\s*\.?\)?|\broc\b|\brepublic of china\b/giu, () => {});
  take(/(?:\bno\b\.?|\bnumber\b|#)\s*(\d+)(?:\s*[-之]\s*(\d+))?/giu, (_, no, dash) => add('no', no, { dash }));
  take(/\bsec(?:tion)?\b\.?\s*(\d+)\b|\b(\d+)(?:st|nd|rd|th)?\s*sec(?:tion)?\b\.?/giu, (_, a, b) => add('section', a ?? b));
  const floor = (_, basement, value, dash) => add('floor', value, { basement: Boolean(basement), dash });
  take(/\b(b)?(\d+)\s*(?:\/\s*)?(?:f|fl|floor)\b\.?(?:\s*-\s*(\d+))?/giu, floor);
  take(/\b()(\d+)(?:st|nd|rd|th)\s*(?:fl|floor)\b\.?(?:\s*-\s*(\d+))?/giu, floor);
  take(/\b(?:floor|fl)\b\.?\s*(b)?(\d+)\b(?:\s*-\s*(\d+))?/giu, floor);
  take(/\bbasement\b\s*(\d+)?(?:\s*(?:f|fl|floor)\b\.?)?/giu, (_, value) => floor(_, 'b', value ?? '1'));
  take(/\b(b)(\d+)\b/giu, (_, basement, value) => floor(_, basement, value));
  take(/\b(?:room|rm|unit)\b\.?\s*([a-z\d]+(?:\s*-\s*[a-z\d]+)?)\b|\b(\d[a-z\d]*(?:-[a-z\d]+)?)\s*room\b/giu, (_, a, b) => add('room', (a ?? b).replace(/\s+/gu, '').toUpperCase()));

  // "Lane 25 Alley 3" and "25 Ln, 3 Aly" read the same numbers differently;
  // whichever form starts first decides the reading of the whole address.
  const numberFirst = /\b\d+\s*(?:ln|lane|aly|alley)\b/iu.exec(text);
  const unitFirst = /\b(?:ln|lane|aly|alley)\b\.?\s*\d/iu.exec(text);
  const pathUnit = (word) => (/^l/iu.test(word) ? 'lane' : 'alley');
  if (unitFirst && (!numberFirst || unitFirst.index < numberFirst.index)) {
    take(/\b(ln|lane|aly|alley)\b\.?\s*(\d+)\b/giu, (_, word, value) => add(pathUnit(word), value));
  } else {
    take(/\b(\d+)\s*(ln|lane|aly|alley)\b\.?/giu, (_, value, word) => add(pathUnit(word), value));
  }

  const chinese = [];
  take(/\p{Script=Han}+(?:\s+\p{Script=Han}+)*/gu, (run) => {
    chinese.push(run.replace(/\s+/gu, ''));
  });

  take(/\b(\d{6}|\d{5})\b/gu, (_, code) => {
    if (zip) return false;
    zip = code;
  });
  take(/\b(\d{3})\b(?=[\s|,.]*$)/gu, (_, code) => {
    if (zip) return false;
    zip = code;
  });
  if (!units.some((unit) => unit.type === 'no')) {
    take(/(?:^|,)[\s|]*(\d+)(?:\s*-\s*(\d+))?(?=[\s|,]|$)/gu, (_, no, dash) => {
      add('no', no, { dash });
    });
  }
  // A number typed last that cannot be a zipcode ("…, Taipei City 12") is
  // the house number being written.
  if (!units.some((unit) => unit.type === 'no')) {
    take(/\b(\d{1,2}|\d{4})\b(?=[\s|,.]*$)/gu, (_, no) => add('no', no));
  }

  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9'’-]+/u)
    .map(bare)
    .filter((word) => word && !DROPPED_WORDS.has(canon(word)));
  // "…, Taipei City 100" may end in a zipcode or in a house number; which one
  // depends on the road it names, so the number is kept for either reading.
  const looseNumber = zip?.length === 3 && !units.some((unit) => unit.type === 'no') ? zip : null;
  return { units, zip, looseNumber, chinese, words: tokens.map(canon), lastRaw: tokens[tokens.length - 1] ?? '' };
}

function splitType(words, types) {
  const last = words[words.length - 1];
  return types.has(last)
    ? { name: words.slice(0, -1).join(''), type: last }
    : { name: words.join(''), type: null };
}

function pushTo(map, key, value) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function lowerBound(sorted, key) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sorted[middle] < key) low = middle + 1;
    else high = middle;
  }
  return low;
}

function renderSuffix(units) {
  const first = (type) => units.find((unit) => unit.type === type);
  const pieces = [];
  const lane = first('lane');
  const alley = first('alley');
  const sub = first('sub');
  const no = first('no');
  const floor = first('floor');
  const room = first('room');
  if (lane) pieces.push(`${lane.value}巷`);
  if (alley) pieces.push(`${alley.value}弄`);
  if (sub) pieces.push(`${sub.value}衖`);
  if (no) pieces.push(`${no.value}號${no.dash ? `之${no.dash}` : ''}`);
  if (floor) pieces.push(`${floor.basement ? '地下' : ''}${floor.value}樓${floor.dash ? `之${floor.dash}` : ''}`);
  if (room) pieces.push(`${room.value}室`);
  // "10號之1" then "3樓" must not read as "10號之13樓".
  return pieces.reduce((text, piece) => (/\d$/u.test(text) && /^[\dA-Z]/u.test(piece) ? `${text} ${piece}` : text + piece), '');
}

function areaPenalty(areaType, given) {
  if (!given) return PENALTY.untypedArea;
  if (areaType === given) return 0;
  // "Taoyuan City" is the city, never its 桃園區.
  if (given === 'city') return null;
  return areaType === 'city' ? PENALTY.wrongArea : PENALTY.nearArea;
}

function roadPenalty(roadType, given) {
  if (!given) return roadType ? PENALTY.untypedRoad : PENALTY.untypedNamedPlace;
  return roadType === given ? 0 : PENALTY.wrongRoad;
}

export function createEnglishAddressReader(database) {
  const cities = [];
  const areas = [];
  const roads = [];
  const cityNames = [];
  const areaNames = [];
  const cityByName = new Map();
  const areaByName = new Map();
  const roadByName = new Map();
  const roadByFullKey = new Map();
  const cityByZh = new Map();
  const areaByZh = new Map();
  const roadByZh = new Map();
  let longestRoadZh = 0;
  // Most road names recur across districts, so each English is read once.
  const readRoadEnglish = new Map();

  const nameKeys = (name) => [name, ...Object.keys(NAME_ALIASES).filter((alias) => NAME_ALIASES[alias] === name)];

  for (const [cityZh, cityData] of Object.entries(database)) {
    const city = {
      zh: cityZh,
      en: cityData.en,
      ...splitType(readText(cityData.en).words, CITY_TYPES),
      areas: [],
      roads: [],
      zips: new Set(),
      order: cities.length,
    };
    cities.push(city);
    cityByZh.set(cityZh, city);
    for (const name of nameKeys(city.name)) {
      pushTo(cityByName, name, { place: city, type: city.type });
      cityNames.push({ key: `${name}${city.type ?? ''}`, place: city });
    }

    for (const [areaZh, areaData] of Object.entries(cityData.areas)) {
      const area = {
        zh: areaZh,
        en: areaData.en,
        city,
        ...splitType(readText(areaData.en).words, AREA_TYPES),
        roads: [],
        zips: new Set(),
        order: areas.length,
      };
      areas.push(area);
      city.areas.push(area);
      pushTo(areaByZh, areaZh, area);
      if (area.name) {
        for (const name of nameKeys(area.name)) {
          pushTo(areaByName, name, { place: area, type: area.type });
          areaNames.push({ key: `${name}${area.type ?? ''}`, place: area });
        }
      }

      for (const [roadZh, roadData] of Object.entries(areaData.roads)) {
        let read = readRoadEnglish.get(roadData.en);
        if (!read) {
          read = readText(roadData.en);
          readRoadEnglish.set(roadData.en, read);
        }
        const { name, type } = splitType(read.words, ROAD_TYPES);
        const road = {
          zh: roadZh,
          en: roadData.en,
          city,
          area,
          name,
          type,
          fullKey: `${name}${type ?? ''}`,
          // Units written into the road's own English ("Ln. 236, Sec. 8,
          // Sanxing Rd.") belong to the name, not to the user's address.
          units: read.units,
          scopes: roadData.scopes,
          order: roads.length,
        };
        roads.push(road);
        area.roads.push(road);
        city.roads.push(road);
        for (const { zipcode } of roadData.scopes) {
          const prefix = String(zipcode).slice(0, 3);
          area.zips.add(prefix);
          city.zips.add(prefix);
        }
        pushTo(roadByZh, roadZh, road);
        longestRoadZh = Math.max(longestRoadZh, roadZh.length);
        if (name) {
          pushTo(roadByName, name, road);
          pushTo(roadByFullKey, road.fullKey, road);
        }
      }
    }
  }
  for (const [name, cityZh] of Object.entries(FORMER_COUNTIES)) {
    pushTo(cityByName, name, { place: cityByZh.get(cityZh), type: 'county', former: true });
  }
  const roadFullKeys = [...roadByFullKey.keys()].sort();

  function readChinese(run, emit) {
    let rest = run;
    let city = null;
    let area = null;
    while (rest) {
      const cityMatch = !city && cities.find((item) => rest.startsWith(item.zh));
      if (cityMatch) {
        city = cityMatch;
        emit('city', [cityMatch]);
        rest = rest.slice(cityMatch.zh.length);
        continue;
      }
      let matched = false;
      if (!area) {
        for (let length = Math.min(5, rest.length); length >= 2 && !matched; length -= 1) {
          const found = areaByZh.get(rest.slice(0, length));
          if (!found) continue;
          const inCity = city ? found.filter((item) => item.city === city) : found;
          const list = inCity.length ? inCity : found;
          area = list.length === 1 ? list[0] : null;
          emit('area', list);
          rest = rest.slice(length);
          matched = true;
        }
      }
      if (matched) continue;
      for (let length = Math.min(longestRoadZh, rest.length); length >= 1 && !matched; length -= 1) {
        const found = roadByZh.get(rest.slice(0, length));
        if (!found) continue;
        const narrowed = found.filter((road) => (!area || road.area === area) && (!city || road.city === city));
        emit('road', narrowed.length ? narrowed : found);
        rest = rest.slice(length);
        matched = true;
      }
      if (!matched) {
        emit('unknown', []);
        return;
      }
    }
  }

  /**
   * Every lookup that explains some of the input: a run of words (or one
   * Chinese piece) and the places it can name, each with its penalty.
   */
  function collectHits(read, partial) {
    const { words } = read;
    const hits = [];
    const lastWord = words.length - 1;
    const completeWords = partial ? words.slice(0, -1) : words;

    for (let start = 0; start < words.length; start += 1) {
      for (let end = start + 1; end <= Math.min(words.length, start + MAX_SPAN); end += 1) {
        const span = words.slice(start, end);
        const typed = (types) => splitType(span, types);
        const entries = [];
        const all = span.join('');

        const city = typed(CITY_TYPES);
        for (const { place, type, former } of cityByName.get(city.name) ?? []) {
          if (city.type ? city.type !== type : former) continue;
          entries.push({ kind: 'city', place, penalty: city.type ? 0 : PENALTY.untypedCity });
        }
        if (city.type) {
          for (const { place, former } of cityByName.get(all) ?? []) if (!former) entries.push({ kind: 'city', place, penalty: PENALTY.untypedCity });
        }

        const area = typed(AREA_TYPES);
        for (const { place, type } of areaByName.get(area.name) ?? []) {
          const penalty = areaPenalty(type, area.type);
          if (penalty !== null) entries.push({ kind: 'district', place, penalty });
        }
        if (area.type) {
          for (const { place } of areaByName.get(all) ?? []) entries.push({ kind: 'district', place, penalty: PENALTY.untypedArea });
        }

        const road = typed(ROAD_TYPES);
        for (const place of roadByName.get(road.name) ?? []) {
          entries.push({ kind: 'road', place, penalty: roadPenalty(place.type, road.type) });
        }
        if (road.type) {
          for (const place of roadByName.get(all) ?? []) entries.push({ kind: 'road', place, penalty: roadPenalty(place.type, null) });
        }

        if (entries.length) hits.push({ start, end, entries });
      }
    }

    let index = words.length;
    for (const run of read.chinese) {
      readChinese(run, (kind, places) => {
        const placeKind = kind === 'area' ? 'district' : kind;
        hits.push({
          start: index,
          end: index + 1,
          entries: places.map((place) => ({ kind: placeKind, place, penalty: 0 })),
        });
        index += 1;
      });
    }

    if (partial && words.length) {
      const exactHits = hits.slice();
      for (let start = Math.max(0, lastWord - MAX_SPAN + 1); start <= lastWord; start += 1) {
        const head = completeWords.slice(start).join('');
        const prefixes = [...new Set([head + words[lastWord], head + read.lastRaw])];
        const entries = [];
        const narrowAreas = new Set();
        const narrowCities = new Set();
        for (const hit of exactHits) {
          if (hit.start < lastWord + 1 && start < hit.end) continue;
          for (const entry of hit.entries) {
            if (entry.kind === 'district') narrowAreas.add(entry.place);
            if (entry.kind === 'city') narrowCities.add(entry.place);
          }
        }
        for (const prefix of prefixes) {
          for (const { key, place } of cityNames) {
            if (key.startsWith(prefix)) entries.push({ kind: 'city', place, penalty: PENALTY.prefix, slack: key.length - prefix.length });
          }
          for (const { key, place } of areaNames) {
            if (key.startsWith(prefix)) entries.push({ kind: 'district', place, penalty: PENALTY.prefix, slack: key.length - prefix.length });
          }
          const roadPrefix = (place) => entries.push({
            kind: 'road',
            place,
            penalty: PENALTY.prefix,
            slack: place.fullKey.length - prefix.length,
          });
          if (narrowAreas.size || narrowCities.size) {
            const scanned = narrowAreas.size ? narrowAreas : narrowCities;
            for (const place of scanned) {
              for (const road of place.roads) if (road.name && road.fullKey.startsWith(prefix)) roadPrefix(road);
            }
          } else {
            const found = [];
            for (let at = lowerBound(roadFullKeys, prefix); at < roadFullKeys.length && roadFullKeys[at].startsWith(prefix); at += 1) {
              found.push(...roadByFullKey.get(roadFullKeys[at]));
              if (found.length > UNNARROWED_ROAD_PREFIX_LIMIT) break;
            }
            if (found.length <= UNNARROWED_ROAD_PREFIX_LIMIT) found.forEach(roadPrefix);
          }
        }
        if (entries.length) hits.push({ start, end: lastWord + 1, entries });
      }
    }
    return { hits, tokenCount: index };
  }

  function zipScore(place, zip) {
    if (!zip) return 0;
    const prefix = zip.slice(0, 3);
    if (!place.scopes) return place.zips.has(prefix) ? 1 : 0;
    const codes = place.scopes.map((scope) => String(scope.zipcode));
    if (codes.includes(zip)) return 2;
    return codes.some((code) => code.startsWith(prefix)) ? 1 : 0;
  }

  /** The road's own units must come from the input; whatever is left is the address's suffix. */
  function fitRoad(road, units) {
    const left = units.slice();
    let penalty = 0;
    let matched = 0;
    for (const unit of road.units) {
      const at = left.findIndex((item) => item.key === unit.key);
      if (at >= 0) {
        left.splice(at, 1);
        matched += 1;
      } else {
        penalty += unit.type === 'section' ? PENALTY.missingSection : PENALTY.missingUnit;
      }
    }
    if (left.some((unit) => unit.type === 'section')) return null;
    return { penalty, matched, suffix: renderSuffix(left) };
  }

  function rankPlaces(text, partial) {
    const read = readText(text);
    const { hits, tokenCount } = collectHits(read, partial);
    if (!tokenCount) return [];

    const cityOptions = new Map();
    const areaOptions = new Map();
    const roadHits = [];
    for (const hit of hits) {
      for (const entry of hit.entries) {
        const option = { start: hit.start, end: hit.end, penalty: entry.penalty, slack: entry.slack ?? 0 };
        if (entry.kind === 'city') pushTo(cityOptions, entry.place, option);
        else if (entry.kind === 'district') pushTo(areaOptions, entry.place, option);
        else roadHits.push({ ...option, place: entry.place });
      }
    }

    const best = new Map();
    const consider = (kind, place, spans, fit = { penalty: 0, matched: 0, suffix: '' }) => {
      const chosen = spans.filter(Boolean);
      for (let i = 0; i < chosen.length; i += 1) {
        for (let j = i + 1; j < chosen.length; j += 1) {
          if (chosen[i].start < chosen[j].end && chosen[j].start < chosen[i].end) return;
        }
      }
      const covered = chosen.reduce((sum, span) => sum + span.end - span.start, 0);
      const candidate = {
        kind,
        place,
        suffix: fit.suffix,
        // "1 F, Dongxing Market" names 東興市場一樓 rather than a first floor of 東興市場.
        matched: fit.matched,
        uncovered: tokenCount - covered,
        zip: zipScore(place, read.zip),
        penalty: chosen.reduce((sum, span) => sum + span.penalty, fit.penalty),
        slack: chosen.reduce((sum, span) => sum + span.slack, 0),
      };
      const previous = best.get(place);
      if (!previous || compare(candidate, previous) < 0) best.set(place, candidate);
    };
    const withNone = (list) => [null, ...(list ?? [])];

    for (const hit of roadHits) {
      const road = hit.place;
      // A trailing number that is none of the road's zipcodes is its house number.
      const units = read.looseNumber && !zipScore(road, read.zip)
        ? [...read.units, { type: 'no', value: read.looseNumber, key: unitKey({ type: 'no', value: read.looseNumber }) }]
        : read.units;
      const fit = fitRoad(road, units);
      if (!fit) continue;
      for (const area of withNone(areaOptions.get(road.area))) {
        for (const city of withNone(cityOptions.get(road.city))) consider('road', road, [hit, area, city], fit);
      }
    }
    for (const [area, options] of areaOptions) {
      for (const option of options) {
        for (const city of withNone(cityOptions.get(area.city))) consider('district', area, [option, city]);
      }
    }
    for (const [city, options] of cityOptions) {
      for (const option of options) consider('city', city, [option]);
    }

    const ranked = [...best.values()].filter((candidate) => candidate.uncovered < tokenCount).sort(compare);
    const fewest = ranked[0]?.uncovered;
    return ranked.filter((candidate) => candidate.uncovered === fewest);
  }

  function compare(a, b) {
    return a.uncovered - b.uncovered
      || b.zip - a.zip
      || a.penalty - b.penalty
      || b.matched - a.matched
      || KIND_RANK[a.kind] - KIND_RANK[b.kind]
      || a.slack - b.slack
      || a.place.order - b.place.order;
  }

  function addressOf({ kind, place }) {
    if (kind === 'city') return place.zh;
    if (kind === 'district') return `${place.city.zh}${place.zh}`;
    return `${place.city.zh}${place.area.zh}${place.zh}`;
  }

  function englishOf({ kind, place }) {
    if (kind === 'city') return place.en;
    if (kind === 'district') return `${place.en}, ${place.city.en}`;
    return `${place.en}, ${place.area.en}, ${place.city.en}`;
  }

  return {
    hasLatin(text) {
      const rest = String(text ?? '')
        .normalize('NFKC')
        .replace(/[0-9A-Za-z]+(?:\s*[之-]\s*[0-9A-Za-z]+)*\s*[室棟座]/gu, '');
      return /[A-Za-z]/u.test(rest);
    },

    toChinese(text, limit = 30) {
      const addresses = rankPlaces(text, false).map((candidate) => (
        candidate.kind === 'road' ? `${addressOf(candidate)}${candidate.suffix}` : addressOf(candidate)
      ));
      return [...new Set(addresses)].slice(0, limit);
    },

    search(text, limit = 30) {
      return rankPlaces(text, true)
        .slice(0, limit)
        .map((candidate) => ({ address: addressOf(candidate), kind: candidate.kind, en: englishOf(candidate) }));
    },
  };
}

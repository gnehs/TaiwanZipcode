/**
 * Pasted addresses come from forms, spreadsheets and old records, so they mix
 * spellings the zipcode database never uses. These helpers rewrite the common
 * variants into the database's own spelling before the lookup runs.
 */

const ZH_DIGITS = { 〇: 0, '○': 0, 零: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const ZH_UNITS = { 十: 10, 百: 100, 千: 1000 };
const ZH_NUMERAL = '[〇○零一二兩三四五六七八九十百千]+';
const SEGMENT_NAMES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

// Counties merged into special municipalities, whose 市/鎮/鄉 became 區.
const LEGACY_COUNTIES = {
  臺北縣: '新北市',
  桃園縣: '桃園市',
  臺中縣: '臺中市',
  臺南縣: '臺南市',
  高雄縣: '高雄市',
};

/** "一百零五" → 105, "二十" → 20, "一〇五" → 105. */
export function parseChineseNumber(text) {
  const characters = Array.from(text);
  if (!characters.some((character) => character in ZH_UNITS)) {
    return Number(characters.map((character) => ZH_DIGITS[character] ?? '').join(''));
  }
  let total = 0;
  let digit = 0;
  for (const character of characters) {
    if (character in ZH_UNITS) {
      total += (digit || 1) * ZH_UNITS[character];
      digit = 0;
    } else {
      digit = ZH_DIGITS[character] ?? 0;
    }
  }
  return total + digit;
}

/**
 * Clean the part of an address that names the road: drop a leading zipcode
 * and country name, fix look-alike characters, write segments as 一段, and
 * map pre-merger counties to their municipality. `hasArea` says whether a
 * "city + district" name exists, so only real districts are renamed.
 *
 * @param {unknown} value
 * @param {(name: string) => boolean} [hasArea]
 */
export function cleanAddressText(value, hasArea = () => false) {
  let text = String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/gu, ' ')
    .replaceAll('台', '臺')
    // U+5DFF 巿 looks like 市 and is a common typo for it.
    .replaceAll('巿', '市')
    .replace(/^\s*\d{3,6}\s*/u, '')
    // Only drop the country when a city follows, so 臺灣大道 stays intact.
    .replace(/^(?:中華民國|臺灣省?)\s*(?=\S{2}[市縣])/u, '')
    .replace(/\s*(\d+)\s*段/gu, (match, number) =>
      SEGMENT_NAMES[Number(number)] ? `${SEGMENT_NAMES[Number(number)]}段` : match,
    )
    // Brackets hold notes (a shop name, "臨"), except a floor such as (3樓).
    .replace(/\(([^()]*)\)/gu, (match, inner) =>
      /\d/u.test(inner) && /[樓號室Ff]/u.test(inner) ? inner : '',
    )
    .replace(/\s+/gu, ' ')
    .trim();

  for (const [county, city] of Object.entries(LEGACY_COUNTIES)) {
    if (!text.startsWith(county)) continue;
    const rest = text.slice(county.length).trimStart();
    // Try each name length, since a town can itself contain 市 (新市鄉).
    const townLength = [1, 2, 3].find(
      (length) =>
        /^[市鎮鄉]$/u.test(rest[length] ?? '') &&
        hasArea(`${city}${rest.slice(0, length)}區`),
    );
    if (townLength) {
      text = `${city}${rest.slice(0, townLength)}區${rest.slice(townLength + 1)}`;
    } else if ([2, 3, 4].some((length) => hasArea(`${city}${rest.slice(0, length)}`))) {
      text = `${city}${rest}`;
    }
    // Otherwise the district is not the merged county's (臺北縣中正區 was
    // always 臺北市), so the text is left for the place-name tables.
    break;
  }
  return text;
}

/**
 * A unit typed twice (丹陽街街) is one unit. Real names repeat one too
 * (北大路路頂巷), so this is only tried when the text as written finds no road.
 */
export function collapseRepeatedUnits(text) {
  return String(text ?? '').replace(/(路|街|巷|弄|號|段|樓)\1+/gu, '$1');
}

/**
 * Forms often name the village (村/里) and neighbourhood (鄰) between the
 * district and the road, which the zipcode data never includes. Return the
 * ways `rest` could read with them removed, shortest village name first;
 * the caller keeps the first one that starts with a known road.
 */
export function withoutVillage(rest) {
  const text = String(rest ?? '');
  const candidates = [];
  for (let length = 1; length <= 4; length += 1) {
    if (/^[村里]$/u.test(text[length] ?? '')) {
      candidates.push(text.slice(length + 1).replace(/^\s*\d+\s*鄰/u, '').trimStart());
    }
  }
  const noNeighbourhood = text.replace(/^\s*\d+\s*鄰/u, '').trimStart();
  if (noNeighbourhood !== text) candidates.push(noNeighbourhood);
  return candidates;
}

/**
 * Clean the house-number part after the road: a leftover 村 or 鄰 goes,
 * Chinese numerals become digits, "3F" becomes 3樓, "B1" becomes 地下1樓,
 * brackets around a floor go, trailing words go, and a number left without a
 * unit gets 號 (莊敬路168).
 */
export function cleanAddressSuffix(value) {
  const suffix = String(value ?? '')
    .normalize('NFKC')
    // A village used as the road name (湖西) leaves its 村 in the suffix.
    .replace(/^\s*[村里](?=\s*\d)/u, '')
    .replace(/^\s*\d+\s*鄰\s*/u, '')
    .replace(/[()[\]]/gu, '')
    .replace(new RegExp(`(${ZH_NUMERAL})(?=\\s*[巷弄衖號樓室])`, 'gu'), (number) =>
      String(parseChineseNumber(number)),
    )
    .replace(new RegExp(`(之|地下)(${ZH_NUMERAL})`, 'gu'), (match, prefix, number) =>
      `${prefix}${parseChineseNumber(number)}`,
    )
    .replace(/[Bb]\s*(\d+)\s*(?:[Ff]|樓)?(?![\dA-Za-z])/gu, '地下$1樓')
    .replace(/(\d+)\s*[Ff](?![A-Za-z])/gu, '$1樓')
    // Words after the last numbered unit describe the place (櫃位, 辦公室),
    // except a lettered room such as A室.
    .replace(/(\d\s*[號樓室])(\D+)$/u, (match, unit, tail) =>
      /^\s*[A-Za-z]+\s*室$/u.test(tail) ? match : unit,
    );
  return /\d\s*$/u.test(suffix) && !/[號樓室]/u.test(suffix) ? `${suffix}號` : suffix;
}

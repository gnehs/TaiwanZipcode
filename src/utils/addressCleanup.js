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
    text = townLength
      ? `${city}${rest.slice(0, townLength)}區${rest.slice(townLength + 1)}`
      : `${city}${rest}`;
    break;
  }
  return text;
}

/**
 * Clean the house-number part after the road: Chinese numerals become digits,
 * "3F" becomes 3樓, "B1" becomes 地下1樓, and brackets around a floor go.
 */
export function cleanAddressSuffix(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[()[\]]/gu, '')
    .replace(new RegExp(`(${ZH_NUMERAL})(?=\\s*[巷弄號樓室])`, 'gu'), (number) =>
      String(parseChineseNumber(number)),
    )
    .replace(new RegExp(`(之|地下)(${ZH_NUMERAL})`, 'gu'), (match, prefix, number) =>
      `${prefix}${parseChineseNumber(number)}`,
    )
    .replace(/[Bb]\s*(\d+)\s*(?:[Ff]|樓)?(?![\dA-Za-z])/gu, '地下$1樓')
    .replace(/(\d+)\s*[Ff](?![A-Za-z])/gu, '$1樓');
}

import assert from 'node:assert/strict';
import test from 'node:test';

import { createEnglishAddressReader } from '../src/utils/englishAddress.js';
import { zipcodeData } from './data.js';

const reader = createEnglishAddressReader(zipcodeData);
const first = (text) => reader.toChinese(text)[0];

test('tells English input from Chinese with a room code', () => {
  assert.equal(reader.hasLatin('No. 7, Xinyi Rd.'), true);
  assert.equal(reader.hasLatin('臺北市信義區信義路五段 No. 7'), true);
  assert.equal(reader.hasLatin('臺北市信義區信義路五段7號3樓'), false);
  assert.equal(reader.hasLatin('臺北市信義區信義路五段7號5A室'), false);
  assert.equal(reader.hasLatin('臺北市信義區信義路五段7號B1'), true);
});

test('reads a district with its city in any order and spelling', () => {
  assert.deepEqual(reader.toChinese('East District, Hsinchu City'), ['新竹市東區']);
  assert.equal(first('east dist hsinchu'), '新竹市東區');
  assert.equal(first('Hsinchu City East Dist.'), '新竹市東區');
  assert.deepEqual(reader.toChinese('Zhubei City, Hsinchu County'), ['新竹縣竹北市']);
  assert.deepEqual(reader.toChinese('Luodong Township, Yilan County'), ['宜蘭縣羅東鎮']);
  assert.deepEqual(reader.toChinese('Luodong Twp, Ilan'), ['宜蘭縣羅東鎮']);
});

test('returns every district an English name can mean when the city is missing', () => {
  assert.deepEqual(reader.toChinese('East Dist.'), ['新竹市東區', '臺中市東區', '嘉義市東區', '臺南市東區']);
  assert.deepEqual(reader.toChinese('Zhongzheng District'), ['臺北市中正區', '基隆市中正區']);
});

test('uses a zipcode to rank same-named districts', () => {
  assert.equal(first('East Dist. 600'), '嘉義市東區');
  assert.equal(first('East Dist. 701'), '臺南市東區');
  assert.equal(first('Xinyi 110'), '臺北市信義區');
  assert.equal(first('Xinyi District 201'), '基隆市信義區');
});

test('reads cities, keeping Taipei and New Taipei apart', () => {
  assert.deepEqual(reader.toChinese('Taipei'), ['臺北市']);
  assert.deepEqual(reader.toChinese('Taipei City'), ['臺北市']);
  assert.equal(first('New Taipei'), '新北市');
  assert.equal(first('New Taipei City'), '新北市');
  assert.deepEqual(reader.toChinese('Taoyuan City'), ['桃園市']);
  assert.deepEqual(reader.toChinese('Chiayi County'), ['嘉義縣']);
  assert.deepEqual(reader.toChinese('Chiayi City'), ['嘉義市']);
});

test('reads older spellings of city names and merged counties', () => {
  assert.equal(first('Taibei'), '臺北市');
  assert.equal(first('Gaoxiong'), '高雄市');
  assert.equal(first('Matsu Nangan'), '連江縣南竿鄉');
  assert.equal(first('Banqiao, Taipei County'), '新北市板橋區');
  assert.equal(first('Danshui, New Taipei'), '新北市淡水區');
});

test('reads a full postal-order address', () => {
  assert.deepEqual(
    reader.toChinese('No. 7, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City 110'),
    ['臺北市信義區信義路五段7號'],
  );
  assert.equal(
    first('3F, No. 10-1, 25 Ln, 3 Aly, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City 110001, Taiwan (R.O.C.)'),
    '臺北市信義區信義路五段25巷3弄10號之1 3樓',
  );
});

test('reads units however they are written', () => {
  const road = 'Sec. 4, Zhongxiao E. Rd., Da\'an Dist., Taipei City';
  const base = '臺北市大安區忠孝東路四段';
  assert.equal(first(`No 3, ${road}`), `${base}3號`);
  assert.equal(first(`#3, ${road}`), `${base}3號`);
  assert.equal(first(`No. 3-2, ${road}`), `${base}3號之2`);
  assert.equal(first(`Lane 25, Alley 3, No. 10, ${road}`), `${base}25巷3弄10號`);
  assert.equal(first(`No. 10, 3 Aly, 25 Ln, ${road}`), `${base}25巷3弄10號`);
  assert.equal(first(`3rd Floor, No. 3, ${road}`), `${base}3號3樓`);
  assert.equal(first(`Floor 3, No. 3, ${road}`), `${base}3號3樓`);
  assert.equal(first(`3F-1, No. 3, ${road}`), `${base}3號3樓之1`);
  assert.equal(first(`B1, No. 3, ${road}`), `${base}3號地下1樓`);
  assert.equal(first(`B2F, No. 3, ${road}`), `${base}3號地下2樓`);
  assert.equal(first(`Room 5, 12F, No. 3, ${road}`), `${base}3號12樓5室`);
  assert.equal(first(`Rm 5A, No. 3, ${road}`), `${base}3號5A室`);
  assert.equal(first(`5 Room, 2F, No. 3, ${road}`), `${base}3號2樓5室`);
  assert.equal(first(`3F-1, No. 10-1, ${road}`), `${base}10號之1 3樓之1`);
});

test('reads road names however they are written', () => {
  const base = '臺北市大安區忠孝東路四段';
  assert.equal(first('No. 3, Zhongxiao East Road, Section 4, Daan District, Taipei'), `${base}3號`);
  assert.equal(first('no 3 zhongxiao e rd sec 4 daan dist taipei city'), `${base}3號`);
  assert.equal(first('Taipei, Daan, Zhong Xiao E. Rd. Sec. 4 No. 3'), `${base}3號`);
  assert.equal(first('3 Zhongxiao E. Rd. 4th Section, Da-an District, Taipei 106'), `${base}3號`);
  assert.equal(first('No. 1, Sec. 1, Taiwan Boulevard, Central Dist., Taichung'), '臺中市中區臺灣大道一段1號');
  assert.equal(first('No. 1, Sec. 2, Civic Blvd, Zhongzheng District, Taipei'), '臺北市中正區市民大道二段1號');
  assert.equal(first('No. 1, Shifu Road, Xinyi, Taipei'), '臺北市信義區市府路1號');
});

test('offers every section when the address leaves it out', () => {
  assert.deepEqual(reader.toChinese('No. 1, Xinyi Rd., Xinyi Dist., Taipei City'), [
    '臺北市信義區信義路四段1號',
    '臺北市信義區信義路五段1號',
    '臺北市信義區信義路六段1號',
  ]);
});

test('reads Chinese place names mixed with English units', () => {
  assert.equal(first('台北市信義區信義路五段 No. 7 3F'), '臺北市信義區信義路五段7號3樓');
  assert.equal(first('No. 7, 信義路五段, Xinyi Dist., Taipei'), '臺北市信義區信義路五段7號');
  assert.equal(first('信義路5段7號, Xinyi District, Taipei City'), '臺北市信義區信義路五段7號');
  assert.equal(first('臺北市信義區 Sec. 5, Xinyi Rd. No. 7'), '臺北市信義區信義路五段7號');
});

test('returns nothing for text that names no place', () => {
  assert.deepEqual(reader.toChinese(''), []);
  assert.deepEqual(reader.toChinese('hello world'), []);
  assert.deepEqual(reader.toChinese('No. 7, 3F'), []);
});

test('reads every road back from its own English', () => {
  const sample = [];
  let index = 0;
  for (const [cityZh, city] of Object.entries(zipcodeData)) {
    for (const [areaZh, area] of Object.entries(city.areas)) {
      if (!area.en) continue;
      const counts = new Map();
      for (const road of Object.values(area.roads)) counts.set(road.en, (counts.get(road.en) ?? 0) + 1);
      for (const [roadZh, road] of Object.entries(area.roads)) {
        index += 1;
        if (index % 13 !== 0) continue;
        sample.push({
          text: `No. 12, ${road.en}, ${area.en}, ${city.en}`,
          address: `${cityZh}${areaZh}${roadZh}12號`,
          unique: counts.get(road.en) === 1,
        });
      }
    }
  }
  assert.ok(sample.length > 3000);
  const missing = [];
  const outranked = [];
  for (const { text, address, unique } of sample) {
    const candidates = reader.toChinese(text);
    const at = candidates.indexOf(address);
    if (at < 0) missing.push(text);
    else if (unique && at > 0) outranked.push(text);
  }
  assert.deepEqual(missing, []);
  assert.deepEqual(outranked, []);
});

test('suggests roads as the road name is typed', () => {
  const results = reader.search('xinyi r');
  assert.ok(results.length > 0);
  assert.ok(results.every((result) => result.kind === 'road' && /^Xinyi Rd\./u.test(result.en.replace(/^Sec\. \d+, /u, ''))));
  const inDistrict = reader.search('xinyi dist taipei xinyi r');
  assert.deepEqual(inDistrict.map((result) => result.address), [
    '臺北市信義區信義路四段',
    '臺北市信義區信義路五段',
    '臺北市信義區信義路六段',
  ]);
  assert.equal(inDistrict[0].en, 'Sec. 4, Xinyi Rd., Xinyi Dist., Taipei City');
});

test('suggests a district as the city is typed', () => {
  assert.deepEqual(reader.search('east dist hsin'), [
    { address: '新竹市東區', kind: 'district', en: 'East Dist., Hsinchu City' },
  ]);
});

test('suggests cities before districts and roads', () => {
  assert.deepEqual(reader.search('taip').slice(0, 1), [{ address: '臺北市', kind: 'city', en: 'Taipei City' }]);
  assert.equal(reader.search('new tai')[0].address, '新北市');
  assert.equal(reader.search('kaohsiung city')[0].address, '高雄市');
  assert.equal(reader.search('taipei city xin')[0].address, '臺北市信義區');
});

test('narrows road suggestions to the district already typed', () => {
  const results = reader.search('Da\'an District, Taipei, zhongxiao');
  assert.deepEqual(results.map((result) => result.address), ['臺北市大安區忠孝東路三段', '臺北市大安區忠孝東路四段']);
});

test('limits suggestions', () => {
  assert.equal(reader.search('zhongshan rd', 5).length, 5);
  assert.deepEqual(reader.search(''), []);
});

test('a number typed after the road is its house number unless it is the zipcode', () => {
  const road = "Sec. 4, Ren'ai Rd., Xinyi Dist., Taipei City";
  assert.equal(reader.toChinese(`${road} 12`)[0], '臺北市信義區仁愛路四段12號');
  assert.equal(reader.toChinese(`${road}, 100`)[0], '臺北市信義區仁愛路四段100號');
  assert.equal(reader.toChinese(`${road} 110`)[0], '臺北市信義區仁愛路四段');
  assert.equal(reader.toChinese('Kaohsiung Zuoying Bo-ai 2nd Rd 777')[0], '高雄市左營區博愛二路777號');
});

test('what the English suggestions write reads back to the same address', () => {
  const tail = "Sec. 4, Ren'ai Rd., Xinyi Dist., Taipei City";
  for (const [en, zh] of [
    [`No. 12, ${tail}`, '12號'],
    [`45 Ln, ${tail}`, '45巷'],
    [`No. 7, 3 Aly, 45 Ln, ${tail}`, '45巷3弄7號'],
    [`3F-2, No. 7, ${tail}`, '7號3樓之2'],
    [`B1F, No. 7-1, ${tail}`, '7號之1地下1樓'],
  ]) {
    assert.equal(reader.toChinese(en)[0], `臺北市信義區仁愛路四段${zh}`, en);
  }
});

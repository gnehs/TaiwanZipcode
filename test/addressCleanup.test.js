import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleanAddressSuffix,
  cleanAddressText,
  withoutVillage,
  parseChineseNumber,
} from '../src/utils/addressCleanup.js';

test('parseChineseNumber reads unit and digit-by-digit numerals', () => {
  assert.equal(parseChineseNumber('一百零五'), 105);
  assert.equal(parseChineseNumber('十'), 10);
  assert.equal(parseChineseNumber('二十三'), 23);
  assert.equal(parseChineseNumber('一〇五'), 105);
  assert.equal(parseChineseNumber('一○五'), 105);
  assert.equal(parseChineseNumber('兩千'), 2000);
});

test('cleanAddressText drops the zipcode and country before a city', () => {
  assert.equal(cleanAddressText('100001 台北市虛構區'), '臺北市虛構區');
  assert.equal(cleanAddressText('１００台灣台北市虛構區'), '臺北市虛構區');
  assert.equal(cleanAddressText('中華民國 臺北市'), '臺北市');
  assert.equal(cleanAddressText('臺灣大道一段'), '臺灣大道一段');
});

test('cleanAddressText fixes look-alike characters and segment digits', () => {
  assert.equal(cleanAddressText('臺北巿測試路3段'), '臺北市測試路三段');
  assert.equal(cleanAddressText('測試路 10 段'), '測試路十段');
  assert.equal(cleanAddressText('測試路99段'), '測試路99段');
});

test('cleanAddressText maps merged counties and their towns', () => {
  const areas = new Set(['新北市板橋區', '桃園市中壢區', '臺南市新市區', '高雄市鳳山區']);
  const hasArea = (name) => areas.has(name);
  assert.equal(cleanAddressText('台北縣板橋市文化路', hasArea), '新北市板橋區文化路');
  assert.equal(cleanAddressText('桃園縣 中壢市中大路', hasArea), '桃園市中壢區中大路');
  assert.equal(cleanAddressText('台南縣新市鄉測試路', hasArea), '臺南市新市區測試路');
  assert.equal(cleanAddressText('高雄縣鳳山區測試路', hasArea), '高雄市鳳山區測試路');
  // A district the municipality does not have is left as written.
  assert.equal(cleanAddressText('臺北縣中正區測試路', hasArea), '臺北縣中正區測試路');
});

test('cleanAddressSuffix normalizes numerals and floor notation', () => {
  assert.equal(cleanAddressSuffix('一百號三樓'), '100號3樓');
  assert.equal(cleanAddressSuffix('二十三巷五弄7號之一'), '23巷5弄7號之1');
  assert.equal(cleanAddressSuffix('44號B1'), '44號地下1樓');
  assert.equal(cleanAddressSuffix('44號 b2f'), '44號 地下2樓');
  assert.equal(cleanAddressSuffix('100號3F'), '100號3樓');
  assert.equal(cleanAddressSuffix('100號（3樓）'), '100號3樓');
  assert.equal(cleanAddressSuffix('100號3樓301室'), '100號3樓301室');
});

test('withoutVillage offers the text with a 村/里 or 鄰 removed', () => {
  assert.deepEqual(withoutVillage('竿蓁里中正東路一段139號'), ['中正東路一段139號']);
  assert.deepEqual(withoutVillage('竿蓁里5鄰中正東路'), ['中正東路']);
  assert.deepEqual(withoutVillage('3鄰中正路'), ['中正路']);
  // 新村里 could be 新村 + 里 or 新 + 村里; both are offered, shortest first.
  assert.deepEqual(withoutVillage('新村里中正路'), ['里中正路', '中正路']);
  assert.deepEqual(withoutVillage('中正東路一段'), []);
});

test('cleanAddressSuffix drops a leftover village or neighbourhood', () => {
  assert.equal(cleanAddressSuffix('村11-6號'), '11-6號');
  assert.equal(cleanAddressSuffix('12鄰5號'), '5號');
  assert.equal(cleanAddressSuffix('村路5號'), '村路5號');
});

test('cleanAddressSuffix drops words after the last numbered unit', () => {
  assert.equal(cleanAddressSuffix('8號2樓辦公室'), '8號2樓');
  assert.equal(cleanAddressSuffix('8號地下1樓服務台'), '8號地下1樓');
  assert.equal(cleanAddressSuffix('8號2樓A室'), '8號2樓A室');
  assert.equal(cleanAddressSuffix('8號之1'), '8號之1');
});

test('cleanAddressSuffix reads a bare trailing number as the house number', () => {
  assert.equal(cleanAddressSuffix('168'), '168號');
  assert.equal(cleanAddressSuffix('5巷10'), '5巷10號');
  assert.equal(cleanAddressSuffix('5號3'), '5號3');
});

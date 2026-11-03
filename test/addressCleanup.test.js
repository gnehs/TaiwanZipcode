import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleanAddressSuffix,
  cleanAddressText,
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
  const areas = new Set(['新北市板橋區', '桃園市中壢區', '臺南市新市區']);
  const hasArea = (name) => areas.has(name);
  assert.equal(cleanAddressText('台北縣板橋市文化路', hasArea), '新北市板橋區文化路');
  assert.equal(cleanAddressText('桃園縣 中壢市中大路', hasArea), '桃園市中壢區中大路');
  assert.equal(cleanAddressText('台南縣新市鄉測試路', hasArea), '臺南市新市區測試路');
  assert.equal(cleanAddressText('高雄縣虛構鄉測試路', hasArea), '高雄市虛構鄉測試路');
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

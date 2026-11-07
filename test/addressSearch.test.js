import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compactSearchText,
  findLongestAddressPrefix,
  getAddressSelection,
  getUnitCompletions,
  getMatchRanges,
  normalizeSearchText,
  searchAddressList,
} from '../src/utils/addressSearch.js';

const fictionalAddresses = [
  '臺北市虛構區測試路',
  '臺北市虛構區測試路一段',
  '臺北市虛構區測試路一段深巷',
  '臺北市虛構區另一條街',
];

test('normalizes 台/臺, full-width characters, and spaces for matching', () => {
  assert.equal(normalizeSearchText(' 台北市　虛構區 '), '臺北市 虛構區');
  assert.equal(compactSearchText(' 台北市　虛構區 '), '臺北市虛構區');
});

test('finds the longest road prefix in a pasted full address', () => {
  const result = findLongestAddressPrefix(
    '台北市　虛構區　測試路一段　１２３號 5樓',
    fictionalAddresses,
  );

  assert.deepEqual(result, {
    address: '臺北市虛構區測試路一段',
    suffix: '１２３號 5樓',
  });
});

test('keeps road suggestions while a road name is still incomplete', () => {
  const result = searchAddressList('臺北市虛構區測試路一', fictionalAddresses);

  assert.deepEqual(result.matches, [
    '臺北市虛構區測試路一段',
    '臺北市虛構區測試路一段深巷',
  ]);
  assert.equal(result.hasMore, false);
  assert.equal(result.prefixMatch, null);
});

test('uses a full-address shortcut only when the suffix starts like a house number', () => {
  const roadOnly = searchAddressList(
    '臺北市虛構區測試路',
    fictionalAddresses,
  );
  const fullAddress = searchAddressList(
    '臺北市虛構區測試路一段１２０號',
    fictionalAddresses,
  );

  assert.deepEqual(roadOnly.matches, [
    '臺北市虛構區測試路',
    '臺北市虛構區測試路一段',
    '臺北市虛構區測試路一段深巷',
  ]);
  assert.equal(roadOnly.prefixMatch, null);
  assert.deepEqual(fullAddress.matches, ['臺北市虛構區測試路一段']);
  assert.deepEqual(fullAddress.prefixMatch, {
    address: '臺北市虛構區測試路一段',
    suffix: '１２０號',
  });
});

test('preserves the pasted suffix when a road is selected', () => {
  const selection = getAddressSelection(
    '台北市　虛構區　測試路一段　台號  5樓',
    '臺北市虛構區測試路一段',
  );

  assert.deepEqual(selection, {
    address: '臺北市虛構區測試路一段',
    suffix: '台號  5樓',
  });
  assert.deepEqual(
    getAddressSelection('臺北市虛構區測試路一段', '臺北市虛構區測試路一段'),
    { address: '臺北市虛構區測試路一段', suffix: '' },
  );
});

test('reports a capped result window without claiming the full count', () => {
  const result = searchAddressList('臺北市虛構區測試路', fictionalAddresses, 2);

  assert.deepEqual(result.matches, [
    '臺北市虛構區測試路',
    '臺北市虛構區測試路一段',
  ]);
  assert.equal(result.hasMore, true);
});

test('suggests roads for a house number typed without city or area', () => {
  const result = searchAddressList('測試路一段１２０號', fictionalAddresses);

  assert.deepEqual(result.matches, [
    '臺北市虛構區測試路一段',
    '臺北市虛構區測試路一段深巷',
  ]);
  assert.equal(result.prefixMatch, null);
});

test('keeps the house number when a road is picked for a partial address', () => {
  assert.deepEqual(
    getAddressSelection('測試路一段 １２０號5樓', '臺北市虛構區測試路一段'),
    { address: '臺北市虛構區測試路一段', suffix: '１２０號5樓' },
  );
  assert.deepEqual(
    getAddressSelection('另一條街 120號', '臺北市虛構區測試路一段'),
    { address: '臺北市虛構區測試路一段', suffix: '' },
  );
});

const fuzzyAddresses = [
  '新北市虛構區永和路',
  '新北市永和區中正路信義巷',
  '新北市永和區信義路',
  '臺北市信義區信義路',
];

test('matches characters in order across city, area, and road', () => {
  const result = searchAddressList('永和信義', fuzzyAddresses);

  assert.deepEqual(result.matches, [
    '新北市永和區信義路',
    '新北市永和區中正路信義巷',
  ]);
  assert.equal(result.prefixMatch, null);
});

test('ignores fuzzy matches scattered into single characters', () => {
  assert.deepEqual(searchAddressList('永信路', fuzzyAddresses).matches, []);
});

test('ranks exact substring matches before fuzzy ones', () => {
  const result = searchAddressList('信義路', fuzzyAddresses);

  assert.deepEqual(result.matches.slice(0, 2), [
    '新北市永和區信義路',
    '臺北市信義區信義路',
  ]);
});

test('keeps the house number when picking a fuzzy match', () => {
  assert.deepEqual(
    searchAddressList('永和信義路 10號', fuzzyAddresses).matches,
    ['新北市永和區信義路'],
  );
  assert.deepEqual(
    getAddressSelection('永和信義路 10號', '新北市永和區信義路'),
    { address: '新北市永和區信義路', suffix: '10號' },
  );
});

test('reports which characters of a suggestion matched', () => {
  assert.deepEqual(getMatchRanges('永和 信義', '新北市永和區信義路'), [
    [3, 5],
    [6, 8],
  ]);
  assert.deepEqual(getMatchRanges('台北市信義路', '臺北市信義區信義路'), [
    [0, 3],
    [6, 9],
  ]);
  assert.deepEqual(getMatchRanges('永和信義路10號', '新北市永和區信義路'), [
    [3, 5],
    [6, 9],
  ]);
  assert.deepEqual(getMatchRanges('不相干', '新北市永和區信義路'), []);
});

test('getUnitCompletions offers the units that can follow a trailing number', () => {
  assert.deepEqual(getUnitCompletions('測試路25'), ['測試路25號', '測試路25巷']);
  assert.deepEqual(getUnitCompletions('測試路25巷3'), ['測試路25巷3號', '測試路25巷3弄']);
  assert.deepEqual(getUnitCompletions('測試路25巷3弄7'), ['測試路25巷3弄7號']);
  assert.deepEqual(getUnitCompletions('測試路25號3'), ['測試路25號3樓', '測試路25號3室']);
  assert.deepEqual(getUnitCompletions('測試路25號3樓5'), ['測試路25號3樓5室']);
  assert.deepEqual(getUnitCompletions('測試路２５'), ['測試路２５號', '測試路２５巷']);
});

test('getUnitCompletions reads a numbered pair by what comes before it', () => {
  assert.deepEqual(getUnitCompletions('測試路25-1'), ['測試路25-1號']);
  assert.deepEqual(getUnitCompletions('測試路3巷25之1'), ['測試路3巷25之1號']);
  assert.deepEqual(getUnitCompletions('測試路25號3-1'), ['測試路25號3-1室']);
  assert.deepEqual(getUnitCompletions('測試路25號3樓3-1'), ['測試路25號3樓3-1室']);
});

test('getUnitCompletions stays quiet without a trailing number to complete', () => {
  assert.deepEqual(getUnitCompletions('測試路25號'), []);
  assert.deepEqual(getUnitCompletions('測試路25號之1'), []);
  assert.deepEqual(getUnitCompletions('測試路25號3樓5室1'), []);
  assert.deepEqual(getUnitCompletions('測試路'), []);
});

test('skips a village and neighbourhood typed after the district', () => {
  const hasDistrict = (name) => name === '臺北市虛構區';

  for (const query of ['臺北市虛構區測驗里測試', '臺北市 虛構區 測驗里 5鄰 測試', '臺北市虛構區5鄰測試']) {
    const result = searchAddressList(query, fictionalAddresses, 30, hasDistrict);
    assert.deepEqual(result.matches, [
      '臺北市虛構區測試路',
      '臺北市虛構區測試路一段',
      '臺北市虛構區測試路一段深巷',
    ], query);
    assert.equal(getAddressSelection(result.query, result.matches[0]).suffix, '');
  }

  assert.deepEqual(
    searchAddressList('臺北市虛構區測驗里', fictionalAddresses, 30, hasDistrict).matches,
    fictionalAddresses,
  );
});

test('keeps no-match when the district is unknown', () => {
  assert.deepEqual(searchAddressList('臺北市虛構區測驗里', fictionalAddresses).matches, []);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compactSearchText,
  findLongestAddressPrefix,
  getAddressSelection,
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

test('does not guess an omitted city or area in a full-address paste', () => {
  const result = searchAddressList('測試路一段１２０號', fictionalAddresses);

  assert.deepEqual(result.matches, []);
  assert.equal(result.hasMore, false);
});

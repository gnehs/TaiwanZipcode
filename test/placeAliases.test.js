import assert from 'node:assert/strict';
import test from 'node:test';

import { areaForms, expandPlaceAliases } from '../src/utils/placeAliases.js';

const districts = [
  { city: '虛構市', area: '甲山區' },
  { city: '虛構市', area: '中正區' },
  { city: '測試縣', area: '中正鄉' },
  { city: '測試縣', area: '乙水鎮' },
];

test('areaForms writes a district bare or with any suffix', () => {
  assert.deepEqual([...areaForms('甲山區')], ['甲山區', '甲山', '甲山鄉', '甲山鎮', '甲山市']);
  assert.deepEqual([...areaForms('東區')], ['東區']);
  assert.ok(areaForms('乙水鎮', ['乙永']).has('乙永鄉'));
});

test('city forms combine with district forms', () => {
  const aliases = expandPlaceAliases(districts, {
    cities: { 虛市: ['虛構市'] },
    areas: { 測試縣: { 乙永: '乙水鎮' } },
  });
  assert.equal(aliases.get('虛市甲山'), '虛構市甲山區');
  assert.equal(aliases.get('虛構甲山鄉'), '虛構市甲山區');
  assert.equal(aliases.get('測試縣乙永鄉'), '測試縣乙水鎮');
});

test('a bare district stem needs a city, and a form meaning two places is dropped', () => {
  const aliases = expandPlaceAliases(districts, {});
  assert.equal(aliases.get('甲山鄉'), '虛構市甲山區');
  assert.equal(aliases.has('甲山'), false);
  // 中正 is a district of both places, so 中正鎮 means neither.
  assert.equal(aliases.has('中正鎮'), false);
});

test('names stored as is override the patterns', () => {
  const aliases = expandPlaceAliases(districts, { names: { 甲山: '虛構市甲山區' } });
  assert.equal(aliases.get('甲山'), '虛構市甲山區');
});

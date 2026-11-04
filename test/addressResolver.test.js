import assert from 'node:assert/strict';
import test from 'node:test';
import { corrections, zipcodeData } from './data.js';

import { createAddressResolver } from '../src/utils/addressResolver.js';
import { findLongestAddressPrefix } from '../src/utils/addressSearch.js';
import { resolveZipcodeScopes } from '../src/utils/zipcodeScopeMatcher.js';

const places = [];
const scopesByAddress = {};
for (const [city, { areas }] of Object.entries(zipcodeData)) {
  for (const [area, { roads }] of Object.entries(areas)) {
    for (const [road, { scopes }] of Object.entries(roads)) {
      places.push({ city, area, road });
      scopesByAddress[`${city}${area}${road}`] = scopes;
    }
  }
}
const addresses = Object.keys(scopesByAddress);

function lookup(text) {
  const prefix = findLongestAddressPrefix(text, addresses);
  return { road: prefix?.address ?? '', addressSuffix: prefix?.suffix ?? '' };
}

const resolvers = {
  plain: createAddressResolver(places, lookup),
  corrected: createAddressResolver(places, lookup, corrections),
};

function read(text, resolver = resolvers.plain) {
  const { road, addressSuffix } = resolver(text);
  const result = road ? resolveZipcodeScopes(scopesByAddress[road], addressSuffix) : null;
  return {
    road,
    suffix: addressSuffix,
    zipcode: result?.status === 'matched' ? result.matches[0].zipcode : null,
  };
}

test('canonical addresses read exactly as written', () => {
  assert.deepEqual(read('臺北市大同區赤峰街40號'), {
    road: '臺北市大同區赤峰街',
    suffix: '40號',
    zipcode: 103017,
  });
});

test('a missing, unknown or wrong district is filled from the road', () => {
  for (const text of ['臺中市七中路5號', '臺中市虛構區七中路5號', '臺中市西區七中路5號']) {
    assert.equal(read(text).road, '臺中市東區七中路', text);
  }
});

test('a missing city comes from a district only one city has', () => {
  assert.equal(read('冬山鄉九分路8號').road, '宜蘭縣冬山鄉九分路');
});

test('a road alone is placed when only one district has it', () => {
  assert.deepEqual(read('丹陽街3號'), {
    road: '臺北市中正區丹陽街',
    suffix: '3號',
    zipcode: 100026,
  });
});

test('a landmark is skipped only before a real district', () => {
  assert.equal(read('臺北市大稻埕商圈大同區赤峰街40號').road, '臺北市大同區赤峰街');
  // Without one the words may belong to the road name, so nothing is guessed.
  assert.equal(read('臺北市大稻埕商圈赤峰街40號').road, '');
});

test('a village that is also a road name does not swallow the real road', () => {
  assert.deepEqual(read('澎湖縣湖西鄉中寮村沙港5號'), {
    road: '澎湖縣湖西鄉沙港',
    suffix: '5號',
    zipcode: 885005,
  });
});

test('a doubled unit is read once', () => {
  assert.equal(read('臺北市中正區丹陽街街3號').suffix, '3號');
});

test('notes in brackets and words after the house number are dropped', () => {
  assert.equal(read('臺北市中正區丹陽街3號(收發室)').suffix, '3號');
  assert.equal(read('臺北市(總務部)中正區丹陽街3號').suffix, '3號');
  assert.equal(read('臺北市中正區丹陽街3號2樓辦公室').suffix, '3號2樓');
});

test('a missing road type and a bare house number are filled', () => {
  assert.deepEqual(read('臺北市中正區丹陽3'), {
    road: '臺北市中正區丹陽街',
    suffix: '3號',
    zipcode: 100026,
  });
  assert.equal(read('臺北市中正區丹陽街3').suffix, '3號');
});

test('a third-level 衖 does not stop the zipcode match', () => {
  const scopes = scopesByAddress['臺北市大同區赤峰街'];
  assert.equal(
    resolveZipcodeScopes(scopes, '35巷5弄2衖3號').matches[0].zipcode,
    resolveZipcodeScopes(scopes, '35巷5弄3號').matches[0].zipcode,
  );
});

const corrected = (text) => read(text, resolvers.corrected);

test('a road listed as misspelt in its district is corrected there', () => {
  assert.equal(corrected('臺北市中正區秀山路5號').road, '臺北市中正區秀山街');
  assert.equal(corrected('臺北市萬華區艋舺大道路100號').road, '臺北市萬華區艋舺大道');
});

test('variant characters are corrected by the tables, not guessed', () => {
  assert.equal(corrected('臺北市大安區東豊街1號').road, '臺北市大安區東豐街');
  assert.equal(corrected('桃園市觀音區塔仔腳1號').road, '桃園市觀音區塔子腳');
  // No table lists 峯 for 赤峰街, so it is not rewritten.
  assert.equal(corrected('臺北市大同區赤峯街40號').road, '');
});

test('a listed correction outranks moving the address to another district', () => {
  // 秀山路 exists only in 北投區; in 中正區 the tables say 秀山街 was meant.
  assert.equal(read('臺北市中正區秀山路5號').road, '臺北市北投區秀山路');
  assert.equal(corrected('臺北市中正區秀山路5號').road, '臺北市中正區秀山街');
});

test('abbreviated places, wrong words and park names are read', () => {
  assert.equal(corrected('北市中正區丹陽街3號').road, '臺北市中正區丹陽街');
  assert.equal(corrected('中市烏日一心街1號').road, '臺中市烏日區一心街');
  assert.equal(corrected('桃園市中歷區七和路1號').road, '桃園市中壢區七和路');
  assert.equal(corrected('臺北市內湖科技園區瑞光路100號').road, '臺北市內湖區瑞光路');
});

test('a short place name followed by a road type stays a road name', () => {
  // 太平 alone is listed for 臺中市太平區, but 太平路 is a road.
  assert.notEqual(corrected('太平路1號').road, '臺中市太平區');
  assert.equal(corrected('太平大興路1號').road.startsWith('臺中市太平區'), true);
});

test('words that are part of a road name are not skipped', () => {
  assert.notEqual(read('臺北市艋舺大道路100號').road, '臺北市信義區大道路');
});

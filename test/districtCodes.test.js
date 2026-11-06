import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDistrictCodes } from '../src/utils/districtCodes.js';
import { zipcodeData } from './data.js';

const codes = buildDistrictCodes(zipcodeData);
const districts = Object.entries(zipcodeData).flatMap(([city, { areas }]) =>
  Object.keys(areas).map((area) => `${city}${area}`),
);

test('every district round-trips through its segment and through its full name', () => {
  for (const district of districts) {
    const segment = codes.segmentOf(district);
    assert.ok(segment, district);
    assert.equal(codes.districtOf(segment), district);
    assert.equal(codes.districtOf(district), district);
  }
});

test('a district keeps its three-digit code unless another district claims it', () => {
  assert.equal(codes.segmentOf('臺北市大安區'), '106');
  assert.equal(codes.districtOf('106'), '臺北市大安區');
  const fullNames = districts.filter((district) => !/^\d{3}$/.test(codes.segmentOf(district)));
  assert.deepEqual(fullNames.sort(), [
    '嘉義市東區',
    '嘉義市西區',
    '新竹市北區',
    '新竹市東區',
    '新竹市香山區',
  ].sort());
  for (const district of fullNames) assert.equal(codes.segmentOf(district), district);
  assert.equal(codes.districtOf('300'), null);
  assert.equal(codes.districtOf('600'), null);
});

test('segments are unique across districts', () => {
  const segments = districts.map((district) => codes.segmentOf(district));
  assert.equal(new Set(segments).size, districts.length);
});

test('unknown names have no segment or district', () => {
  assert.equal(codes.segmentOf('火星市'), null);
  assert.equal(codes.districtOf('000'), null);
});

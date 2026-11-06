import assert from 'node:assert/strict';
import test from 'node:test';
import { zipcodeData } from './data.js';
import { getFloorChoices } from '../src/utils/floorChoices.js';
import { resolveZipcodeScopes } from '../src/utils/zipcodeScopeMatcher.js';

function roadScopes(city, area, road) {
  return zipcodeData[city].areas[area].roads[road].scopes;
}

test('lists each floor range of a house split by floor, lowest first', () => {
  const choices = getFloorChoices(roadScopes('新北市', '板橋區', '縣民大道二段'), '7號');
  assert.deepEqual(
    choices.map(({ label, zipcode }) => `${label} ${zipcode}`),
    [
      '地下3樓至1樓 220227',
      '2樓 220073',
      '3樓至5樓 220228',
      '6樓至7樓 220229',
      '8樓 220230',
      '9樓至13樓 220231',
      '14樓至18樓 220232',
      '19樓至22樓 220233',
      '23樓 220228',
      '24樓至25樓 220234',
    ],
  );
  assert.equal(choices[0].department, '板橋火車站');
});

test('includes the floors the general rule covers', () => {
  const choices = getFloorChoices(roadScopes('臺北市', '松山區', '八德路二段'), '374號');
  assert.deepEqual(
    choices.map(({ floor, label, zipcode }) => [floor, label, zipcode]),
    [
      ['1樓', '其他樓層', 105040],
      ['2樓', '2樓以上', 105404],
    ],
  );
});

test('every choice resolves to its own zipcode once picked', () => {
  const scopes = roadScopes('臺北市', '大安區', '愛國東路');
  for (const choice of getFloorChoices(scopes, '216號')) {
    const { status, matches } = resolveZipcodeScopes(scopes, `216號${choice.floor}`);
    assert.equal(status, 'matched');
    assert.equal(matches[0].zipcode, choice.zipcode);
  }
});

test('offers nothing when the floor does not matter or is already typed', () => {
  assert.deepEqual(getFloorChoices(roadScopes('臺北市', '信義區', '信義路五段'), '7號'), []);
  assert.deepEqual(getFloorChoices(roadScopes('新北市', '板橋區', '縣民大道二段'), '7號3樓'), []);
  assert.deepEqual(getFloorChoices(roadScopes('新北市', '板橋區', '縣民大道二段'), '7'), []);
});

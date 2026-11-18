import assert from 'node:assert/strict';
import test from 'node:test';

import { changedUrls, pageContents } from '../scripts/indexnow.mjs';
import { zipcodeData } from './data.js';

const site = 'https://zipcode.gnehs.net';
const road = '臺北市大安區和平東路二段';
const roadPath = `/a/106/${encodeURIComponent('和平東路二段')}`;
const before = { database: zipcodeData, doorplates: {}, dates: '{}' };

const changed = (after) =>
  changedUrls(pageContents(before), pageContents({ ...before, ...after }))
    .filter((url) => !url.includes('/en/'))
    .map((url) => url.slice(site.length));

test('the same data changes nothing', () => {
  assert.deepEqual(changed({}), []);
});

test("a road's new house numbers change only that road's page, in both languages", () => {
  const doorplates = { 臺北市大安區: { 和平東路二段: { '': '1,3' } } };
  assert.deepEqual(changedUrls(pageContents(before), pageContents({ ...before, doorplates })), [
    `${site}${roadPath}`,
    `${site}/en${roadPath}`,
  ]);
});

test("a road's new zip code changes its page, its district's and its city's", () => {
  const database = structuredClone(zipcodeData);
  database.臺北市.areas.大安區.roads.和平東路二段.scopes[0].zipcode += 1;
  assert.deepEqual(changed({ database }), [roadPath, '/a/106', `/a/${encodeURIComponent('臺北市')}`]);
});

test('a removed road is submitted so its page drops out', () => {
  const database = structuredClone(zipcodeData);
  delete database.臺北市.areas.大安區.roads.和平東路二段;
  assert.ok(changed({ database }).includes(roadPath), `${road} is submitted`);
});

test('new doorplate dates change the FAQ', () => {
  assert.deepEqual(changed({ dates: '{"臺北市":{}}' }), ['/faq']);
});

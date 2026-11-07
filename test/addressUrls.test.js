import assert from 'node:assert/strict';
import test from 'node:test';

import { createAddressUrls } from '../src/utils/addressUrls.js';
import { zipcodeData } from './data.js';

const urls = createAddressUrls(zipcodeData);
const slug = '臺北市大安區和平東路二段123號';

test('a road with a house number makes a slug, and an unknown road does not', () => {
  assert.equal(urls.addressSlug('臺北市大安區和平東路二段', ' 123號 '), slug);
  assert.equal(urls.addressSlug('臺北市大安區沒有這條路', '1號'), null);
  assert.deepEqual(urls.parseAddressSlug(slug), { road: '臺北市大安區和平東路二段', suffix: '123號' });
});

test('a shared address names its district by code and keeps the rest readable', () => {
  assert.equal(urls.sharePath(slug), `/a/106/${encodeURIComponent('和平東路二段123號')}`);
  assert.equal(urls.shareUrl('https://example.test', slug), 'https://example.test/a/106/和平東路二段123號');
  assert.equal(urls.shareUrl('https://example.test', `${slug} 3樓`), 'https://example.test/a/106/和平東路二段123號%203樓');
});

test('a shared path reads back to the slug it was made from', () => {
  for (const text of [slug, '臺北市大安區和平東路二段', '新竹市東區中華路二段1號', '嘉義市西區中山路100號']) {
    assert.equal(urls.slugOfSharePath(urls.sharePath(text)), text);
  }
  assert.match(urls.sharePath('新竹市東區中華路二段1號'), /^\/a\/%E6%96%B0%E7%AB%B9%E5%B8%82%E6%9D%B1%E5%8D%80\//);
});

test('a shared path also accepts the full district name', () => {
  assert.equal(urls.slugOfSharePath(`/a/${encodeURIComponent('臺北市大安區')}/${encodeURIComponent('和平東路二段123號')}`), slug);
});

test('paths that are not a shared address read as nothing', () => {
  for (const path of [
    '/a/106',
    '/a/106/',
    '/a/999/%E5%92%8C',
    '/a/106/%E6%B2%92%E6%9C%89',
    '/a/106/%E5%92%8C%E5%B9%B3%E6%9D%B1%E8%B7%AF%E4%BA%8C%E6%AE%B5/extra',
    '/a/%E0%A4%A/x',
    '/b/106/%E5%92%8C%E5%B9%B3%E6%9D%B1%E8%B7%AF%E4%BA%8C%E6%AE%B5',
    // 信義路五段 is in 信義區, not 大安區.
    '/a/106/%E4%BF%A1%E7%BE%A9%E8%B7%AF%E4%BA%94%E6%AE%B57%E8%99%9F',
  ]) {
    assert.equal(urls.slugOfSharePath(path), null, path);
  }
});

test('a link shared as one segment moves to the district form', () => {
  assert.equal(urls.currentSharePath(`/a/${encodeURIComponent(slug)}`), urls.sharePath(slug));
  assert.equal(urls.currentSharePath('/a/106/x'), null);
  assert.equal(urls.currentSharePath('/a/%E7%81%AB%E6%98%9F'), null);
  assert.equal(urls.currentSharePath('/batch'), null);
});

test('the hash holds the district code and the rest, and only a real address reads back', () => {
  const rest = slug.slice('臺北市大安區'.length);
  assert.equal(urls.hashOfSlug(slug), `106/${rest}`);
  assert.equal(urls.hashOfSlug(`${slug} 3樓#?%`), `106/${rest}%203樓%23%3F%25`);
  assert.equal(urls.slugOfHash(`#106/${rest}`), slug);
  assert.equal(urls.slugOfHash(`#臺北市大安區/${rest}`), slug);
  assert.equal(urls.slugOfHash(`#100/${rest}`), null);
  assert.equal(urls.slugOfHash(`#${slug}`), slug);
  assert.equal(urls.slugOfHash('#batch'), null);
  assert.equal(urls.slugOfHash(''), null);
});

test('both older hash forms read as the slug', () => {
  const road = '臺北市大安區和平東路二段';
  assert.equal(urls.slugOfLegacyHash(`#z=106&a=${encodeURIComponent(road)}&s=${encodeURIComponent('123號')}`), slug);
  assert.equal(urls.slugOfLegacyHash(`#106_${encodeURIComponent(road)}_${encodeURIComponent('123號')}`), slug);
  assert.equal(urls.slugOfLegacyHash(`#${slug}`), null);
  assert.equal(urls.slugOfLegacyHash('#%E0%A4%A'), null);
});

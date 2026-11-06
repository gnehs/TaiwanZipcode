import assert from 'node:assert/strict';
import test from 'node:test';

import { crawlerName, visitPoint } from '../src/utils/visitPoint.js';

const SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const GOOGLEBOT =
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

test('crawlerName names known crawlers and lumps the rest together', () => {
  assert.equal(crawlerName(GOOGLEBOT), 'Googlebot');
  assert.equal(crawlerName('Mozilla/5.0 (compatible; bingbot/2.0)'), 'bingbot');
  assert.equal(crawlerName('Mozilla/5.0 (compatible; SomeNewBot/1.0)'), 'other');
  assert.equal(crawlerName('curl/8.7.1'), 'other');
  assert.equal(crawlerName(null), 'other');
  assert.equal(crawlerName(SAFARI), null);
});

test('a crawler visit keeps the page it fetched', () => {
  assert.deepEqual(visitPoint(GOOGLEBOT, '/a/臺北市信義區信義路五段7號'), {
    indexes: ['crawler'],
    blobs: ['crawler', 'Googlebot', '/a/臺北市信義區信義路五段7號'],
  });
});

test('a person visit never carries the address', () => {
  const point = visitPoint(SAFARI, '/a/臺北市信義區信義路五段7號');
  assert.deepEqual(point, { indexes: ['person'], blobs: ['person', '', ''] });
  assert.doesNotMatch(JSON.stringify(point), /臺北/u);
});

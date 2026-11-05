import assert from 'node:assert/strict';
import test from 'node:test';

import { clampColumnWidth, moveItem, parseColumnPrefs } from '../src/utils/batchColumns.js';

const keys = { columns: ['status', 'zipcode', 'zh'], resizable: ['input', 'status', 'zipcode', 'zh'] };

test('parseColumnPrefs falls back to every column in order when nothing is stored', () => {
  for (const raw of [null, '', 'not json', '42']) {
    assert.deepEqual(parseColumnPrefs(raw, keys), {
      order: ['status', 'zipcode', 'zh'],
      hidden: [],
      widths: {},
    });
  }
});

test('parseColumnPrefs keeps a stored order and appends columns added since', () => {
  const raw = JSON.stringify({ order: ['zh', 'removed', 'status', 'zh'], hidden: ['zipcode', 'removed'] });
  assert.deepEqual(parseColumnPrefs(raw, keys), {
    order: ['zh', 'status', 'zipcode'],
    hidden: ['zipcode'],
    widths: {},
  });
});

test('parseColumnPrefs keeps widths of known columns within bounds', () => {
  const raw = JSON.stringify({ widths: { input: 10, zh: 5000, status: 'wide', removed: 100, zipcode: 120.4 } });
  assert.deepEqual(parseColumnPrefs(raw, keys).widths, {
    input: clampColumnWidth(10),
    zh: clampColumnWidth(5000),
    zipcode: 120,
  });
});

test('moveItem moves one item without touching the original list', () => {
  const list = ['a', 'b', 'c', 'd'];
  assert.deepEqual(moveItem(list, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveItem(list, 3, 1), ['a', 'd', 'b', 'c']);
  assert.deepEqual(list, ['a', 'b', 'c', 'd']);
});

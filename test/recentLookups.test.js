import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addRecentLookup,
  parseRecentLookups,
} from '../src/utils/recentLookups.js';

const road = '臺北市虛構區測試路一段';

test('puts the newest lookup first and drops exact duplicates', () => {
  const first = { road, suffix: '12號', zipcode: '100001' };
  const second = { road: '臺北市虛構區另一條街', suffix: '3號', zipcode: '100002' };

  const lookups = addRecentLookup(addRecentLookup([], first), second);
  assert.deepEqual(addRecentLookup(lookups, { ...first }), [first, second]);
});

test('replaces a shorter draft of the same address', () => {
  const draft = { road, suffix: '12號', zipcode: '100001' };
  const full = { road, suffix: '12號 3樓', zipcode: '100001' };

  assert.deepEqual(addRecentLookup([draft], full), [full]);
  assert.equal(
    addRecentLookup([full], { road, suffix: '1號', zipcode: '100003' }).length,
    2,
  );
});

test('keeps only the most recent entries', () => {
  let lookups = [];
  for (let number = 1; number <= 8; number += 1) {
    lookups = addRecentLookup(
      lookups,
      { road: `${road}${number}`, suffix: '', zipcode: '100001' },
      3,
    );
  }
  assert.deepEqual(
    lookups.map((lookup) => lookup.road),
    [`${road}8`, `${road}7`, `${road}6`],
  );
});

test('ignores malformed stored data', () => {
  assert.deepEqual(parseRecentLookups('not json'), []);
  assert.deepEqual(parseRecentLookups('{"road":"x"}'), []);
  assert.deepEqual(
    parseRecentLookups(
      JSON.stringify([
        { road, suffix: '12號', zipcode: '100001', extra: true },
        { road, suffix: '12號', zipcode: '1000' },
      ]),
    ),
    [{ road, suffix: '12號', zipcode: '100001' }],
  );
});

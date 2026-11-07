import assert from 'node:assert/strict';
import test from 'node:test';

import { toCsv } from '../src/utils/batchTable.js';

test('toCsv quotes cells holding commas, quotes or line breaks', () => {
  assert.equal(
    toCsv([
      ['地址', '郵遞區號'],
      ['1號, 2樓', '100005'],
      ['say "hi"', 'a\nb'],
    ]),
    '地址,郵遞區號\r\n"1號, 2樓",100005\r\n"say ""hi""","a\nb"',
  );
});

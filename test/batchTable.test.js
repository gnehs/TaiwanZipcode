import assert from 'node:assert/strict';
import test from 'node:test';

import { toTsv } from '../src/utils/batchTable.js';

test('toTsv quotes only cells that would break a spreadsheet row', () => {
  assert.equal(
    toTsv([
      ['a', 'b'],
      ['say "hi"', 'x\ty'],
    ]),
    'a\tb\n"say ""hi"""\t"x\ty"',
  );
});

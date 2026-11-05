import assert from 'node:assert/strict';
import test from 'node:test';
import { strFromU8, unzipSync } from 'fflate';

import { toXlsx } from '../src/utils/xlsx.js';

test('toXlsx writes every cell as text with the given column widths', () => {
  const files = unzipSync(toXlsx([['郵遞區號', '地址'], ['100005', 'A & <B>']], [70, 140]));
  assert.ok(files['[Content_Types].xml'] && files['xl/workbook.xml']);
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.match(sheet, /<c r="A2" t="inlineStr"><is><t>100005<\/t><\/is><\/c>/u);
  assert.match(sheet, /<c r="B2" t="inlineStr"><is><t>A &amp; &lt;B&gt;<\/t><\/is><\/c>/u);
  assert.match(sheet, /<col min="2" max="2" width="20" customWidth="1"\/>/u);
});

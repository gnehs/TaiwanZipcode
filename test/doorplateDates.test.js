import assert from 'node:assert/strict';
import test from 'node:test';

import { dataDateOf, rocDateOf } from '../utils/doorplate-converter/dataDate.mjs';

test('reads the date a county names its doorplate file by', () => {
  assert.equal(dataDateOf(['新北市門牌位置數值資料11510']), '115-10');
  assert.equal(dataDateOf(['屏東縣全縣門牌檔(更新日期：1150914)']), '115-9-14');
  assert.equal(dataDateOf(['114年臺南市門牌坐標資料']), '114');
  // The most precise of the names wins.
  assert.equal(dataDateOf(['115年上半年度', '苗栗縣迄115年6月30日門牌座標資料']), '115-6-30');
});

test('ignores upload stamps and long numbers that only look like dates', () => {
  assert.equal(dataDateOf(['u600000-03-2024-09-26-1727342410.csv']), null);
  assert.equal(dataDateOf(['/wSite/public/Attachment/00810/f1792575159701.csv']), null);
  assert.equal(dataDateOf(['臺北市門牌位置數值資料', undefined]), null);
});

test('turns an upload time into an ROC date', () => {
  assert.equal(rocDateOf('2026-10-05T08:51:32.000Z'), '115-10-5');
});

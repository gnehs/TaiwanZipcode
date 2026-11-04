import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  findDoor,
  normalizeRoadName,
  parseDoorNumber,
  parseDoorPath,
  suggestDoors,
} from '../src/utils/doorplates.js';

const lanes = {
  '': '2,10,52-1,520,522,526,529,529-3',
  '525巷': '1,3',
  '527巷': '15,23,51-1',
  '527巷101弄': '1,3',
  '35巷': '2',
};

test('reads house numbers the way the county files write them', () => {
  assert.equal(parseDoorNumber('９１號'), '91');
  assert.equal(parseDoorNumber('９１號二樓'), '91');
  assert.equal(parseDoorNumber('１７５之２號'), '175-2');
  assert.equal(parseDoorNumber('９７號之１'), '97-1');
  assert.equal(parseDoorNumber('３４號六樓之１'), '34');
  assert.equal(parseDoorNumber('9衖7之1號'), '7-1');
  assert.equal(parseDoorNumber('１３９I-二樓'), '139');
  assert.equal(parseDoorNumber('臨221號'), null);
  assert.equal(parseDoorNumber('南門商場5號'), null);
});

test('reads lanes and alleys, including the garbled Hsinchu County units', () => {
  assert.equal(parseDoorPath('', ''), '');
  assert.equal(parseDoorPath('５２７巷', '１０１弄'), '527巷101弄');
  assert.equal(parseDoorPath('12G-', '3H-'), '12巷3弄');
  assert.equal(parseDoorPath('正隆巷', '４６弄'), null);
});

test('spells county road names the way the post office does', () => {
  assert.equal(normalizeRoadName('五峯路'), '五峰路');
  assert.equal(normalizeRoadName('台灣大道'), '臺灣大道');
});

test('finds whether the typed house is on the list', () => {
  assert.equal(findDoor(lanes, '520號'), 'exists');
  assert.equal(findDoor(lanes, '99999號'), 'missing');
  assert.equal(findDoor(lanes, '527巷15號3樓'), 'exists');
  assert.equal(findDoor(lanes, '527巷16號'), 'missing');
  assert.equal(findDoor(lanes, '9999巷1號'), 'missing');
  // A house typed without its branch exists when any branch of it does.
  assert.equal(findDoor(lanes, '52號'), 'exists');
  assert.equal(findDoor(lanes, '529之3號'), 'exists');
  assert.equal(findDoor(lanes, '529號之9'), 'missing');
});

test('leaves out what it cannot judge', () => {
  assert.equal(findDoor(null, '520號'), 'unknown');
  assert.equal(findDoor(lanes, '527巷'), 'unknown');
  assert.equal(findDoor(lanes, '52'), 'unknown');
});

test('suggests the lanes and houses that follow the typed number', () => {
  assert.deepEqual(suggestDoors(lanes, '大業路52', '52號'), [
    '大業路52之1號',
    '大業路520號',
    '大業路522號',
    '大業路525巷',
    '大業路526號',
    '大業路527巷',
    '大業路529號',
    '大業路529之3號',
  ]);
  assert.deepEqual(suggestDoors(lanes, '大業路527巷', '527巷'), [
    '大業路527巷15號',
    '大業路527巷23號',
    '大業路527巷51之1號',
    '大業路527巷101弄',
  ]);
  assert.deepEqual(suggestDoors(lanes, '大業路527巷101弄', '527巷101弄'), [
    '大業路527巷101弄1號',
    '大業路527巷101弄3號',
  ]);
  assert.deepEqual(suggestDoors(lanes, '大業路3', '3號', 2), ['大業路35巷']);
  assert.deepEqual(suggestDoors(lanes, '大業路520號', '520號'), []);
  assert.deepEqual(suggestDoors(null, '大業路52', '52號'), []);
});

test('ships a file for every listed district', () => {
  const directory = new URL('../public/doorplates/', import.meta.url);
  const districts = JSON.parse(fs.readFileSync(new URL('index.json', directory), 'utf8'));
  assert.ok(districts.length > 100);
  for (const district of districts) assert.ok(fs.existsSync(new URL(`${district}.json`, directory)), district);
  const beitou = JSON.parse(fs.readFileSync(new URL('臺北市北投區.json', directory), 'utf8'));
  assert.equal(findDoor(beitou['大業路'], '530號'), 'exists');
  assert.equal(findDoor(beitou['大業路'], '99999號'), 'missing');
});

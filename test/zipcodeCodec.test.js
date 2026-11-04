import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodeRoadCorrections,
  decodeZipcodeData,
  encodeRoadCorrections,
  encodeZipcodeData,
  roadListsOf,
} from '../src/utils/zipcodeCodec.js';

const database = {
  虛構市: {
    en: 'Fictional City',
    areas: {
      測試區: {
        en: 'Ceshi Dist.',
        roads: {
          甲山路一段: { en: 'Sec. 1, Jiashan Rd.', scopes: [{ scope: '單 1號至 9號', zipcode: 100001 }] },
          甲山路二段: { en: 'Sec. 2, Jiashan Rd.', scopes: [{ scope: '全', zipcode: 101002, department: '大樓' }] },
          乙水街: { en: 'Yishui St.', scopes: [{ scope: '全', zipcode: 100003 }] },
          本街1巷: { en: '1st Ln., Ben St.', scopes: [{ scope: '全', zipcode: 100004 }] },
          丙村: { en: 'Bingcun', scopes: [{ scope: '全', zipcode: 100005 }] },
        },
      },
    },
  },
};

test('the zipcode text decodes back to the database', () => {
  assert.deepEqual(decodeZipcodeData(encodeZipcodeData(database)), database);
});

test('rule padding is squeezed to single spaces', () => {
  const padded = structuredClone(database);
  padded['虛構市'].areas['測試區'].roads['乙水街'].scopes[0].scope = '　  全 ';
  const decoded = decodeZipcodeData(encodeZipcodeData(padded));
  assert.equal(decoded['虛構市'].areas['測試區'].roads['乙水街'].scopes[0].scope, '全');
});

test('road corrections decode back, digits in names included', () => {
  const roads = {
    虛構市測試區: {
      甲山一段: '甲山路一段',
      甲衫路二段: '甲山路二段',
      乙水路街: '乙水街',
      本街2巷: '本街1巷',
      丁丁: '丙村',
    },
  };
  const lists = roadListsOf(database);
  assert.deepEqual(decodeRoadCorrections(encodeRoadCorrections(roads, lists), lists), roads);
});

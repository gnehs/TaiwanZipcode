import assert from 'node:assert/strict';
import test from 'node:test';
import zipcodeData from '../src/assets/zipcode.json' with { type: 'json' };
import {
  matchZipcodeScope,
  parseAddressSuffix,
  parseScope,
  resolveZipcodeScopes,
} from '../src/utils/zipcodeScopeMatcher.js';

function allScopeItems() {
  return Object.values(zipcodeData).flatMap((city) =>
    Object.values(city.areas).flatMap((area) =>
      Object.values(area.roads).flatMap((road) => road.scopes),
    ),
  );
}

test('matches the four 永和區信義路 boundary rules', () => {
  const scopes = zipcodeData['新北市'].areas['永和區'].roads['信義路'].scopes;
  const cases = [
    ['75號', 234008],
    ['77號', 234006],
    ['62號', 234007],
    ['82號', 234006],
  ];

  for (const [address, zipcode] of cases) {
    const result = resolveZipcodeScopes(scopes, address);
    assert.equal(result.status, 'matched', address);
    assert.equal(result.matches[0].zipcode, zipcode, address);
  }

  assert.equal(resolveZipcodeScopes(scopes, '75').status, 'incomplete');
  assert.equal(resolveZipcodeScopes(scopes, '').status, 'empty');
});

test('parses nested 巷/弄 paths and applies parity at the next level', () => {
  const parsed = parseScope('　 54巷  5弄單全');
  assert.deepEqual(parsed.prefix.map((part) => [part.unit, part.value]), [['巷', 54], ['弄', 5]]);
  assert.equal(parsed.implicitTarget, true);
  assert.equal(parsed.parity, '單');
  assert.equal(matchZipcodeScope(parsed, '54巷5弄1號'), true);
  assert.equal(matchZipcodeScope(parsed, '54巷5弄2號'), false);

  const address = parseAddressSuffix('54巷5弄1號');
  assert.deepEqual(address.path.map((part) => [part.unit, part.value]), [['巷', 54], ['弄', 5], ['號', 1]]);
});

test('matches exact, branch/附號, and floor-specific scopes', () => {
  const scopes = [
    { scope: '全', zipcode: 1 },
    { scope: '151號', zipcode: 2 },
    { scope: '151附號', zipcode: 3 },
    { scope: '151號 2樓以上', zipcode: 4 },
  ];

  assert.equal(resolveZipcodeScopes(scopes, '151號').matches[0].zipcode, 2);
  assert.equal(resolveZipcodeScopes(scopes, '151號之1').matches[0].zipcode, 3);
  assert.equal(resolveZipcodeScopes(scopes, '151附號').matches[0].zipcode, 3);
  assert.equal(resolveZipcodeScopes(scopes, '151號2樓').matches[0].zipcode, 4);
  assert.equal(resolveZipcodeScopes(scopes, '151號1樓').matches[0].zipcode, 2);

  assert.equal(matchZipcodeScope('10號地下1樓至1樓', '10號地下1樓'), true);
  assert.equal(matchZipcodeScope('10號地下1樓至1樓', '10號1樓'), true);
  assert.equal(matchZipcodeScope('10號地下1樓至1樓', '10號2樓'), false);
});

test('supports mixed 巷/弄/號 endpoints and inclusive ranges', () => {
  assert.equal(matchZipcodeScope('單 1巷至 5號', '1巷'), true);
  assert.equal(matchZipcodeScope('單 1巷至 5號', '3號'), true);
  assert.equal(matchZipcodeScope('單 1巷至 5號', '4號'), false);
  assert.equal(matchZipcodeScope('雙 10號以上', '10號'), true);
  assert.equal(matchZipcodeScope('雙 10號以上', '12號'), true);
  assert.equal(matchZipcodeScope('雙 10號以上', '11號'), false);
  assert.equal(matchZipcodeScope('單 75號以下', '75號之1'), true);
  assert.equal(matchZipcodeScope('連 1號至100號', '90巷122號'), true);
  assert.equal(matchZipcodeScope('連 1號至100號', '101巷1號'), false);
});

test('every scope record in the bundled database is parser-supported', () => {
  const items = allScopeItems();
  assert.equal(items.length, 79876);
  assert.equal(new Set(items.map((item) => item.scope)).size, 21998);
  for (const item of items) {
    const parsed = parseScope(item.scope);
    assert.equal(parsed.supported, true, item.scope);
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import zipcodeData from '../src/assets/zipcode.json' with { type: 'json' };
import {
  getZipcodeScopeMatchBasis,
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

function roadScopes(city, area, road) {
  return zipcodeData[city].areas[area].roads[road].scopes;
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
  assert.equal(resolveZipcodeScopes(scopes, '75號404室').matches[0].zipcode, 234008);
  assert.equal(resolveZipcodeScopes(scopes, '25巷85號5樓').matches[0].zipcode, 234006);
  assert.equal(resolveZipcodeScopes(scopes, '85號5樓').matches[0].zipcode, 234006);
  assert.equal(resolveZipcodeScopes(scopes, '77巷85號').matches[0].zipcode, 234006);
  assert.equal(resolveZipcodeScopes(scopes, '25巷76號').status, 'unmatched');
  assert.equal(resolveZipcodeScopes(scopes, '25巷').status, 'incomplete');
  assert.equal(resolveZipcodeScopes(scopes, '').status, 'empty');
});

test('explains which address level caused a scope match', () => {
  assert.equal(getZipcodeScopeMatchBasis('單 77號以上', '25巷85號5樓').text, '85號');
  assert.equal(getZipcodeScopeMatchBasis('單 77號以上', '85號5樓').text, '85號');
  assert.equal(getZipcodeScopeMatchBasis('192巷單全', '192巷1弄2號').text, '1弄');
  assert.equal(getZipcodeScopeMatchBasis('30號3樓至10樓', '30號5樓').text, '30號、5樓');
  assert.equal(getZipcodeScopeMatchBasis('2之4號及以上附號', '2之4號附號').text, '2之4號附號');
  assert.equal(getZipcodeScopeMatchBasis('全', '25巷85號').text, '路名');
  assert.equal(getZipcodeScopeMatchBasis('單 75號以下', '85號'), null);
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
  assert.equal(matchZipcodeScope('單全', '209巷20弄12號'), true);
  assert.equal(matchZipcodeScope('雙全', '210巷19弄11號'), true);
  assert.equal(matchZipcodeScope('單全', '210巷19弄11號'), false);
  assert.equal(matchZipcodeScope('192巷單全', '192巷1弄2號'), true);
});

test('matches exact, branch/附號, and floor-specific scopes', () => {
  const scopes = [
    { scope: '全', zipcode: 1 },
    { scope: '151號', zipcode: 2 },
    { scope: '151附號', zipcode: 3 },
    { scope: '151號 2樓以上', zipcode: 4 },
  ];

  assert.equal(resolveZipcodeScopes(scopes, '151號').status, 'incomplete');
  assert.equal(resolveZipcodeScopes(scopes, '151號之1').matches[0].zipcode, 3);
  assert.equal(resolveZipcodeScopes(scopes, '151附號').matches[0].zipcode, 3);
  assert.equal(resolveZipcodeScopes(scopes, '151號2樓').matches[0].zipcode, 4);
  assert.equal(resolveZipcodeScopes(scopes, '151號1樓').matches[0].zipcode, 2);

  assert.equal(matchZipcodeScope('10號地下1樓至1樓', '10號地下1樓'), true);
  assert.equal(matchZipcodeScope('10號地下1樓至1樓', '10號1樓'), true);
  assert.equal(matchZipcodeScope('10號地下1樓至1樓', '10號2樓'), false);
  assert.equal(matchZipcodeScope('2之4號及以上附號', '2之5號'), true);
  assert.equal(matchZipcodeScope('2之4號及以上附號', '2之3號'), false);
  assert.equal(matchZipcodeScope('2之4號及以上附號', '3之5號'), false);
});

test('waits for a required floor instead of choosing a broader result', () => {
  const scopes = zipcodeData['臺北市'].areas['北投區'].roads['新市街'].scopes;

  assert.equal(resolveZipcodeScopes(scopes, '30號').status, 'incomplete');
  assert.equal(resolveZipcodeScopes(scopes, '30號2樓').matches[0].zipcode, 112024);
  assert.equal(resolveZipcodeScopes(scopes, '30號3樓').matches[0].zipcode, 112023);
});

test('does not keep an unrelated deeper prefix as a pending candidate', () => {
  const result = resolveZipcodeScopes([
    { scope: '全', zipcode: 1 },
    { scope: '58巷33弄33號', zipcode: 2 },
  ], '12巷');

  assert.equal(result.status, 'matched');
  assert.equal(result.matches[0].zipcode, 1);
});

test('supports mixed 巷/弄/號 endpoints and inclusive ranges', () => {
  assert.equal(matchZipcodeScope('單 1巷至 5號', '1巷'), true);
  assert.equal(matchZipcodeScope('單 1巷至 5號', '3號'), true);
  assert.equal(matchZipcodeScope('單 1巷至 5號', '4號'), false);
  assert.equal(matchZipcodeScope('雙 10號以上', '10號'), true);
  assert.equal(matchZipcodeScope('雙 10號以上', '12號'), true);
  assert.equal(matchZipcodeScope('雙 10號以上', '11號'), false);
  assert.equal(matchZipcodeScope('單 75號以下', '75號之1'), true);
  assert.equal(matchZipcodeScope('連 1號至100號', '90巷122號'), false);
  assert.equal(matchZipcodeScope('連 1號至100號', '101巷1號'), true);
  assert.equal(matchZipcodeScope('58巷單35號以下', '58巷33弄113號'), false);
  assert.equal(matchZipcodeScope('58巷單35號以下', '58巷33弄35號'), true);
});

test('normalizes the database descending numeric interval', () => {
  const scopes = roadScopes('花蓮縣', '花蓮市', '順興路');

  assert.equal(matchZipcodeScope('單 329巷至 293號', '329巷'), true);
  assert.equal(matchZipcodeScope('單 329巷至 293號', '311號'), true);
  assert.equal(matchZipcodeScope('單 329巷至 293號', '293號'), true);
  assert.equal(matchZipcodeScope('單 329巷至 293號', '312號'), false);
  assert.equal(matchZipcodeScope('單 329巷至 293號', '291號'), false);
  assert.equal(resolveZipcodeScopes(scopes, '311號').matches[0].zipcode, 970064);
  assert.equal(matchZipcodeScope('41之15號至之1號', '41之8號'), true);
});

test('keeps all matching records available when overlapping ranges are ambiguous', () => {
  const scopes = roadScopes('臺北市', '中山區', '八德路二段');
  const selected = scopes.find((item) => item.zipcode === 104498 && item.scope.includes('306'));
  const result = resolveZipcodeScopes(scopes, '306號');

  assert.equal(result.status, 'ambiguous');
  assert.equal(result.matches.includes(selected), true);
  assert.equal(result.matches.some((item) => item.zipcode === 104098), true);
});

test('matches representative nested, attached-number, and floor records from the database', () => {
  const cases = [
    ['臺北市', '北投區', '大業路', '527巷12號', 112056],
    ['臺北市', '北投區', '中央北路三段', '120巷1號', 112017],
    ['臺北市', '北投區', '石牌路一段', '58巷35號', 112053],
    ['臺北市', '北投區', '石牌路一段', '58巷37號', 112050],
    ['臺北市', '北投區', '新市街', '30號3樓', 112023],
    ['新北市', '板橋區', '中正路', '10號地下1樓', 220210],
    ['新北市', '淡水區', '英專路', '151號之1', 251025],
    ['新北市', '鶯歌區', '西湖街', '2之4號', 239608],
    ['臺北市', '大安區', '忠孝東路三段', '217巷7弄1號', 106665],
    ['新北市', '三重區', '中興北街', '42巷17弄12號', 241460],
  ];

  for (const [city, area, road, address, zipcode] of cases) {
    const result = resolveZipcodeScopes(roadScopes(city, area, road), address);
    assert.equal(result.status, 'matched', `${city}${area}${road}${address}`);
    assert.equal(result.matches[0].zipcode, zipcode, `${city}${area}${road}${address}`);
  }
});

test('every scope record in the bundled database is parser-supported', () => {
  const items = allScopeItems();
  assert.ok(items.length >= 10000, `only ${items.length} scope records`);
  for (const item of items) {
    const parsed = parseScope(item.scope);
    assert.equal(parsed.supported, true, item.scope);
    assert.equal(parsed.unrecognized, '', item.scope);
  }
});

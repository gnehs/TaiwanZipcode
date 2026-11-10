import assert from 'node:assert/strict';
import test from 'node:test';
import { zipcodeData } from './data.js';
import { scopeRuleToEnglish } from '../src/utils/scopeRuleEnglish.js';

const EXAMPLES = [
  ['全', 'All numbers'],
  ['單全', 'All odd numbers'],
  ['雙全', 'All even numbers'],
  ['70號', 'No. 70'],
  ['2之 1號', 'No. 2-1'],
  ['62巷 10號', 'No. 10, 62 Ln'],
  ['單 1號至 99號', 'Odd Nos. 1–99'],
  ['連 155號至 166號', 'All Nos. 155–166'],
  ['雙 2號以下', 'Even Nos. 2 and below'],
  ['連 10號以上', 'All Nos. 10 and above'],
  ['3巷全', 'All of 3 Ln'],
  ['2弄全', 'All of 2 Aly'],
  ['219巷 3弄全', 'All of 3 Aly, 219 Ln'],
  ['65巷單全', 'All odd numbers in 65 Ln'],
  ['115巷雙 20號至 28號', 'Even Nos. 20–28 in 115 Ln'],
  ['單 525巷以下', 'Odd 525 Ln and below'],
  ['雙 101巷至 117巷', 'Even 101–117 Ln'],
  ['單 273號至 393巷', 'Odd No. 273 to 393 Ln'],
  ['41之 1號至之 15號', 'Nos. 41-1 to 41-15'],
  ['2號含附號', 'No. 2, incl. attached'],
  ['151附號', 'Attached Nos. of 151'],
  ['2之 4號及以上附號', 'Attached Nos. 2-4 and above'],
  ['33號 1樓', 'No. 33, 1F'],
  ['雙 346號至 348號 2樓以上', 'Even Nos. 346–348, 2F and above'],
  ['30號 3樓至10樓', 'No. 30, 3F–10F'],
  ['10號地下 1樓至 1樓', 'No. 10, B1F'],
  ['雙1228號至1260號', 'Even Nos. 1228–1260'],
];

for (const [rule, english] of EXAMPLES) {
  test(`${rule} → ${english}`, () => {
    assert.equal(scopeRuleToEnglish(rule), english);
  });
}

test('every scope rule in the data translates to clean English', () => {
  const rules = new Set();
  for (const city of Object.values(zipcodeData)) {
    for (const area of Object.values(city.areas)) {
      for (const road of Object.values(area.roads)) {
        for (const { scope } of road.scopes) rules.add(scope);
      }
    }
  }
  assert.ok(rules.size > 1000);

  const problems = [];
  for (const rule of rules) {
    const english = scopeRuleToEnglish(rule);
    if (!english.trim() || /\p{Script=Han}/u.test(english) || /undefined|null|NaN/.test(english)) {
      problems.push(`${rule} → ${english}`);
    }
  }
  assert.deepEqual(problems, []);
});

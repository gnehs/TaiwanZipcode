import assert from 'node:assert/strict';
import test from 'node:test';
import { hasUnconvertedAddressParts } from '../src/utils/addressConversion.js';

test('accepts equivalent spacing, full-width digits, and attached-number notation', () => {
  for (const input of ['１２巷３之１號 ４樓４０４室', '12巷3-1號4樓404室', '12巷3號之1 4樓404室']) {
    assert.equal(hasUnconvertedAddressParts(input, '12巷3號之1 4樓404室'), false, input);
  }
});

test('flags room, building, and nested lane content omitted by conversion', () => {
  for (const [input, reconstructed] of [
    ['12巷3號4樓404', '12巷3號4樓'],
    ['12巷3號ABC', '12巷3號'],
    ['3號４０４室', '3號'],
    ['3號A棟', '3號'],
    ['12巷3巷4號', '12巷4號'],
    ['3附號', '3號'],
  ]) {
    assert.equal(hasUnconvertedAddressParts(input, reconstructed), true, input);
  }
});

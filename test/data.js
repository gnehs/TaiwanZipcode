import fs from 'node:fs';

import {
  decodeRoadCorrections,
  decodeZipcodeData,
  roadListsOf,
} from '../src/utils/zipcodeCodec.js';

// The tests read the same compact files the site ships.
const read = (name) => fs.readFileSync(new URL(`../src/assets/${name}`, import.meta.url), 'utf8');

export const zipcodeData = decodeZipcodeData(read('zipcode.txt'));

const compactCorrections = JSON.parse(read('corrections.json'));
export const corrections = {
  ...compactCorrections,
  roads: decodeRoadCorrections(compactCorrections.roads, roadListsOf(zipcodeData)),
};

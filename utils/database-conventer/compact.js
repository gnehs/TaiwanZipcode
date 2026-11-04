const assert = require("assert");
const fs = require("fs");
const path = require("path");

// The site ships zipcode.txt, the compact text form of zipcode.json; see
// src/utils/zipcodeCodec.js. Decoding must give back the database exactly,
// apart from rule text, whose padding is squeezed to single spaces.
const sourcePath = path.join(__dirname, "result", "zipcode.json");
const resultPath = path.join(__dirname, "result", "zipcode.txt");

import("../../src/utils/zipcodeCodec.js").then(
  ({ compactRule, decodeZipcodeData, encodeZipcodeData }) => {
    const database = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    const text = encodeZipcodeData(database);

    for (const city of Object.values(database)) {
      for (const area of Object.values(city.areas)) {
        for (const road of Object.values(area.roads)) {
          for (const scope of road.scopes) scope.scope = compactRule(scope.scope);
        }
      }
    }
    assert.deepStrictEqual(decodeZipcodeData(text), database);

    fs.writeFileSync(resultPath, `${text}\n`);
    console.log(`Wrote ${Buffer.byteLength(text)} bytes to ${resultPath}`);
  },
);

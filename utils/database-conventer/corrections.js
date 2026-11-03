const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// Lookup tables shipped beside rall1.dbf in the same installer. They map the
// spellings people actually write to the database's own names.
const sourceDir = path.join(__dirname, "src");
const zipcodePath = path.join(__dirname, "result", "zipcode.json");
const resultPath = path.join(__dirname, "result", "corrections.json");

const minimumRows = {
  "uroad.dbf": 10_000,
  "uroad1.dbf": 500,
  "errword.dbf": 50,
  "cityarea.dbf": 1_000,
  "Inds.DBF": 100,
};

function readRows(file, fields) {
  const filePath = path.join(sourceDir, file);
  if (!fs.existsSync(filePath)) throw new Error(`Table not found: ${filePath}`);
  const sheet = XLSX.readFile(filePath).Sheets;
  const rows = XLSX.utils.sheet_to_json(Object.values(sheet)[0], { raw: false, defval: "" });
  const missing = fields.filter((field) => !(rows[0] && field in rows[0]));
  if (missing.length) throw new Error(`${file} is missing fields: ${missing.join(", ")}`);
  if (rows.length < minimumRows[file]) {
    throw new Error(`${file} has only ${rows.length} rows; expected at least ${minimumRows[file]}`);
  }
  return rows.map((row) =>
    Object.fromEntries(fields.map((field) => [field, String(row[field]).trim()])),
  );
}

const zipcode = JSON.parse(fs.readFileSync(zipcodePath, "utf8"));
const roadsByPlace = new Map();
for (const [city, { areas }] of Object.entries(zipcode)) {
  for (const [area, { roads }] of Object.entries(areas)) {
    roadsByPlace.set(`${city}${area}`, new Set(Object.keys(roads)));
  }
}

// Road corrections, per district. A correction is kept only when its target
// is a real road there and its source is not, so no real road is renamed.
const roads = {};
let roadCount = 0;
function addRoad(place, from, to) {
  const known = roadsByPlace.get(place);
  if (!known || !from || from === to || /\s|　/u.test(from)) return;
  if (!known.has(to) || known.has(from)) return;
  roads[place] ??= {};
  if (roads[place][from] && roads[place][from] !== to) {
    // The same misspelling pointing at two roads is no correction at all.
    roads[place][from] = null;
    return;
  }
  if (!roads[place][from]) roadCount += 1;
  roads[place][from] = to;
}

for (const row of readRows("uroad.dbf", ["CITY", "AREA", "ROAD", "ROAD1"])) {
  addRoad(`${row.CITY}${row.AREA}`, row.ROAD, row.ROAD1);
}
// uroad1 lists roads with a character fonts often lack; ROAD2 is the name
// written without it (大路 for 大峰路).
for (const row of readRows("uroad1.dbf", ["CITY", "AREA", "ROAD", "ROAD1", "ROAD2"])) {
  addRoad(`${row.CITY}${row.AREA}`, row.ROAD2, row.ROAD1);
  addRoad(`${row.CITY}${row.AREA}`, row.ROAD, row.ROAD1);
}
for (const place of Object.keys(roads)) {
  for (const [from, to] of Object.entries(roads[place])) {
    if (to === null) {
      delete roads[place][from];
      roadCount -= 1;
    }
  }
}

// Words that are wrong wherever they appear (中歷 → 中壢).
const words = readRows("errword.dbf", ["ERRW", "RIGW"])
  .filter(({ ERRW, RIGW }) => ERRW && ERRW !== RIGW)
  .map(({ ERRW, RIGW }) => [ERRW, RIGW]);

// Abbreviated and former city/district names (北市中正區, 臺北縣板橋市). Most
// follow a pattern, so only the city forms, misspelt district stems and
// leftover names are kept; placeAliases.js expands them again, and every
// listed name is checked to come back out.
function derivePlaces({ areaForms, expandPlaceAliases }) {
  const listed = new Map();
  for (const row of readRows("cityarea.dbf", ["CITYAREA", "CITY", "AREA"])) {
    const place = `${row.CITY}${row.AREA}`;
    // Text is read with 台 already written as 臺.
    const alias = row.CITYAREA.replaceAll("台", "臺");
    if (alias && alias !== place && roadsByPlace.has(place)) listed.set(alias, row);
  }

  const cities = {};
  const areas = {};
  const addCity = (form, city) => {
    if (form === city || form === city.slice(0, -1)) return;
    cities[form] ??= [];
    if (!cities[form].includes(city)) cities[form].push(city);
  };
  const cityFormsOf = (city) => [
    city,
    city.slice(0, -1),
    ...Object.entries(cities).filter(([, list]) => list.includes(city)).map(([form]) => form),
    "",
  ];

  // First the other names of cities, from aliases whose district reads fine.
  for (const [alias, { CITY, AREA }] of listed) {
    const form = [...areaForms(AREA)]
      .filter((areaForm) => alias.endsWith(areaForm))
      .sort((a, b) => b.length - a.length)[0];
    const cityForm = form ? alias.slice(0, -form.length) : null;
    if (cityForm) addCity(cityForm, CITY);
  }
  // Then misspelt districts, written after any known form of their city.
  for (const [alias, { CITY, AREA }] of listed) {
    if ([...areaForms(AREA)].some((areaForm) => alias.endsWith(areaForm))) continue;
    const cityForm = cityFormsOf(CITY)
      .filter((form) => alias.startsWith(form))
      .sort((a, b) => b.length - a.length)[0];
    if (cityForm === undefined) continue;
    const rest = alias.slice(cityForm.length);
    const stem = /[區鄉鎮市]$/u.test(rest) ? rest.slice(0, -1) : rest;
    if (Array.from(stem).length >= 2) {
      areas[CITY] ??= {};
      areas[CITY][stem] = AREA;
    }
  }

  const districts = [...roadsByPlace.keys()].map((place) => {
    const city = Object.keys(zipcode).find((name) => place.startsWith(name));
    return { city, area: place.slice(city.length) };
  });
  const names = {};
  let expanded = expandPlaceAliases(districts, { cities, areas });
  for (const [alias, { CITY, AREA }] of listed) {
    if (expanded.get(alias) !== `${CITY}${AREA}`) names[alias] = `${CITY}${AREA}`;
  }
  expanded = expandPlaceAliases(districts, { cities, areas, names });
  for (const [alias, { CITY, AREA }] of listed) {
    if (expanded.get(alias) !== `${CITY}${AREA}`) {
      throw new Error(`The place name ${alias} does not expand to ${CITY}${AREA}`);
    }
  }
  return { places: { cities, areas, names }, listedCount: listed.size, expandedCount: expanded.size };
}

// Industrial and science parks, written in place of (or before) the district.
const parks = {};
for (const row of readRows("Inds.DBF", ["NAME", "SNAME", "CITY", "AREA"])) {
  const place = `${row.CITY}${row.AREA}`;
  if (!zipcode[row.CITY] || (row.AREA && !roadsByPlace.has(place))) continue;
  for (const name of [row.NAME, row.SNAME]) {
    if (Array.from(name).length >= 4) parks[name] = place;
  }
}

if (roadCount < 10_000) throw new Error(`Only ${roadCount} road corrections were kept`);

import("../../src/utils/placeAliases.js").then((placeAliases) => {
  const { places, listedCount, expandedCount } = derivePlaces(placeAliases);
  fs.writeFileSync(resultPath, `${JSON.stringify({ roads, words, places, parks })}\n`);
  console.log(
    `Wrote ${roadCount} road corrections, ${words.length} words, ` +
      `${listedCount} place names (${Object.keys(places.names).length} stored as is, ` +
      `${expandedCount} written forms in all) and ${Object.keys(parks).length} parks to ${resultPath}`,
  );
});

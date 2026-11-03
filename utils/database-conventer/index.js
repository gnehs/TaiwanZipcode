const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const databasePath = path.join(__dirname, "src", "rall1.dbf");
const resultPath = path.join(__dirname, "result", "zipcode.json");
const requiredFields = [
  "CITY",
  "ECITY",
  "AREA",
  "EAREA",
  "ROAD",
  "EROAD",
  "ZIPCODE",
  "SCOOP",
  "DEPARTMENT",
];
const nonEmptyFields = ["CITY", "AREA", "ROAD", "ZIPCODE", "SCOOP"];
const minimumRecords = 10_000;
const minimumCities = 20;

// English suffix for each Chinese administrative suffix. The DBF's
// fixed-width columns cut long names off ("Lienchiang Coun"), so the suffix
// is completed from the Chinese name.
const citySuffixes = { 縣: "County", 市: "City" };
const areaSuffixes = { 區: "Dist.", 鄉: "Township", 鎮: "Township", 市: "City" };

if (!fs.existsSync(databasePath)) {
  throw new Error(`Database file not found: ${databasePath}`);
}

const databaseStats = fs.statSync(databasePath);
if (!databaseStats.isFile() || databaseStats.size < 1024) {
  throw new Error(`Database file is missing or unexpectedly small: ${databasePath}`);
}

console.log(`DatabasePath: ${databasePath} (${databaseStats.size} bytes)`);

const workbook = XLSX.readFile(databasePath);
const firstSheetName = workbook.SheetNames[0];
if (!firstSheetName) {
  throw new Error("The DBF does not contain a worksheet");
}

const firstSheet = workbook.Sheets[firstSheetName];
const headerRows = XLSX.utils.sheet_to_json(firstSheet, {
  header: 1,
  raw: false,
});
const headers = headerRows[0] || [];
const missingFields = requiredFields.filter((field) => !headers.includes(field));
if (missingFields.length > 0) {
  throw new Error(`The DBF is missing required fields: ${missingFields.join(", ")}`);
}

const parsedData = XLSX.utils.sheet_to_json(firstSheet);
if (parsedData.length < minimumRecords) {
  throw new Error(
    `The DBF contains only ${parsedData.length} records; expected at least ${minimumRecords}`,
  );
}

const cityNames = new Set();
for (const [index, item] of parsedData.entries()) {
  for (const field of nonEmptyFields) {
    if (String(item[field]).trim() === "") {
      throw new Error(`DBF record ${index + 1} has an empty ${field} field`);
    }
  }

  if (!/^\d{6}$/.test(String(item.ZIPCODE).trim())) {
    throw new Error(`DBF record ${index + 1} has an invalid ZIPCODE`);
  }
  cityNames.add(item.CITY);
}

if (cityNames.size < minimumCities) {
  throw new Error(
    `The DBF contains only ${cityNames.size} cities; expected at least ${minimumCities}`,
  );
}

function normalizeEnglish(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/[,\s]+$/, "")
    .trim();
}

function completeSuffix(value, suffix, field) {
  if (value === "" || value.endsWith(` ${suffix}`)) {
    return value;
  }
  for (let length = suffix.length - 1; length > 0; length -= 1) {
    if (value.endsWith(` ${suffix.slice(0, length)}`)) {
      return value + suffix.slice(length);
    }
  }
  throw new Error(`${field} "${value}" does not end in "${suffix}"`);
}

// Records whose CITY is not a 縣 or 市, such as 釣魚臺 and 南海諸 (南海諸島),
// repeat records filed under a real city and carry no English names.
const isListedCity = (item) => Object.hasOwn(citySuffixes, item.CITY.at(-1));
const records = parsedData.filter(isListedCity);
const listedZipcodes = new Set(records.map((item) => String(item.ZIPCODE).trim()));
for (const item of parsedData) {
  if (!isListedCity(item) && !listedZipcodes.has(String(item.ZIPCODE).trim())) {
    throw new Error(`Unlisted city ${item.CITY} holds unique ZIPCODE ${item.ZIPCODE}`);
  }
}

for (const item of records) {
  // An AREA cut short of its suffix, such as 釣魚臺列 for 釣魚臺列嶼, is
  // completed from the ROAD that spells it out.
  if (!Object.hasOwn(areaSuffixes, item.AREA.at(-1))) {
    const road = String(item.ROAD).trim();
    if (!road.startsWith(item.AREA)) {
      throw new Error(`AREA "${item.AREA}" has no administrative suffix to complete it`);
    }
    item.AREA = road;
  }
  for (const field of ["ECITY", "EAREA", "EROAD"]) {
    item[field] = normalizeEnglish(item[field]);
  }
  item.ECITY = completeSuffix(item.ECITY, citySuffixes[item.CITY.at(-1)], "ECITY");
  if (Object.hasOwn(areaSuffixes, item.AREA.at(-1))) {
    item.EAREA = completeSuffix(item.EAREA, areaSuffixes[item.AREA.at(-1)], "EAREA");
  }
}

const result = {};
records.forEach((item) => {
  if (!result[item.CITY]) {
    result[item.CITY] = {
      en: item.ECITY,
      areas: {},
    };
  }
  if (!result[item.CITY].areas[item.AREA]) {
    result[item.CITY].areas[item.AREA] = {
      en: item.EAREA,
      roads: {},
    };
  }
  if (!result[item.CITY].areas[item.AREA].roads[item.ROAD]) {
    result[item.CITY].areas[item.AREA].roads[item.ROAD] = {
      en: item.EROAD,
      scopes: [],
    };
  }

  result[item.CITY].areas[item.AREA].roads[item.ROAD].scopes.push({
    scope: item.SCOOP,
    zipcode: Number.parseInt(item.ZIPCODE, 10),
    department: item.DEPARTMENT,
  });
});

const serializedResult = JSON.stringify(result);
if (serializedResult.length < 1_000_000) {
  throw new Error("The converted zipcode JSON is unexpectedly small");
}

fs.writeFileSync(resultPath, serializedResult);
console.log(
  `${records.length} items from ${Object.keys(result).length} cities saved to ${resultPath}`,
);

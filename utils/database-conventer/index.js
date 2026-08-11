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

const result = {};
parsedData.forEach((item) => {
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
  `${parsedData.length} items from ${cityNames.size} cities saved to ${resultPath}`,
);

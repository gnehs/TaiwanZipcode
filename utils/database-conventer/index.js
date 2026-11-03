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

// Every name that fills its fixed-width DBF column, mapped to the full name.
// Truncated ones follow the post office's own address converter. A new name
// at full width stops the update until it is checked and added here.
const fullWidthNames = {
  ECITY: {
    "New Taipei City": "New Taipei City",
    "Changhua County": "Changhua County",
    "Pingtung County": "Pingtung County",
    "Lienchiang Coun": "Lienchiang County",
  },
  AREA: {
    阿里山鄉: "阿里山鄉",
    那瑪夏區: "那瑪夏區",
    三地門鄉: "三地門鄉",
    太麻里鄉: "太麻里鄉",
    釣魚臺列: "釣魚臺",
  },
  EAREA: {},
};
// Placeholder cities the converter does not list. Their records repeat ones
// filed under 宜蘭縣 and 高雄市旗津區, without English names.
const placeholderCities = new Set(["釣魚臺", "南海諸"]);

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

// DBF field descriptors are 32 bytes each, from offset 32 until 0x0d.
function readFieldWidths(buffer) {
  const widths = {};
  for (let offset = 32; buffer[offset] !== 0x0d; offset += 32) {
    const name = buffer.toString("latin1", offset, offset + 11).replace(/\0.*$/s, "");
    widths[name] = buffer[offset + 16];
  }
  return widths;
}

// Byte length in Big5 (code page 950), the DBF's encoding.
function big5Length(value) {
  let length = 0;
  for (const char of value) {
    length += char.codePointAt(0) > 0x7f ? 2 : 1;
  }
  return length;
}

function normalizeEnglish(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/[,\s]+$/, "")
    .trim();
}

const fieldWidths = readFieldWidths(fs.readFileSync(databasePath));
const records = parsedData.filter((item) => !placeholderCities.has(item.CITY));
const listedZipcodes = new Set(records.map((item) => String(item.ZIPCODE).trim()));
for (const item of parsedData) {
  if (placeholderCities.has(item.CITY) && !listedZipcodes.has(String(item.ZIPCODE).trim())) {
    throw new Error(`Placeholder city ${item.CITY} holds unlisted ZIPCODE ${item.ZIPCODE}`);
  }
}

for (const item of records) {
  for (const [field, names] of Object.entries(fullWidthNames)) {
    const value = String(item[field] ?? "").trim();
    if (big5Length(value) < fieldWidths[field]) {
      continue;
    }
    if (!Object.hasOwn(names, value)) {
      throw new Error(`${field} "${value}" fills its ${fieldWidths[field]}-byte column and may be truncated`);
    }
    item[field] = names[value];
  }
  for (const field of ["ECITY", "EAREA", "EROAD"]) {
    item[field] = normalizeEnglish(item[field]);
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

const XLSX = require("xlsx");
const fs = require('fs');
const path = require('path');

let DatabasePath = './src/rall1.dbf'
console.log(`DatabasePath: ${DatabasePath}`);

let workbook = XLSX.readFile(DatabasePath);
let parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
parsedData = parsedData.map(item => ({
  city: {
    zh: item.CITY,
    en: item.ECITY
  },
  area: {
    zh: item.AREA,
    en: item.EAREA
  },
  road: {
    zh: item.ROAD,
    en: item.EROAD,
  },
  zipcode: item.ZIPCODE,
  scope: item.SCOOP,
  department: item.DEPARTMENT,
}))
let result = {}
parsedData.forEach(item => {
  if (!result[item.city.zh]) {
    result[item.city.zh] = {
      en: item.city.en,
      areas: {}
    }
  }
  if (!result[item.city.zh].areas[item.area.zh]) {
    result[item.city.zh].areas[item.area.zh] = {
      en: item.area.en,
      roads: {}
    }
  }
  if (!result[item.city.zh].areas[item.area.zh].roads[item.road.zh]) {
    result[item.city.zh].areas[item.area.zh].roads[item.road.zh] = {
      en: item.road.en,
      scopes: []
    }
  }

  result[item.city.zh].areas[item.area.zh].roads[item.road.zh].scopes
    .push({
      scope: item.scope,
      zipcode: parseInt(item.zipcode),
      department: item.department,
    })
})
fs.writeFileSync(path.join(__dirname, './result/zipcode.json'), JSON.stringify(result));
console.log(`${parsedData.length} items saved to ./result/zipcode.json`);
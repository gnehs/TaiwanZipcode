const XLSX = require("xlsx");
const fs = require('fs');
const path = require('path');

let DatabasePath = './src/rall1.dbf'
console.log(`DatabasePath: ${DatabasePath}`);

let workbook = XLSX.readFile(DatabasePath);
let parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
parsedData = parsedData.map(item => ({
  zipcode: item.ZIPCODE,
  city: item.CITY,
  area: item.AREA,
  road: item.ROAD,
  scope: item.SCOOP,
}))
let result = {}
parsedData.forEach(item => {
  if (!result[item.city])
    result[item.city] = {}
  if (!result[item.city][item.area])
    result[item.city][item.area] = {}
  if (!result[item.city][item.area][item.road])
    result[item.city][item.area][item.road] = []

  result[item.city][item.area][item.road].push({
    scope: item.scope,
    zipcode: parseInt(item.zipcode)
  })
})
fs.writeFileSync(path.join(__dirname, './result/zipcode.json'), JSON.stringify(result));
console.log(`${parsedData.length} items saved to ./result/zipcode.json`);
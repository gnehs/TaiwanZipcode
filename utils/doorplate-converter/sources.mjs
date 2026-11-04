// Counties that publish their doorplate positions on data.gov.tw. A county
// that republishes under a new dataset each period is found by searching for
// its title; the newest period wins.
//
// format: 'csv' is the MOI's eleven-column layout, 'json' the same fields as
// objects, 'no-place-csv' the CSV layout without its 地區 column, and
// 'address-csv' a layout with the whole address in one column.
// A county whose server refuses automated downloads is packed by hand with
// manual.mjs and read from ./manual; it is only as new as its last packing.
export const SOURCES = [
  { county: '臺北市', dataset: 155472 },
  { county: '新北市', dataset: 168887 },
  { county: '桃園市', dataset: 157689 },
  // Taichung lists a Google Drive file per month on its own portal; the
  // dataset is per year, so this index moves when a new year's set appears.
  {
    county: '臺中市',
    driveIndex: 'https://newdatacenter.taichung.gov.tw/api/v1/no-auth/resource.download?rid=7090c8eb-fcc7-4cb8-8d0e-843f0654ad95',
  },
  { county: '臺南市', dataset: 120044 },
  { county: '高雄市', search: '高雄市門牌坐標資料', title: /^高雄市(\d+)年門牌坐標資料-TWD97$/u },
  { county: '基隆市', page: 'https://www.klcg.gov.tw/tw/civil/2209-292163.html', format: 'no-place-csv' },
  { county: '新竹市', dataset: 157547, format: 'address-csv' },
  { county: '新竹縣', dataset: 172380 },
  {
    county: '苗栗縣',
    search: '苗栗縣門牌點位維護系統門牌座標資料',
    title: /^苗栗縣迄(\d+)年(\d+)月(\d+)日門牌點位維護系統門牌座標資料$/u,
  },
  { county: '彰化縣', dataset: 170727 },
  // Downloaded 2026-11-04 from dataset 166201 (資料日期 1140505).
  { county: '雲林縣', manual: './manual/雲林縣.csv', date: '114-5-5' },
  // Its server's TLS 1.2 Diffie-Hellman key is too small for OpenSSL; ECDHE is fine.
  {
    county: '嘉義縣',
    dataset: 172873,
    tls: { maxVersion: 'TLSv1.2', ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384' },
  },
  { county: '屏東縣', dataset: 170847 },
  { county: '臺東縣', dataset: 165619 },
  { county: '花蓮縣', dataset: 175221 },
  { county: '澎湖縣', dataset: 170852 },
  { county: '金門縣', dataset: 171571, format: 'json' },
];

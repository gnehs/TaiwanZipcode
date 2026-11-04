// Counties that publish their doorplate positions on data.gov.tw in the
// MOI's eleven-column layout. A county that republishes under a new dataset
// each period is found by searching for its title; the newest period wins.
// Hsinchu City and Kinmen serve certificates Node does not trust, Chiayi
// County's server offers only a Diffie-Hellman key OpenSSL rejects as too
// small, and Yunlin refuses automated downloads, so they are not listed.
export const SOURCES = [
  { county: '臺北市', dataset: 155472 },
  { county: '新北市', dataset: 168887 },
  { county: '桃園市', dataset: 157689 },
  { county: '臺南市', dataset: 120044 },
  { county: '高雄市', search: '高雄市門牌坐標資料', title: /^高雄市(\d+)年門牌坐標資料-TWD97$/u },
  { county: '新竹縣', dataset: 172380 },
  {
    county: '苗栗縣',
    search: '苗栗縣門牌點位維護系統門牌座標資料',
    title: /^苗栗縣迄(\d+)年(\d+)月(\d+)日門牌點位維護系統門牌座標資料$/u,
  },
  { county: '臺東縣', dataset: 165619 },
  { county: '澎湖縣', dataset: 170852 },
];

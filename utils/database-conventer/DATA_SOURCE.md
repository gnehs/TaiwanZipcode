# 資料來源說明（Data Source）

本專案使用的 `rall1.dbf` 來自中華郵政「3+3 郵遞區號應用系統」官方安裝包。

## 現行取得方式

1. `downloadDatabase.js` 讀取[中華郵政下載頁](https://www.post.gov.tw/post/internet/Download/index.jsp?ID=220306)，找出最新、分卷連續的 `Zip33Setup_*.partN.rar`（舊名 `Zip33Usetup_*`）。
2. 逐卷從 `post.gov.tw/post/download/` 下載並驗證 RAR 檔頭，再以 `unar` 組合出安裝程式。
3. `gea-extract` 解析安裝程式內嵌的 Gentee GEA 封裝，解出 `DBF/` 下指定的資料表；不執行安裝程式，也不需要 Windows 或 Wine。
4. `index.js` 驗證 `rall1.dbf` 的欄位與資料量，轉成 `result/zipcode.json`。
5. `corrections.js` 讀取同一個安裝程式裡的對照表，轉成 `result/corrections.json`。
6. `compact.js` 把 `zipcode.json` 轉成網站載入的 `result/zipcode.txt`。

## 網站載入的格式

兩份資料都會傳給每位使用者，所以存成可完整還原的精簡格式，編碼與解碼共用
[`zipcodeCodec.js`](../../src/utils/zipcodeCodec.js)，轉檔時逐筆核對解碼結果：

- `zipcode.txt`：每行一條道路，不重複欄位名稱；行政區共用的郵遞區號前三碼只存一次，
  規則文字的對齊空白合為一格；英文路名省略可由中文推回的段號與 Rd./St.，同名道路
  只存第一次。
- `corrections.json` 的 `roads`：正確路名以該行政區的道路序號表示，錯誤寫法存成與
  正確路名的差異（換掉、多出或少了哪個字）。

## 地址更正對照表

應用系統用來校正地址的資料表，與 `rall1.dbf` 一起出現在安裝程式的 `DBF/` 中：

| 檔案 | 內容 | 轉換後 |
| --- | --- | --- |
| `uroad.dbf` | 各鄉鎮市區常見的錯誤路名與正確路名（八得路一段 → 八德路一段） | `roads` |
| `uroad1.dbf` | 含罕用字的路名與缺字寫法（大路 → 大峰路） | `roads` |
| `errword.dbf` | 不分地區的錯字（中歷 → 中壢） | `words` |
| `cityarea.dbf` | 縣市鄉鎮市區的簡稱與舊名（北市中正區、臺北縣板橋市） | `places`（見下） |
| `Inds.DBF` | 工業區、科學園區名稱與所在行政區 | `parks` |

`places` 不逐條儲存：多數簡稱是「縣市寫法 × 行政區寫法」的組合（新北金山、金山鄉），
所以只存縣市的其他寫法（`cities`）、行政區錯字（`areas`）與規則推不出的名稱
（`names`），由 [`placeAliases.js`](../../src/utils/placeAliases.js) 在瀏覽器展開。
轉檔時會確認每一筆原始簡稱都能展開回正確的行政區。

路名更正只保留「正確路名存在於 `rall1.dbf`、錯誤路名不是當地真實道路」的組合，
同一錯誤寫法對應到兩條路時整組捨棄，避免把真實路名改掉。網站在第一次載入後才
另外下載 `corrections.json`，不影響首頁載入。

封裝是一整段固實壓縮（solid）資料：每個檔案都接續前一個檔案的解壓視窗，所以
`gea-extract` 會依封裝順序解開到最後一個指定檔案為止，並逐一核對 CRC。

目前驗證版本為 **V2603（官方更新日 115/06/30）**。該安裝程式使用 CreateInstall/Gentee
封裝，不能再用舊版流程的 `innoextract`，但 GEA payload 內仍包含完整的
`DBF/rall1.dbf`。實際抽出的檔案為 Visual FoxPro DBF、79,876 筆，資料日期為
2026-06-29。

`gea-extract` 只實作本專案需要、且能明確驗證的 GEA v2/LZGE 路徑。若官方日後改變
下載頁、封裝格式、壓縮方法或 DBF schema，更新流程會以非零狀態停止，不會靜默回退到
舊資料。

## DBF 已知錯誤

DBF 是固定寬度欄位（`CITY` 6 bytes、`ECITY` 15 bytes、`AREA` 8 bytes，Big5），
過長的名稱會被截斷，例如 `Lienchiang Coun`、`釣魚臺列`。`index.js` 產生時自動修正：

- 英文縣市、鄉鎮市區名稱依中文字尾補齊英文字尾：縣→`County`、市→`City`、
  區→`Dist.`、鄉／鎮→`Township`。
- 沒有行政區字尾的 `AREA` 以開頭相同的 `ROAD` 補全（`釣魚臺列` → `釣魚臺列嶼`）。
- `CITY` 不是縣或市的紀錄（`釣魚臺`、`南海諸`）沒有英文名稱，且與宜蘭縣、高雄市
  旗津區的紀錄重複，因此略過。
- 英文欄位統一全形字元、多餘空白與逗號。

無法自動修正的名稱會讓更新流程停止，不會寫出錯誤資料。

## 手動執行

Linux 需要 Node.js、npm、C 編譯器與 `unar`：

```bash
cd utils/database-conventer
npm ci
make
node downloadDatabase.js
./gea-extract ./temp/installer.exe ./src \
  rall1.dbf uroad.dbf uroad1.dbf errword.dbf cityarea.dbf Inds.DBF
node index.js
node corrections.js
node compact.js
```

## 實作來源與授權

GEA/LZGE 解碼器取自 Gentee 公開原始碼，相關檔案保留原始著作權標頭與授權條款：

- [Gentee GEA source](https://www.gentee.com/source/src/projects/gea/index.htm)
- [Gentee license](https://www.gentee.com/language/license.htm)（專案內副本：[`gea/LICENSE`](./gea/LICENSE)）
- [CreateInstall Setup Extractor 說明](https://www.createinstall.com/help/setup-extractor.html)

郵遞區號資料的使用方式請另參考：

- [中華郵政「3+3 郵遞區號」公開授權聲明](https://www.post.gov.tw/post/download/%E4%B8%AD%E8%8F%AF%E9%83%B5%E6%94%BF%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B83%2B3%E9%83%B5%E9%81%9E%E5%8D%80%E8%99%9F%E5%85%AC%E9%96%8B%E6%8E%88%E6%AC%8A%E8%81%B2%E6%98%8E.pdf)
- [本公司3+3郵遞區號系統使用規範說明事項](../../docs/本公司3+3郵遞區號系統使用規範說明事項.pdf)

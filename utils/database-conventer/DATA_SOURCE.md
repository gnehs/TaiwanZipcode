# 資料來源說明（Data Source）

本專案使用的 `rall1.dbf` 來自中華郵政「3+3 郵遞區號應用系統」官方安裝包。

## 現行取得方式

1. `downloadDatabase.js` 讀取[中華郵政下載頁](https://www.post.gov.tw/post/internet/Download/index.jsp?ID=220306)，找出最新、分卷連續的 `Zip33Usetup_*.partN.rar`。
2. 逐卷從 `post.gov.tw/post/download/` 下載並驗證 RAR 檔頭，再以 `unar` 組合出安裝程式。
3. `gea-extract` 解析安裝程式內嵌的 Gentee GEA 封裝，直接解出 `DBF/rall1.dbf`；不執行安裝程式，也不需要 Windows 或 Wine。
4. `index.js` 驗證 DBF 的欄位與資料量，轉成 `result/zipcode.json`。

目前驗證版本為 **V2603（官方更新日 115/06/30）**。該安裝程式使用 CreateInstall/Gentee
封裝，不能再用舊版流程的 `innoextract`，但 GEA payload 內仍包含完整的
`DBF/rall1.dbf`。實際抽出的檔案為 Visual FoxPro DBF、79,876 筆，資料日期為
2026-06-29。

`gea-extract` 只實作本專案需要、且能明確驗證的 GEA v2/LZGE 路徑。若官方日後改變
下載頁、封裝格式、壓縮方法或 DBF schema，更新流程會以非零狀態停止，不會靜默回退到
舊資料。

## 手動執行

Linux 需要 Node.js、npm、C 編譯器與 `unar`：

```bash
cd utils/database-conventer
npm ci
make
node downloadDatabase.js
./gea-extract ./temp/installer.exe ./src/rall1.dbf
node index.js
```

## 實作來源與授權

GEA/LZGE 解碼器取自 Gentee 公開原始碼，相關檔案保留原始著作權標頭與授權條款：

- [Gentee GEA source](https://www.gentee.com/source/src/projects/gea/index.htm)
- [Gentee license](https://www.gentee.com/language/license.htm)（專案內副本：[`gea/LICENSE`](./gea/LICENSE)）
- [CreateInstall Setup Extractor 說明](https://www.createinstall.com/help/setup-extractor.html)

郵遞區號資料的使用方式請另參考：

- [中華郵政「3+3 郵遞區號」公開授權聲明](https://www.post.gov.tw/post/download/%E4%B8%AD%E8%8F%AF%E9%83%B5%E6%94%BF%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B83%2B3%E9%83%B5%E9%81%9E%E5%8D%80%E8%99%9F%E5%85%AC%E9%96%8B%E6%8E%88%E6%AC%8A%E8%81%B2%E6%98%8E.pdf)
- [本公司3+3郵遞區號系統使用規範說明事項](../../docs/本公司3+3郵遞區號系統使用規範說明事項.pdf)

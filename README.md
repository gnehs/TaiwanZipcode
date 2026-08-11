# 台灣 3+3 郵遞區號查詢

即時、快速、無需驗證碼的台灣 3+3 郵遞區號查詢工具。

## 前端開發

本專案使用 npm：

```bash
npm install
npm run dev
```

正式建置：

```bash
npm run build
```

## 郵遞區號資料

資料來自中華郵政「3+3 郵遞區號應用系統」的官方安裝包。目前已驗證
**V2603（官方更新日 115/06/30）**，其中的 `DBF/rall1.dbf` 為 Visual FoxPro DBF，
資料日期 2026-06-29，共 79,876 筆。

新版安裝包不是 Inno Setup，而是 CreateInstall/Gentee GEA 封裝。本專案的更新工具會
直接拆出 DBF，**不會執行 Windows 安裝程式，也不需要 Wine**：

1. 從[中華郵政官方下載頁](https://www.post.gov.tw/post/internet/Download/index.jsp?ID=220306)探索最新版本。
2. 下載並驗證所有 RAR 分卷，以 `unar` 組合出 EXE。
3. 用專案內的 `gea-extract` 直接解析 EXE 內嵌的 GEA v2/LZGE 資料。
4. 驗證 GEA CRC、DBF header、必要欄位及最低資料量。
5. 轉換成 `src/assets/zipcode.json`。

完整技術細節與手動更新指令請見
[資料庫轉換器](utils/database-conventer/README.md)及
[資料來源說明](utils/database-conventer/DATA_SOURCE.md)。

## 自動更新

[Update database Action](.github/workflows/updateDatabase.yaml) 每月 1 日 00:00 UTC
（台灣時間 08:00）執行，也可以從 GitHub Actions 手動觸發。

Action 只在轉換後的郵遞區號 JSON 確實改變時，建立
`chore(data): update zipcode database` commit。若官方調整下載頁、封裝格式、壓縮方法
或 DBF schema，流程會直接失敗，不會靜默提交舊資料或不完整資料。

## 資料庫授權條款

- [中華郵政股份有限公司「3+3 郵遞區號」公開授權聲明](https://www.post.gov.tw/post/download/%E4%B8%AD%E8%8F%AF%E9%83%B5%E6%94%BF%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B83%2B3%E9%83%B5%E9%81%9E%E5%8D%80%E8%99%9F%E5%85%AC%E9%96%8B%E6%8E%88%E6%AC%8A%E8%81%B2%E6%98%8E.pdf)

## 特別感謝 Special Thanks

- [frikinside/vue3-simple-typeahead](https://github.com/frikinside/vue3-simple-typeahead)
- [中華郵政](https://www.post.gov.tw/)

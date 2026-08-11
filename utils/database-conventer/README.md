# 資料庫轉換器

自動下載中華郵政最新的「3+3 郵遞區號應用系統」，不執行安裝程式，直接從內嵌的
Gentee GEA 封裝解出 `rall1.dbf`，再轉換為專案使用的 JSON。

完整來源與封裝說明請見 [DATA_SOURCE.md](./DATA_SOURCE.md)。

## Linux 使用方式

本工具使用 npm。先安裝 Node.js 20 以上、npm、C 編譯器、`make` 與 `unar`，然後執行：

```bash
npm ci
make
node downloadDatabase.js
./gea-extract ./temp/installer.exe ./src/rall1.dbf
node index.js
```

輸出位於 `./result/zipcode.json`。GitHub Actions 會每月執行相同流程，資料有變更時才
更新 `src/assets/zipcode.json`。

### Ubuntu / Debian 相依套件

```bash
sudo apt-get update
sudo apt-get install --no-install-recommends build-essential unar
```

Windows 使用者可在 WSL 執行同一套流程；不需要啟動或自動操作郵局的 Windows 安裝程式。

## 自動更新 Action

`.github/workflows/updateDatabase.yaml` 每月 1 日執行，也支援手動觸發。流程包含 RAR
檔頭、EXE、GEA CRC、DBF header/schema、資料筆數與輸出 JSON 驗證。只在
`src/assets/zipcode.json` 有差異時才提交 Conventional Commit。

## 資料庫授權條款

- [中華郵政股份有限公司「3+3 郵遞區號」公開授權聲明](https://www.post.gov.tw/post/download/%E4%B8%AD%E8%8F%AF%E9%83%B5%E6%94%BF%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B83%2B3%E9%83%B5%E9%81%9E%E5%8D%80%E8%99%9F%E5%85%AC%E9%96%8B%E6%8E%88%E6%AC%8A%E8%81%B2%E6%98%8E.pdf)

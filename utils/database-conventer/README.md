# 資料庫轉換器

將郵局資料庫轉換為 json 格式。

> [資料來源說明（DATA_SOURCE.md）](./DATA_SOURCE.md)

## 取得

中華郵政自 **V2603（115/06/30）** 後提供的官方安裝包已 **不再內含資料庫檔**
（`DBF/rall1.dbf`），資料改由需登入的每日線上更新提供（[https://fpp.post.gov.tw/](https://fpp.post.gov.tw/)）。

因此本專案固定使用 Wayback Machine 上、最後仍內含 DBF 的官方版本
（`Zip33USetup2503.exe`，2025/07/01 資料）：

```bash
# 會在 ./temp 下載 RAR、解出 installer.exe
node downloadDatabase.js
```

然後用 `innoextract`（Linux 版即可）解出資料庫：

```bash
cd temp
innoextract installer.exe   # -> ./app/DBF/rall1.dbf
cp app/DBF/rall1.dbf ../src/rall1.dbf
```

## 轉換

將資料庫檔案放在 `./src` 之下後：

```bash
node index.js   # -> ./result/zipcode.json
```

## 資料庫授權條款

- [中華郵政股份有限公司「3+3 郵遞區號」公開授權聲明](https://www.post.gov.tw/post/download/%E4%B8%AD%E8%8F%AF%E9%83%B5%E6%94%BF%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B83%2B3%E9%83%B5%E9%81%9E%E5%8D%80%E8%99%9F%E5%85%AC%E9%96%8B%E6%8E%88%E6%AC%8A%E8%81%B2%E6%98%8E.pdf)

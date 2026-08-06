# 資料來源說明（Data Source）

本專案的「路名對應郵遞區號」資料庫（原檔名 `DBF/rall1.dbf`）來自中華郵政官方的
「3+3 郵遞區號應用系統」安裝包。這份文件記錄了資料取得方式的現況與來龍去脈。

## 結論（TL;DR）

- 中華郵政自 **V2603（115/06/30，2026-06-30）** 之後提供的安裝包 **已經不再內含資料庫檔**
  `DBF/rall1.dbf`：安裝後只會有說明文件與少量程式表格，沒有主程式、也沒有郵遞區號資料。
- 新版的資料改由系統執行時的「**每日線上更新**」進行，來源是需登入的公司
  **資料傳輸管理系統 [https://fpp.post.gov.tw/](https://fpp.post.gov.tw/)**，一般使用者拿不到。
- 因此本專案的 CI **固定改用 Wayback Machine 上、最後仍內含 `DBF/rall1.dbf` 的官方版本**
  （目前為 **V2503，2025/07/01 資料**）作為資料來源，並使用 Linux 上的
  `innoextract` 直接解出 DBF —— **完全不需要 Windows，也不需要 Wine**。

## 事實 1：V2603 起官方安裝包不再內含 DBF

中華郵政「3+3 郵遞區號應用系統」的安裝包在 2025/07（V2503）仍為 Inno Setup 打包
（可解出 `app/DBF/rall1.dbf`，2025/07/01 資料、79,601 筆）。到了 V2603（2026/06/30）
安裝包改用 **Gentee 自製安裝器**打包，內容只剩：

- `Data\*.htm` 說明文件與圖片
- `BIG5\field0.DBF`、`FILED1.DBF`、`MPASS.DBF` 等程式小表格
- `uninstall.exe` / `uninstall.ini`

從 `uninstall.ini` 的完整安裝清單（1,183 個檔）可確認：**沒有 `Zip33U.EXE` 主程式，
也沒有任何郵遞區號資料檔**。因此無論在 Windows 或 Ubuntu 執行 V2603 的
`-silent` 安裝，都拿不到 `C:\Zip33U\DBF\rall1.dbf`。

參考來源：

- 現行官方下載區（含 V2603 安裝包）：
  <https://www.post.gov.tw/post/internet/Download/index.jsp?ID=220306>
- V2603 安裝包（三段 RAR）：
  <https://www.post.gov.tw/post/download/Zip33Usetup_V2603.part1.rar>
  <https://www.post.gov.tw/post/download/Zip33Usetup_V2603.part2.rar>
  <https://www.post.gov.tw/post/download/Zip33Usetup_V2603.part3.rar>

## 事實 2：新版資料改走「每日線上更新」

V2603 安裝包內的 `Data\OFFICE.files\Update.htm`（程式與資料更新說明）明確記載：

> 「由於本系統資料採 **每日即時更新** 制度，為確保您使用最新的程式與資料，
> 於執行本系統程式前均會**與本公司下載伺服器進行連結**，檢測是否有程式及
> 資料之更新內容，經比對後下載相關異動壓縮檔到您的安裝目錄下……」

文件也寫明，若需要從公司端下載資料，應前往：

> 「本公司**資料傳輸管理系統**（[https://fpp.post.gov.tw/](https://fpp.post.gov.tw/)）」

該系統為需申請帳號的資料傳輸入口，公開環境無法直接使用。

第三方專案 [kentyeh/zip33-data](https://github.com/kentyeh/zip33-data) 也佐證了這點：

> 「因為中華郵政**不再提供郵遞區號的公開資料**（去函問過）……所以只好自行產製。」

## 事實 3：為何不能直接「拆開」現行安裝包

- 現行 V2603 安裝器的 53 MB payload 中，約 51 MB 是可解出的圖片資源
  （不包含任何資料庫）；其餘 2 MB 為自訂加密區塊（entropy ≈ 8.0，
  zlib / LZMA / bzip2 皆無法辨識），非標準壓縮格式。
- UniExtract2 為 Windows-only 工具（在 Ubuntu 仍需 Wine），且其 Gentee 支援是
  針對舊格式，無法對最新版提供純 Linux 靜態解包。
- 即使逆向出加密與線上更新端點，仍需 fpp.post.gov.tw 帳號，且有使用條款疑慮。

## 解法：固定使用「仍內含 DBF」的官方版本（Wayback 快照）

| 版本 | 資料日期 | 說明 | 來源（Wayback Machine） |
| --- | --- | --- | --- |
| **V2503**（使用中） | 2025/07/01 | RAR 7 段，Inno Setup，內含 `app/DBF/rall1.dbf` | [p1](https://web.archive.org/web/20250701184425/https://www.post.gov.tw/post/download/Zip33USetup2503.part1.rar) [p2](https://web.archive.org/web/20250701184434/https://www.post.gov.tw/post/download/Zip33USetup2503.part2.rar) [p3](https://web.archive.org/web/20250701184446/https://www.post.gov.tw/post/download/Zip33USetup2503.part3.rar) [p4](https://web.archive.org/web/20250701184700/https://www.post.gov.tw/post/download/Zip33USetup2503.part4.rar) [p5](https://web.archive.org/web/20250701182920/https://www.post.gov.tw/post/download/Zip33USetup2503.part5.rar) [p6](https://web.archive.org/web/20250701184510/https://www.post.gov.tw/post/download/Zip33USetup2503.part6.rar) [p7](https://web.archive.org/web/20250701184519/https://www.post.gov.tw/post/download/Zip33USetup2503.part7.rar) |
| V2601 | 2026/01/02 | 較新，但 Wayback 缺少 part3，無法組出完整安裝包 | [part1](https://web.archive.org/web/20260109030339/https://www.post.gov.tw/post/download/Zip33Usetup_V2601_260102.part1.rar) |
| V2203 | 2022/07/01 | 單一 exe，最簡單但是最舊 | [Zip33USetup2203.exe](https://web.archive.org/web/20220818023019/https://www.post.gov.tw/post/download/Zip33USetup2203.exe) |

CI 流程（`utils/database-conventer/downloadDatabase.js` + `updateDatabase.yaml`）：

1. 從 Wayback 下載 V2503 的 7 段 RAR
2. `unar` 解出 `Zip33USetup2503.exe`
3. `innoextract`（Linux 版）解出 `app/DBF/rall1.dbf`
4. `node index.js` 轉成 `src/assets/zipcode.json`
5. commit

當中華郵政再次推出「內含 `DBF/rall1.dbf`」的官方版本時，只需更新
`downloadDatabase.js` 頂部的 `INSTALLER_VERSION` 與 `INSTALLER_VOLUMES`
（指向新的官方或 Wayback 網址），即可取得更新資料。

## 資料授權

- [中華郵政股份有限公司「3+3 郵遞區號」公開授權聲明](https://www.post.gov.tw/post/download/%E4%B8%AD%E8%8F%AF%E9%83%B5%E6%94%BF%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B83%2B3%E9%83%B5%E9%81%9E%E5%8D%80%E8%99%9F%E5%85%AC%E9%96%8B%E6%8E%88%E6%AC%8A%E8%81%B2%E6%98%8E.pdf)
- [本公司3+3郵遞區號系統使用規範說明事項.pdf](../docs/本公司3+3郵遞區號系統使用規範說明事項.pdf)

> 註：資料為該版本釋出日期的季度快照（目前為 2025/07），非每日更新。

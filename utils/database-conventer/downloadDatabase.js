const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// 中華郵政自 V2603 之後提供的「3+3 郵遞區號應用系統」安裝包
// 已不再內含資料庫檔 DBF/rall1.dbf（詳見 REPOSITORY.md），
// 資料改由系統執行時的「每日線上更新」取得，需登入
// 資料傳輸管理系統 (https://fpp.post.gov.tw/) 才可下載。
//
// 因此這裡固定下載 Wayback Machine 上「最後仍內含 DBF/rall1.dbf」
// 的官方版本：3+3 郵遞區號 V2503（2025/07/01 資料）。
// 若之後有更新的官方版本仍內含 DBF，直接更新 INSTALLER_VOLUMES 即可。
const INSTALLER_VERSION = "V2503";
const INSTALLER_VOLUMES = [
  "https://web.archive.org/web/20250701184425if_/https://www.post.gov.tw/post/download/Zip33USetup2503.part1.rar",
  "https://web.archive.org/web/20250701184434if_/https://www.post.gov.tw/post/download/Zip33USetup2503.part2.rar",
  "https://web.archive.org/web/20250701184446if_/https://www.post.gov.tw/post/download/Zip33USetup2503.part3.rar",
  "https://web.archive.org/web/20250701184700if_/https://www.post.gov.tw/post/download/Zip33USetup2503.part4.rar",
  "https://web.archive.org/web/20250701182920if_/https://www.post.gov.tw/post/download/Zip33USetup2503.part5.rar",
  "https://web.archive.org/web/20250701184510if_/https://www.post.gov.tw/post/download/Zip33USetup2503.part6.rar",
  "https://web.archive.org/web/20250701184519if_/https://www.post.gov.tw/post/download/Zip33USetup2503.part7.rar",
];

const FILE_SIZE_THRESHOLD = 1024 * 1024; // 1 MiB，擋掉 Wayback 的回傳錯誤頁

async function fetchBytesWithRetry(url, attempts = 6) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      // Wayback 偶爾會回傳錯誤頁但是 200，靠檔案大小判斷
      if (bytes.length < FILE_SIZE_THRESHOLD) {
        throw new Error(`unexpectedly small response (${bytes.length} bytes)`);
      }
      return bytes;
    } catch (error) {
      lastError = error;
      console.warn(`  retry ${attempt}/${attempts}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }

  throw new Error(`Failed to download ${url}: ${lastError.message}`);
}

function findFile(directory, extension) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const match = findFile(entryPath, extension);
      if (match) return match;
    } else if (entry.name.toLowerCase().endsWith(extension)) {
      return entryPath;
    }
  }

  return undefined;
}

(async () => {
  const tempDir = path.resolve("./temp");
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  console.log(`Downloading ${INSTALLER_VERSION} (${INSTALLER_VOLUMES.length} volumes) from web.archive.org ...`);
  for (const [index, url] of INSTALLER_VOLUMES.entries()) {
    console.log(`  [${index + 1}/${INSTALLER_VOLUMES.length}] ${url}`);
    const bytes = await fetchBytesWithRetry(url);
    fs.writeFileSync(path.join(tempDir, `part${index + 1}.rar`), bytes);
  }

  console.log("Extracting volumes with unar ...");
  execFileSync("unar", ["-o", tempDir, path.join(tempDir, "part1.rar")], {
    stdio: "inherit",
  });

  const installerPath = findFile(tempDir, ".exe");
  if (!installerPath) {
    throw new Error("The downloaded archive did not contain an installer");
  }

  const destinationPath = path.join(tempDir, "installer.exe");
  if (installerPath !== destinationPath) {
    fs.renameSync(installerPath, destinationPath);
  }
  console.log("installer.exe saved to ./temp/installer.exe");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

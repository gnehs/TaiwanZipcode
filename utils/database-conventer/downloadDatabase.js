const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DOWNLOAD_PAGE =
  "https://www.post.gov.tw/post/internet/Download/all_list.jsp?ID=2201";
const DOWNLOAD_ROW_SELECTOR = "#dl_link_2735";

async function fetchWithRetry(url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
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
  const response = await fetchWithRetry(DOWNLOAD_PAGE);
  const dom = new JSDOM(await response.text());
  const downloadRow = dom.window.document.querySelector(DOWNLOAD_ROW_SELECTOR);
  if (!downloadRow) {
    throw new Error(`Download section ${DOWNLOAD_ROW_SELECTOR} was not found`);
  }

  const links = [...downloadRow.querySelectorAll("a[href]")]
    .map((link) => new URL(link.getAttribute("href"), DOWNLOAD_PAGE))
    .filter((url) => /\.(?:exe|rar)$/i.test(url.pathname));
  if (links.length === 0) {
    throw new Error("No installer download links were found");
  }

  const tempDir = path.resolve("./temp");
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  for (const url of links) {
    console.log(`Download link: ${url.href}`);
    const downloadResponse = await fetchWithRetry(url);
    const filename = path.basename(decodeURIComponent(url.pathname));
    fs.writeFileSync(
      path.join(tempDir, filename),
      Buffer.from(await downloadResponse.arrayBuffer())
    );
  }

  const rarFiles = fs
    .readdirSync(tempDir)
    .filter((file) => file.toLowerCase().endsWith(".rar"));
  if (rarFiles.length > 0) {
    const firstRarFile =
      rarFiles.find((file) => /\.part0*1\.rar$/i.test(file)) || rarFiles.sort()[0];
    execFileSync("7z", ["x", path.join(tempDir, firstRarFile), `-o${tempDir}`], {
      stdio: "inherit",
    });
  }

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

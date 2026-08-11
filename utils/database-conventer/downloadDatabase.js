const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { JSDOM } = require("jsdom");

const DOWNLOAD_PAGE =
  "https://www.post.gov.tw/post/internet/Download/index.jsp?ID=220306";
const DOWNLOAD_HOST_SUFFIX = ".post.gov.tw";
const MINIMUM_VOLUME_SIZE = 1024 * 1024;
const MINIMUM_INSTALLER_SIZE = 10 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const RAR_MAGIC = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]);

function isOfficialDownload(url) {
  return (
    url.protocol === "https:" &&
    (url.hostname === "post.gov.tw" ||
      url.hostname.endsWith(DOWNLOAD_HOST_SUFFIX)) &&
    url.pathname.startsWith("/post/download/")
  );
}

async function fetchWithRetry(url, transform, attempts = 4) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "TaiwanZipcode database updater" },
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return await transform(response);
    } catch (error) {
      lastError = error;
      console.warn(`  retry ${attempt}/${attempts}: ${error.message}`);
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
      }
    }
  }

  throw new Error(`Failed to download ${url}: ${lastError.message}`);
}

async function discoverInstallerVolumes() {
  const html = await fetchWithRetry(DOWNLOAD_PAGE, (response) => response.text());
  const document = new JSDOM(html, { url: DOWNLOAD_PAGE }).window.document;
  const groups = new Map();

  for (const link of document.querySelectorAll("a[href]")) {
    const url = new URL(link.getAttribute("href"), DOWNLOAD_PAGE);
    if (!isOfficialDownload(url)) continue;

    const filename = decodeURIComponent(path.posix.basename(url.pathname));
    const match = filename.match(
      /^(Zip33Usetup_(V?\d+)(?:_\d+)?\.part)(\d+)(\.rar)$/i,
    );
    if (!match) continue;

    const [, prefix, version, partText, extension] = match;
    const key = `${prefix.toLowerCase()}${extension.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, { version: version.toUpperCase(), volumes: new Map() });
    }
    groups.get(key).volumes.set(Number(partText), url);
  }

  const candidates = [...groups.values()]
    .map((candidate) => ({
      ...candidate,
      volumes: [...candidate.volumes.entries()].sort(([a], [b]) => a - b),
    }))
    .filter(
      ({ volumes }) =>
        volumes.length > 0 &&
        volumes.every(([part], index) => part === index + 1),
    )
    .sort((a, b) => Number(b.version.replace("V", "")) - Number(a.version.replace("V", "")));

  if (candidates.length === 0) {
    throw new Error("No complete 3+3 zipcode installer was found on the official page");
  }

  return candidates[0];
}

async function downloadVolume(url, destination) {
  const bytes = await fetchWithRetry(url, async (response) => {
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length < MINIMUM_VOLUME_SIZE) {
      throw new Error(`${url} is unexpectedly small (${body.length} bytes)`);
    }
    if (!body.subarray(0, RAR_MAGIC.length).equals(RAR_MAGIC)) {
      throw new Error(`${url} is not a RAR archive`);
    }
    return body;
  });
  fs.writeFileSync(destination, bytes);
  return bytes.length;
}

function findFiles(directory, extension) {
  const matches = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...findFiles(entryPath, extension));
    } else if (entry.name.toLowerCase().endsWith(extension)) {
      matches.push(entryPath);
    }
  }
  return matches;
}

async function main() {
  const tempDir = path.resolve(__dirname, "temp");
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  console.log(`Discovering the latest installer from ${DOWNLOAD_PAGE} ...`);
  const installer = await discoverInstallerVolumes();
  console.log(`Downloading ${installer.version} (${installer.volumes.length} volumes) ...`);

  for (const [index, [, url]] of installer.volumes.entries()) {
    const destination = path.join(tempDir, `part${index + 1}.rar`);
    const size = await downloadVolume(url, destination);
    console.log(`  [${index + 1}/${installer.volumes.length}] ${url} (${size} bytes)`);
  }

  console.log("Extracting the multi-volume RAR archive with unar ...");
  execFileSync("unar", ["-quiet", "-force-overwrite", "-o", tempDir, path.join(tempDir, "part1.rar")], {
    stdio: "inherit",
  });

  const installers = findFiles(tempDir, ".exe").filter(
    (filename) => fs.statSync(filename).size >= MINIMUM_INSTALLER_SIZE,
  );
  if (installers.length !== 1) {
    throw new Error(`Expected one installer executable, found ${installers.length}`);
  }

  const installerBytes = fs.readFileSync(installers[0]);
  if (installerBytes[0] !== 0x4d || installerBytes[1] !== 0x5a) {
    throw new Error("The extracted installer is not a Windows executable");
  }

  const destination = path.join(tempDir, "installer.exe");
  if (installers[0] !== destination) {
    fs.renameSync(installers[0], destination);
  }
  console.log(`${installer.version} installer saved to ${destination}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

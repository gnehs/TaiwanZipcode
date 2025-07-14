const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
(async () => {
  let url =
    "https://www.post.gov.tw/post/internet/Download/all_list.jsp?ID=2201";
  let response = await fetch(url);
  let text = await response.text();
  let dom = new JSDOM(text);
  let links = dom.window.document.querySelectorAll(
    `#dl_link_2735 [href$=".rar"]`
  );
  // download all links
  const tempDir = path.resolve("./temp");
  fs.mkdirSync(tempDir, { recursive: true });
  for (let link of [...links]) {
    console.log(`download link: ${link.href}`);
    let response = await fetch(link.href);
    let file = await response.arrayBuffer();
    let filename = link.href.split("/").pop();
    let filePath = path.join(tempDir, decodeURIComponent(filename));
    fs.writeFileSync(filePath, Buffer.from(file));
  }

  const rarFiles = fs.readdirSync(tempDir).filter(file => file.endsWith('.rar'));
  const firstRarFile = rarFiles.find(file => file.includes('part1')) || rarFiles[0];
  execSync(`7z x "${path.join(tempDir, firstRarFile)}" -o"${tempDir}/"`, {stdio: 'inherit'});

  // find and rename .exe file
  const files = fs.readdirSync(tempDir);
  const exeFile = files.find((file) => file.endsWith(".exe"));
  fs.renameSync(
    path.join(tempDir, exeFile),
    path.join(tempDir, "installer.exe")
  );
  console.log("installer.exe saved to ./temp/installer.exe");
})();
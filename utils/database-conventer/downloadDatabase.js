const { JSDOM } = require("jsdom");
const fs = require("fs");
const extract = require("extract-zip");
const path = require("path");
const { execSync } = require("child_process");
(async () => {
  let url =
    "https://www.post.gov.tw/post/internet/Download/all_list.jsp?ID=2201";
  let response = await fetch(url);
  let text = await response.text();
  let dom = new JSDOM(text);
  let links = dom.window.document.querySelectorAll(
    `#dl_link_2735 a[title^="3+3郵遞區號應用系統"][href$=".zip"]`
  );
  // download all links
  const tempDir = path.resolve("./temp");
  fs.mkdirSync(tempDir, { recursive: true });
  let zipPath;
  for (let link of [...links]) {
    console.log(`download link: ${link}`);
    let url = link.href;
    let response = await fetch(url);
    let file = await response.arrayBuffer();
    let filename = url.split("/").pop();
    zipPath = path.join("./temp", decodeURIComponent(filename));
    fs.writeFileSync(zipPath, Buffer.from(file));

    await extract(zipPath, {
      dir: tempDir,
    });
    // delete original zip file
    fs.unlinkSync(zipPath);
  }
  // cat test.zip* > ~/test.zip
  execSync(`cat ${tempDir}/* > ${path.join(tempDir, "installer.zip")}`);
  execSync(`unzip ${path.join(tempDir, `installer.zip`)} -d ${tempDir}`);

  // find rename .exe file
  const files = fs.readdirSync(tempDir);
  const exeFile = files.find((file) => file.endsWith(".exe"));
  fs.renameSync(
    path.join(tempDir, exeFile),
    path.join(tempDir, "installer.exe")
  );
  console.log("installer.exe saved to ./temp/installer.exe");
})();

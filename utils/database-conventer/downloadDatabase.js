
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');
const { exec } = require('child_process');
async function main() {
  let url = 'https://www.post.gov.tw/post/internet/Download/all_list.jsp?ID=2201#dl_link_2735';
  let response = await fetch(url);
  let text = await response.text();
  let dom = new JSDOM(text);
  let link = dom.window.document.querySelector('#dl_link_2735 a').href;
  console.log(`download link: ${link}`);

  fs.mkdirSync('./temp', { recursive: true });
  let file = await fetch(link).then(x => x.arrayBuffer())
  fs.writeFileSync('./temp/installer.exe', Buffer.from(file));
  console.log('installer.exe saved to ./temp/installer.exe');
}
main();
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { writePageHead } from '../src/utils/pageHead.js';

const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const page = {
  title: '臺北市信義區信義路五段7號 郵遞區號 110615',
  description: '臺北市信義區信義路五段7號的 3+3 郵遞區號是 110615。',
  url: 'https://zipcode.gnehs.net/%E8%87%BA%E5%8C%97%E5%B8%82',
  indexable: true,
};

const contentOf = (html, tag) => html.match(new RegExp(`<meta ${tag} content="([^"]*)"`))?.[1];

test('writePageHead replaces every title, description and url in index.html', () => {
  const html = writePageHead(indexHtml, page);
  assert.match(html, /<title>臺北市信義區信義路五段7號 郵遞區號 110615<\/title>/u);
  for (const tag of ['name="title"', 'property="og:title"', 'property="twitter:title"']) {
    assert.equal(contentOf(html, tag), page.title);
  }
  for (const tag of ['name="description"', 'property="og:description"', 'property="twitter:description"']) {
    assert.equal(contentOf(html, tag), page.description);
  }
  for (const tag of ['property="og:url"', 'property="twitter:url"']) {
    assert.equal(contentOf(html, tag), page.url);
  }
  assert.match(html, /<link rel="canonical" href="https:\/\/zipcode\.gnehs\.net\/%E8%87%BA%E5%8C%97%E5%B8%82" \/>/);
  assert.equal(contentOf(html, 'property="og:site_name"'), contentOf(indexHtml, 'property="og:site_name"'));
});

test('writePageHead marks a missing page noindex without a canonical', () => {
  const html = writePageHead(indexHtml, { ...page, indexable: false });
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.match(html, /<meta name="robots" content="noindex" \/>/);
});

test('writePageHead escapes text and keeps replacement patterns literal', () => {
  const html = writePageHead(indexHtml, { ...page, title: '"<b>$1 & $&' });
  assert.match(html, /<title>&quot;&lt;b&gt;\$1 &amp; \$&amp;<\/title>/);
  assert.equal(contentOf(html, 'property="og:title"'), '&quot;&lt;b&gt;$1 &amp; $&amp;');
});

test('writePageHead points og:image at the page image and keeps the site image without one', () => {
  const image = 'https://zipcode.gnehs.net/og/%E8%87%BA%E5%8C%97%E5%B8%82';
  const html = writePageHead(indexHtml, { ...page, image });
  for (const tag of ['property="og:image"', 'property="twitter:image"']) {
    assert.equal(contentOf(html, tag), image);
    assert.equal(contentOf(writePageHead(indexHtml, page), tag), contentOf(indexHtml, tag));
  }
});

test('writePageHead replaces the structured data and keeps the site data without it', () => {
  const ldOf = (html) => html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const data = { '@context': 'https://schema.org', '@type': 'WebPage', name: '</script><b>' };
  const html = writePageHead(indexHtml, { ...page, structuredData: data });
  assert.equal(html.match(/application\/ld\+json/g).length, 1);
  assert.doesNotMatch(ldOf(html), /<\/script>/);
  assert.deepEqual(JSON.parse(ldOf(html)), data);
  assert.equal(ldOf(writePageHead(indexHtml, page)), ldOf(indexHtml));
});

test('writePageHead fills the app root and replaces content written before', () => {
  const appOf = (html) => html.match(/<div id="app">([\s\S]*?)<\/div>\s*<script/)[1];
  const home = writePageHead(indexHtml, { ...page, content: '<p>home</p>' });
  assert.equal(appOf(home), '<!--content--><p>home</p><!--/content-->');
  const address = writePageHead(home, { ...page, content: '<p>address</p>' });
  assert.equal(appOf(address), '<!--content--><p>address</p><!--/content-->');
  assert.equal(appOf(writePageHead(home, page)), appOf(home));
});

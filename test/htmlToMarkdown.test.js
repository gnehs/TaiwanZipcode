import assert from 'node:assert/strict';
import test from 'node:test';

import { htmlToMarkdown } from '../src/utils/htmlToMarkdown.js';

const convert = (html) =>
  htmlToMarkdown(html, { link: (href) => `https://example.test${href}`, separator: '：' });

test('headings, paragraphs and links become Markdown', () => {
  assert.equal(
    convert('<main><h2>常見問題</h2><p>到<a href="/batch">批次查詢</a>貼上地址。</p></main>'),
    '## 常見問題\n\n到[批次查詢](https://example.test/batch)貼上地址。',
  );
});

test('list items stay one tight list, even when wrappers split them', () => {
  assert.equal(
    convert('<dl><div class="contents"><dt>臺北市</dt><dd>2026 年</dd></div><div><dt>新北市</dt><dd>2025 年</dd></div></dl>'),
    '- 臺北市：2026 年\n- 新北市：2025 年',
  );
  assert.equal(convert('<ul><li>甲</li><li>乙</li></ul>'), '- 甲\n- 乙');
});

test('a list inside a description joins its items on one line', () => {
  assert.equal(
    convert('<dl><dt>北部</dt><dd><ul><li><a href="/a/1">臺北市</a></li><li>新北市</li></ul></dd></dl>'),
    '- 北部：[臺北市](https://example.test/a/1) · 新北市',
  );
});

test('a heading inside a list item is set in bold', () => {
  assert.equal(convert('<ul><li><h2>隱私保護</h2><p>不用註冊</p></li></ul>'), '- **隱私保護** 不用註冊');
});

test('flex and grid children are set apart', () => {
  assert.equal(
    convert('<ul><li class="flex gap-3"><a href="/a/112">北投區</a><span>112</span></li></ul>'),
    '- [北投區](https://example.test/a/112) 112',
  );
});

test('controls, drawings and hidden parts are left out', () => {
  assert.equal(
    convert('<p>查詢<button>清除</button><svg><path d="M0"></path></svg><span aria-hidden="true">›</span><input value="x"/></p>'),
    '查詢',
  );
});

test('entities are decoded and Markdown syntax in text is escaped', () => {
  assert.equal(convert('<p>&quot;3+3&#x27; &amp; [a]*b*</p>'), '"3+3\' & \\[a\\]\\*b\\*');
});

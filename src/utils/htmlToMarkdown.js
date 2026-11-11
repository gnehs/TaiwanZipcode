/**
 * The text of a page the build rendered, as Markdown: headings, paragraphs,
 * lists, term and description pairs, and links. React writes well-formed
 * HTML, so a tag-by-tag walk is enough and no HTML parser ships.
 */

const VOID = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// Controls and drawings carry no text a reader needs.
const SKIP = new Set(['button', 'canvas', 'input', 'noscript', 'script', 'select', 'style', 'svg', 'template', 'textarea']);
const BLOCK = new Set(['article', 'dl', 'div', 'footer', 'header', 'main', 'nav', 'ol', 'p', 'section', 'ul']);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? entity;
    return String.fromCodePoint(code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
  });
}

function parse(html) {
  const root = { tag: '', attrs: '', children: [] };
  const stack = [root];
  const tokens = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  for (const [, close, tag, attrs, selfClosing, text] of html.matchAll(tokens)) {
    const parent = stack.at(-1);
    if (text !== undefined) {
      parent.children.push(decode(text));
      continue;
    }
    if (!tag) continue;
    const name = tag.toLowerCase();
    if (close) {
      const open = stack.findLastIndex((node) => node.tag === name);
      if (open > 0) stack.length = open;
      continue;
    }
    const node = { tag: name, attrs, children: [] };
    parent.children.push(node);
    if (!selfClosing && !VOID.has(name)) stack.push(node);
  }
  return root;
}

const attribute = (node, name) => node.attrs.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

const escapeMarkdown = (text) => text.replace(/[\\[\]|*_`<>]/g, '\\$&');

// A list inside one line, as a term's description, joins its items with dots.
const oneLine = (text) =>
  text
    .replace(/\s*\n+\s*-\s+/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^· /, '');

/**
 * @param {string} html
 * @param {{ link: (href: string) => string, separator: string }} options
 * `link` turns an href into the URL the Markdown names; `separator` sits
 * between a term and its description.
 */
export function htmlToMarkdown(html, { link, separator }) {
  // Inside a list item a heading is only its words, set in bold.
  function render(node, inItem = false) {
    if (typeof node === 'string') return escapeMarkdown(node.replace(/\s+/g, ' '));
    if (SKIP.has(node.tag) || attribute(node, 'aria-hidden') === 'true' || /\shidden(\s|=|$)/.test(node.attrs)) {
      return '';
    }
    const inItemNow = inItem || ['li', 'dt', 'dd'].includes(node.tag);
    // Flex and grid set their children apart with gaps rather than spaces.
    const gap = /(^|\s)(inline-)?(flex|grid)(\s|$)/.test(attribute(node, 'class') ?? '') ? ' ' : '';
    const inner = () => node.children.map((child) => render(child, inItemNow)).join(gap);
    const heading = node.tag.match(/^h([1-6])$/);
    if (heading && inItem) return ` **${oneLine(inner())}** `;
    if (heading) return `\n\n${'#'.repeat(Math.max(2, Number(heading[1])))} ${oneLine(inner())}\n\n`;
    switch (node.tag) {
      case 'br':
        return '\n';
      case 'li':
        return `\n- ${oneLine(inner())}`;
      case 'dt':
        return `\n- ${oneLine(inner())}`;
      case 'dd':
        return `${separator}${oneLine(inner())}`;
      case 'a': {
        const text = oneLine(inner());
        const href = attribute(node, 'href');
        return text && href ? `[${text}](${link(decode(href))})` : text;
      }
      default:
        return BLOCK.has(node.tag) ? `\n\n${inner()}\n\n` : inner();
    }
  }

  return render(parse(html))
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    // Items split by a wrapper still make one list.
    .replace(/^(- .*)\n\n(?=- )/gm, '$1\n')
    .trim();
}

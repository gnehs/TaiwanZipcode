/*
 * English rendering of Chunghwa Post scope rules (`單 1號至 99號`, `3巷全`, ...).
 *
 * Wording follows the site's English addresses: `No. 10`, `25 Ln`, `3 Aly`,
 * `B1F`, and a path read from the smallest unit up (`3 Aly, 219 Ln`).
 */

const UNIT_NAMES = { 巷: 'Ln', 弄: 'Aly' };
const PARITY_WORDS = { 單: 'Odd', 雙: 'Even', 連: 'All' };

// `及以上附號` and `含附號` must precede `以上`/`附號`; `之15號` is a range end
// that inherits its base number from the start (`41之1號至之15號`).
const TOKEN = /(及以上附號)|(含附號)|(以上)|(以下)|(至)|(全)|([單雙連])|(\d+)(?:之(\d+))?(巷|弄|號|附號)|之(\d+)號/gu;
const FLOOR = /(地下)?(\d+)樓(?:之(\d+))?/gu;

function parsePath(text) {
  const atoms = [];
  let operator = null;
  let all = false;
  let parity = null;
  let parityAfterLastAtom = false;
  let includeAttached = false;
  let attachedFrom = false;
  let rest = text;

  for (const m of text.matchAll(TOKEN)) {
    rest = rest.replace(m[0], '');
    if (m[1]) attachedFrom = true;
    else if (m[2]) includeAttached = true;
    else if (m[3] || m[4] || m[5]) {
      const op = m[3] ? 'above' : m[4] ? 'below' : 'to';
      if (!operator || op === 'to') operator = { op, at: atoms.length };
    } else if (m[6]) all = true;
    else if (m[7]) {
      parity ??= m[7];
      parityAfterLastAtom = true;
    } else {
      const attachedOnly = m[10] === '附號';
      const unit = attachedOnly || !m[10] ? '號' : m[10];
      const value = m[8] === undefined ? (atoms.at(-1)?.value ?? null) : Number(m[8]);
      const branch = m[9] !== undefined ? Number(m[9]) : m[11] !== undefined ? Number(m[11]) : null;
      atoms.push({ unit, value, branch, attachedOnly });
      parityAfterLastAtom = false;
    }
  }
  return { atoms, operator, all, parity, parityAfterLastAtom, includeAttached, attachedFrom, rest: rest.trim() };
}

const numberOf = (atom) => `${atom.value}${atom.branch === null ? '' : `-${atom.branch}`}`;
const single = (atom) => (atom.unit === '號' ? `No. ${numberOf(atom)}` : `${numberOf(atom)} ${UNIT_NAMES[atom.unit]}`);

function describeRange(start, end) {
  const branched = start.branch !== null || end.branch !== null;
  if (start.unit !== end.unit) return `${single(start)} to ${single(end)}`;
  const sep = branched ? ' to ' : '–';
  if (start.unit === '號') return `Nos. ${numberOf(start)}${sep}${numberOf(end)}`;
  return `${numberOf(start)}${sep}${numberOf(end)} ${UNIT_NAMES[start.unit]}`;
}

function describeBound(atom, op) {
  const word = op === 'above' ? 'and above' : 'and below';
  return `${atom.unit === '號' ? `Nos. ${numberOf(atom)}` : single(atom)} ${word}`;
}

function describeFloors(text) {
  const floors = [...text.matchAll(FLOOR)].map((m) => ({
    number: m[2],
    label: `${m[1] ? 'B' : ''}${m[2]}F${m[3] ? `-${m[3]}` : ''}`,
  }));
  if (!floors.length) return '';
  const tail = text.replace(FLOOR, ' ');
  const [first, second] = floors;
  if (second && (tail.includes('至') || !/以[上下]/u.test(tail))) {
    // `地下 1樓至 1樓` repeats the same basement floor; the second half drops 地下.
    return first.number === second.number ? first.label : `${first.label}–${second.label}`;
  }
  if (tail.includes('以上')) return `${first.label} and above`;
  if (tail.includes('以下')) return `${first.label} and below`;
  return first.label;
}

export function scopeRuleToEnglish(rule) {
  const text = String(rule ?? '').normalize('NFKC').replace(/\s+/gu, '');
  if (!text) return '';

  const floorAt = text.search(/(?:地下)?\d+樓/u);
  const pathText = floorAt < 0 ? text : text.slice(0, floorAt);
  const floorText = floorAt < 0 ? '' : text.slice(floorAt);

  const p = parsePath(pathText);
  if (p.rest) return text;

  const parityWord = p.parity ? PARITY_WORDS[p.parity] : '';
  const withParity = (body) => (parityWord ? `${parityWord} ${body}` : body);
  const inPath = (atoms) => (atoms.length ? ` in ${[...atoms].reverse().map(single).join(', ')}` : '');
  const attachedNote = p.includeAttached ? ', incl. attached' : '';
  let body;

  if (p.operator) {
    const prefix = p.atoms.slice(0, p.operator.at - 1);
    const start = p.atoms[p.operator.at - 1];
    if (p.operator.op === 'to') {
      const end = { ...p.atoms[p.operator.at] };
      end.value ??= start.value;
      body = withParity(describeRange(start, end));
    } else {
      body = withParity(describeBound(start, p.operator.op));
    }
    body += attachedNote + inPath(prefix);
  } else if (p.all && (!p.atoms.length || (p.parity && p.parityAfterLastAtom))) {
    const kind = p.parity === '單' ? 'odd ' : p.parity === '雙' ? 'even ' : '';
    body = `All ${kind}numbers${inPath(p.atoms)}`;
  } else if (p.all) {
    body = `All of ${[...p.atoms].reverse().map(single).join(', ')}`;
  } else {
    const target = p.atoms.at(-1);
    const path = [...p.atoms].reverse();
    if (p.attachedFrom) {
      body = `Attached Nos. ${numberOf(target)} and above${inPath(p.atoms.slice(0, -1))}`;
    } else if (target.attachedOnly) {
      body = `Attached Nos. of ${numberOf(target)}${inPath(p.atoms.slice(0, -1))}`;
    } else {
      body = withParity(path.map(single).join(', ')) + attachedNote;
    }
  }

  const floor = describeFloors(floorText);
  return floor ? `${body}, ${floor}` : body;
}

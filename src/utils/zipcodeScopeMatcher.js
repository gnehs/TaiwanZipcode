/*
 * Address suffix and postal scope matching helpers.
 *
 * The source data uses the notation published by Chunghwa Post.  A scope
 * describes a path of 巷/弄/號 components and may add a parity, range, floor,
 * or attached-number qualifier.  This module deliberately has no UI framework
 * (or browser) dependency so it can be used by the view and data validation
 * scripts alike.
 */

const PARITIES = new Set(['單', '雙', '連']);
const UNITS = ['附號', '巷', '弄', '號'];
const DASHES = /[‐‑‒–—−－]/g;
const SPACE = /\s+/g;

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFKC')
    .replace(DASHES, '-')
    .replace(/台/g, '臺')
    .trim();
}

function compactText(value) {
  return normalizeText(value).replace(SPACE, '');
}

function readDigits(text, start) {
  let end = start;
  while (end < text.length && /[0-9]/.test(text[end])) end += 1;
  return end === start ? null : { value: Number(text.slice(start, end)), end };
}

function readUnit(text, start) {
  for (const unit of UNITS) {
    if (text.startsWith(unit, start)) return { unit, end: start + unit.length };
  }
  return null;
}

function skipSpaces(text, start) {
  let end = start;
  while (end < text.length && /\s/.test(text[end])) end += 1;
  return end;
}

/**
 * Tokenise only the address path (巷/弄/號).  `value === null` means an
 * endpoint such as `至之15號`, where the base number is inherited later.
 */
function tokenizePath(text) {
  const tokens = [];
  let index = 0;

  while (index < text.length) {
    index = skipSpaces(text, index);
    if (index >= text.length) break;

    const start = index;
    const digit = readDigits(text, index);
    let value = null;
    let branch = null;
    let branchExplicit = false;

    if (digit) {
      value = digit.value;
      index = digit.end;
      index = skipSpaces(text, index);
      if (text[index] === '之' || text[index] === '-') {
        const branchStart = index;
        index = skipSpaces(text, index + 1);
        const branchDigits = readDigits(text, index);
        if (branchDigits) {
          branch = branchDigits.value;
          branchExplicit = true;
          index = branchDigits.end;
        } else {
          // Keep a malformed/dangling branch visible to the caller.  It is
          // useful for deciding that the user's input is still incomplete.
          index = branchStart;
        }
      }
    } else if (text[index] === '之' || text[index] === '-') {
      // Range endpoints commonly omit the repeated base: `41之1號至之15號`.
      const branchStart = index;
      index = skipSpaces(text, index + 1);
      const branchDigits = readDigits(text, index);
      if (branchDigits) {
        branch = branchDigits.value;
        branchExplicit = true;
        index = branchDigits.end;
      } else {
        index = branchStart;
      }
    }

    index = skipSpaces(text, index);
    const unitToken = readUnit(text, index);
    if (!unitToken) {
      // Ignore punctuation and words which are not part of a path token.
      // Numeric text without a unit is retained as an unknown token so the
      // address parser can report it as incomplete instead of guessing.
      if (digit) tokens.push({ kind: 'number', value, start });
      index = Math.max(index + 1, start + 1);
      continue;
    }

    // A standalone `附號` suffix modifies the preceding address atom; it is
    // not a second, numberless path component.
    if (!digit && unitToken.unit === '附號') {
      const previous = tokens[tokens.length - 1];
      if (previous?.kind === 'atom') previous.attached = true;
      index = unitToken.end;
      continue;
    }

    index = unitToken.end;
    let unit = unitToken.unit;
    let attached = unit === '附號';
    if (attached) unit = '號';

    // Also accept the other spelling used by callers: `30號之2`.
    let afterUnit = skipSpaces(text, index);
    if ((text[afterUnit] === '之' || text[afterUnit] === '-') && branch === null) {
      const branchDigits = readDigits(text, skipSpaces(text, afterUnit + 1));
      if (branchDigits) {
        branch = branchDigits.value;
        branchExplicit = true;
        index = branchDigits.end;
      }
    }

    tokens.push({
      kind: 'atom',
      unit,
      value,
      branch,
      branchExplicit,
      // A `之` suffix is the data set's other spelling for an attached
      // address.  Keeping this bit on the path component lets `151號之1`
      // match the corresponding `151附號` scope.
      attached: attached || branchExplicit,
      raw: text.slice(start, index),
      start,
      end: index,
    });
  }

  return tokens;
}

function parseFloorText(text) {
  const floors = [];
  const pattern = /(地下)?\s*(\d+)\s*樓(?:\s*(?:之|-)\s*(\d+))?/g;
  let match;
  while ((match = pattern.exec(text))) {
    const number = Number(match[2]);
    floors.push({
      number,
      value: match[1] ? -number : number,
      basement: Boolean(match[1]),
      branch: match[3] === undefined ? null : Number(match[3]),
      raw: match[0],
      index: match.index,
    });
  }

  if (!floors.length) return null;

  const opText = text.replace(pattern, ' ');
  const hasTo = /至/.test(opText);
  const hasBelow = /以下/.test(opText);
  const hasAbove = /以上/.test(opText);
  let min = floors[0].value;
  let max = floors[0].value;
  let mode = 'exact';

  if (floors.length >= 2 && hasTo) {
    min = Math.min(floors[0].value, floors[1].value);
    max = Math.max(floors[0].value, floors[1].value);
    mode = 'range';
  } else if (hasBelow) {
    max = floors[0].value;
    min = Number.NEGATIVE_INFINITY;
    mode = 'atMost';
  } else if (hasAbove) {
    min = floors[0].value;
    max = Number.POSITIVE_INFINITY;
    mode = 'atLeast';
  } else if (floors.length >= 2) {
    min = Math.min(floors[0].value, floors[1].value);
    max = Math.max(floors[0].value, floors[1].value);
    mode = 'range';
  }

  return {
    floors,
    min,
    max,
    mode,
    basement: floors[0].basement,
    number: floors[0].number,
    branch: floors[0].branch,
  };
}

function parseAddressSuffix(addressText) {
  const original = addressText === null || addressText === undefined ? '' : String(addressText);
  const normalized = normalizeText(original);
  const compact = compactText(original);
  const firstFloor = normalized.search(/(?:地下)?\s*\d+\s*樓/);
  const firstRoom = normalized.search(/[\dA-Za-z]+室/);
  const pathEnd = [firstFloor, firstRoom]
    .filter((index) => index >= 0)
    .reduce((lowest, index) => Math.min(lowest, index), normalized.length);
  const pathText = normalized.slice(0, pathEnd);
  const floorText = firstFloor < 0 ? '' : normalized.slice(firstFloor);
  const tokens = tokenizePath(pathText);
  const rawPath = tokens.filter((token) => token.kind === 'atom');
  const unknownNumbers = tokens.filter((token) => token.kind === 'number');
  const floors = parseFloorText(floorText);
  const attached = /附號/.test(normalized) || rawPath.some((part) => (
    part.unit === '號' && (part.attached || part.branch !== null)
  ));
  const path = rawPath.map((part, index) => (
    attached && index === rawPath.length - 1 ? { ...part, attached: true } : part
  ));
  const danglingBranch = /(?:號|巷|弄)?\s*(?:之|-)$/.test(normalized);
  const hasHouse = path.some((part) => part.unit === '號');
  const lastHouse = [...path].reverse().find((part) => part.unit === '號') || null;
  const last = path[path.length - 1] || null;
  const roomMatch = normalized.match(/(?:^|\s)([^\s\d]+|\d+)室/);
  const room = roomMatch ? roomMatch[1] : null;
  // 巷/弄-only input is a complete address level for scope matching.  The
  // resolver may still report it as pending when a more specific house/floor
  // scope needs another component.
  const complete = Boolean(path.length && !unknownNumbers.length && !danglingBranch);

  return {
    input: original,
    normalized,
    compact,
    supported: true,
    complete,
    path,
    parts: path,
    tokens,
    unknownNumbers,
    danglingBranch,
    attached,
    floors,
    floor: floors ? floors.number : null,
    floorDash: floors ? floors.branch : null,
    basement: floors ? floors.basement : false,
    room,
    // Names used by the existing App address formatter.
    ln: path.find((part) => part.unit === '巷')?.value ?? null,
    aly: path.find((part) => part.unit === '弄')?.value ?? null,
    no: lastHouse?.value ?? null,
    noDash: lastHouse?.branch ?? null,
  };
}

function cleanScopeText(scopeText) {
  return normalizeText(scopeText).replace(/\u3000/g, ' ');
}

function removeAttachedQualifiers(text) {
  let includeAttached = false;
  let attachedFrom = null;
  let pathText = text;

  if (/及以上附號/.test(pathText)) {
    includeAttached = true;
    const before = pathText.slice(0, pathText.indexOf('及以上附號'));
    const candidates = tokenizePath(before).filter((token) => token.kind === 'atom');
    const last = candidates[candidates.length - 1];
    if (last && last.unit === '號') attachedFrom = last;
    // Preserve the lower-bound operator while removing the prose qualifier:
    // `2之4號及以上附號` becomes the ordinary range `2之4號以上`, with
    // includeAttached=true carried separately.
    pathText = pathText.replace(/及以上附號/g, '以上');
  }
  if (/含附號/.test(pathText)) {
    includeAttached = true;
    pathText = pathText.replace(/含附號/g, '');
  }
  return { pathText, includeAttached, attachedFrom };
}

function tokenizeScopeText(text) {
  const tokens = [];
  const pathTokens = tokenizePath(text);
  let pathIndex = 0;
  let cursor = 0;

  // `tokenizePath` intentionally skips keywords.  Re-scan the text and use
  // atom start positions to put operators/parities back in their order.
  const atoms = pathTokens.filter((token) => token.kind === 'atom' || token.kind === 'number');
  for (const atom of atoms) {
    const before = text.slice(cursor, atom.start);
    appendKeywords(tokens, before);
    tokens.push(atom.kind === 'number' ? atom : { ...atom, kind: 'atom', index: pathIndex++ });
    cursor = atom.end ?? atom.start + String(atom.value).length;
  }
  appendKeywords(tokens, text.slice(cursor));
  return tokens;
}

function appendKeywords(tokens, text) {
  let index = 0;
  while (index < text.length) {
    if (text.startsWith('以下', index)) {
      tokens.push({ kind: 'operator', value: '以下' });
      index += 2;
    } else if (text.startsWith('以上', index)) {
      tokens.push({ kind: 'operator', value: '以上' });
      index += 2;
    } else if (text.startsWith('至', index)) {
      tokens.push({ kind: 'operator', value: '至' });
      index += 1;
    } else if (text[index] === '全') {
      tokens.push({ kind: 'all' });
      index += 1;
    } else if (PARITIES.has(text[index])) {
      tokens.push({ kind: 'parity', value: text[index] });
      index += 1;
    } else {
      index += 1;
    }
  }
}

function resolveImpliedBranches(atoms) {
  let lastBase = null;
  return atoms.map((atom) => {
    if (atom.value !== null && atom.value !== undefined) {
      lastBase = atom.value;
      return { ...atom };
    }
    return { ...atom, value: lastBase };
  });
}

function nearestParity(tokens, atomPosition, fallback = null) {
  for (let index = atomPosition - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind === 'atom') break;
    if (token.kind === 'parity') return token.value;
    if (token.kind === 'operator' || token.kind === 'all') continue;
  }
  return fallback;
}

function parseScope(scopeText) {
  const original = scopeText === null || scopeText === undefined ? '' : String(scopeText);
  const normalized = cleanScopeText(original);
  const compact = compactText(original);
  const unrecognized = compact.replace(
    /\d+|及以上附號|含附號|附號|地下|以下|以上|全|單|雙|連|號|巷|弄|之|樓|至/g,
    '',
  );
  const floorIndex = normalized.search(/(?:地下)?\s*\d+\s*樓/);
  const pathAndQualifier = floorIndex < 0 ? normalized : normalized.slice(0, floorIndex);
  const floorText = floorIndex < 0 ? '' : normalized.slice(floorIndex);
  const floor = parseFloorText(floorText);
  const { pathText, includeAttached, attachedFrom } = removeAttachedQualifiers(pathAndQualifier);
  const hasAttachedAtom = /附號/.test(pathText);
  const tokens = tokenizeScopeText(pathText);
  const atomTokens = resolveImpliedBranches(tokens.filter((token) => token.kind === 'atom'));
  const operators = tokens.filter((token) => token.kind === 'operator');
  const all = tokens.some((token) => token.kind === 'all');
  const parityTokens = tokens.filter((token) => token.kind === 'parity');
  const parityFallback = parityTokens[0]?.value || null;
  const lastAtomPosition = (() => {
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      if (tokens[index].kind === 'atom') return index;
    }
    return -1;
  })();
  const parityAfterLastAtom = parityTokens.some((token) => {
    const tokenPosition = tokens.indexOf(token);
    return tokenPosition > lastAtomPosition;
  });
  const rangeOperator = operators.find((token) => token.value === '至') || operators.find((token) => token.value === '以下' || token.value === '以上') || null;
  const targetIndexBeforeOperator = rangeOperator
    ? (() => {
        const opIndex = tokens.indexOf(rangeOperator);
        let atomIndex = -1;
        for (let index = 0; index < opIndex; index += 1) {
          if (tokens[index].kind === 'atom') atomIndex += 1;
        }
        return atomIndex;
      })()
    : -1;
  // `巷/弄單全` means all odd/even house numbers *inside* that path.  The
  // parity marker follows the last explicit path component, so the target is
  // an implicit next-level 號 rather than the 巷/弄 itself.
  const trailingParity = parityTokens[parityTokens.length - 1]?.value || null;
  const implicitAllTarget = all && Boolean(trailingParity) && parityAfterLastAtom;
  const targetIndex = rangeOperator
    ? targetIndexBeforeOperator
    : implicitAllTarget
      ? -1
      : (atomTokens.length ? atomTokens.length - 1 : -1);
  const prefix = targetIndex < 0 ? atomTokens : atomTokens.slice(0, targetIndex);
  const target = targetIndex < 0 ? null : atomTokens[targetIndex];
  let end = target;
  if (rangeOperator?.value === '至') {
    const opIndex = tokens.indexOf(rangeOperator);
    let nextAtom = null;
    for (let index = opIndex + 1; index < tokens.length; index += 1) {
      if (tokens[index].kind === 'atom') {
        nextAtom = tokens[index];
        break;
      }
    }
    if (nextAtom) end = nextAtom;
  }
  if (target && target.value === null && end?.value !== null) target.value = end.value;
  if (end && end.value === null && target?.value !== null) end.value = target.value;

  // `單/雙/連` immediately before the target belongs to that target.  When
  // `全` follows a path (e.g. `54巷5弄單全`) it constrains the implicit house
  // number below that path.
  let targetTokenPosition = tokens.length;
  if (targetIndex >= 0) {
    let seenAtoms = -1;
    targetTokenPosition = tokens.findIndex((token) => {
      if (token.kind !== 'atom') return false;
      seenAtoms += 1;
      return seenAtoms === targetIndex;
    });
    if (targetTokenPosition < 0) targetTokenPosition = tokens.length;
  }
  const parity = nearestParity(tokens, targetTokenPosition < 0 ? tokens.length : targetTokenPosition, parityFallback);
  const implicitTarget = all && parity && (!target || implicitAllTarget);
  const mode = rangeOperator
    ? (rangeOperator.value === '至' ? 'range' : rangeOperator.value === '以下' ? 'atMost' : 'atLeast')
    : all
      ? 'all'
      : target
        ? 'exact'
        : 'all';

  const min = mode === 'range' || mode === 'atLeast' ? target : null;
  const max = mode === 'range' || mode === 'atMost' ? end : null;
  const unitFlexible = Boolean(target && end && target.unit !== end.unit);
  const hasPath = atomTokens.length > 0;
  const supported = Boolean(
    normalized && !unrecognized &&
      (all || hasPath || parity || floor || /(?:以下|以上|至)/.test(normalized)),
  );
  const exact = mode === 'exact' && Boolean(target);
  const attachedRequired = hasAttachedAtom;

  const parsed = {
    input: original,
    normalized,
    compact,
    unrecognized,
    supported,
    tokens,
    atoms: atomTokens,
    path: prefix,
    prefix,
    target,
    end,
    min,
    max,
    mode,
    all,
    exact,
    parity,
    implicitTarget,
    unitFlexible,
    floor,
    includeAttached,
    attachedRequired,
    attachedFrom,
    hasPath,
    // Keep common metadata handy for tests and UI diagnostics.
    kind: floor ? 'floor' : exact ? 'exact' : mode === 'all' ? 'all' : 'range',
  };

  parsed.specificity = scopeSpecificity(parsed);
  return parsed;
}

function branchValue(value) {
  return value === null || value === undefined ? 0 : value;
}

function compareSegmentValue(left, right) {
  if (left.value !== right.value) return left.value - right.value;
  return branchValue(left.branch) - branchValue(right.branch);
}

function sameSegment(scopeSegment, addressSegment, allowAttached = false) {
  if (!scopeSegment || !addressSegment) return false;
  if (scopeSegment.unit !== addressSegment.unit) return false;
  if (scopeSegment.value !== addressSegment.value) return false;
  if (scopeSegment.branch !== null && scopeSegment.branch !== addressSegment.branch) return false;
  if (scopeSegment.attached) {
    // `151附號` is equivalent to a base number carrying an attached `之N`
    // suffix.  The scope intentionally does not name a particular suffix.
    if (!addressSegment.attached) return false;
  } else if (scopeSegment.branch === null && (addressSegment.branch !== null || addressSegment.attached) && !allowAttached) {
    return false;
  }
  return true;
}

function segmentInRange(segment, min, max, allowAttached = false) {
  if (!segment || segment.value === null) return false;
  let lower = min;
  let upper = max;
  // The source contains one geographically ordered interval whose numeric
  // endpoints are descending (`329巷至293號`).  Postal intervals are inclusive,
  // so compare the numeric bounds in ascending order without changing parity.
  if (
    lower?.value !== null && lower?.value !== undefined &&
    upper?.value !== null && upper?.value !== undefined &&
    compareSegmentValue(lower, upper) > 0
  ) {
    [lower, upper] = [upper, lower];
  }
  if (lower && lower.value !== null && lower.value !== undefined) {
    if (segment.value < lower.value) return false;
    if (segment.value === lower.value && lower.branch !== null && branchValue(segment.branch) < lower.branch) return false;
  }
  if (upper && upper.value !== null && upper.value !== undefined) {
    if (segment.value > upper.value) return false;
    if (segment.value === upper.value && upper.branch !== null && branchValue(segment.branch) > upper.branch) return false;
  }
  // Ranges are over the numeric address line.  An attached number therefore
  // remains inside `75號以下` (and the source's explicit branch endpoints are
  // still constrained by the comparisons above).
  return true;
}

function floorMatches(floor, value) {
  if (!floor || !value) return false;
  const candidates = Array.isArray(value.floors) ? value.floors : [value];
  return candidates.some((candidate) => candidate && candidate.value >= floor.min && candidate.value <= floor.max);
}

function floorCouldMatchPartially(floor, value) {
  if (!floor) return true;
  if (!value) return true;
  return floorMatches(floor, value);
}

function pathPrefixMatches(scopePrefix, addressPath, allowPartial = false) {
  const comparableLength = Math.min(scopePrefix.length, addressPath.length);
  for (let index = 0; index < comparableLength; index += 1) {
    if (!sameSegment(scopePrefix[index], addressPath[index])) return false;
  }
  return scopePrefix.length <= addressPath.length || allowPartial;
}

function addressTargetIndex(scope, addressPath) {
  const prefixLength = (scope.prefix || []).length;
  // Implicit and mixed-unit selectors intentionally inspect the next address
  // level after their fixed prefix.
  if (scope.implicitTarget || !scope.target || scope.unitFlexible) {
    return prefixLength;
  }

  // A rule with a concrete unit must inspect that same unit. For example,
  // `單75號以下` applied to `25巷85號` judges `85號`; the lane must not be
  // substituted for a house-number rule.
  return addressPath.findIndex((segment, index) => (
    index >= prefixLength && segment.unit === scope.target.unit
  ));
}

function missingTargetCouldBeAppended(scope, addressPath) {
  const lastSegment = addressPath[addressPath.length - 1];
  if (!lastSegment) return true;
  const unitOrder = { 巷: 0, 弄: 1, 號: 2 };
  const targetOrder = unitOrder[scope.target?.unit];
  const lastOrder = unitOrder[lastSegment.unit];
  return targetOrder !== undefined && lastOrder !== undefined && targetOrder > lastOrder;
}

function scopeMatchesParsed(scope, address, { allowPartial = false } = {}) {
  if (!scope?.supported || !address?.supported) return false;
  const addressPath = address.path || [];
  if (!addressPath.length) return allowPartial;

  // Explicit nested prefixes (e.g. 58巷 33弄) must be present in order.
  if (!pathPrefixMatches(scope.prefix || [], addressPath, allowPartial)) return false;
  const targetIndex = addressTargetIndex(scope, addressPath);

  if (scope.implicitTarget) {
    const segment = targetIndex >= 0 ? addressPath[targetIndex] : null;
    if (!segment) return allowPartial;
    if (scope.parity && scope.parity !== '連' && segment.value % 2 !== (scope.parity === '單' ? 1 : 0)) return false;
  } else if (scope.target) {
    const segment = targetIndex >= 0 ? addressPath[targetIndex] : null;
    if (!segment) return allowPartial && missingTargetCouldBeAppended(scope, addressPath);
    const rangeMode = scope.mode === 'range' || scope.mode === 'atMost' || scope.mode === 'atLeast';
    // At a given address level the official notation permits endpoints to
    // switch between 巷/弄/號; compare their numeric values, not the glyph.
    if (!rangeMode && !scope.unitFlexible && scope.target.unit !== segment.unit) return false;
    if (scope.attachedFrom) {
      if (
        segment.unit !== scope.attachedFrom.unit ||
        segment.value !== scope.attachedFrom.value ||
        segment.branch === null ||
        segment.branch < scope.attachedFrom.branch
      ) return false;
    } else if (rangeMode) {
      const min = scope.mode === 'atMost' ? null : (scope.min || scope.target);
      const max = scope.mode === 'atLeast' ? null : (scope.max || scope.end || scope.target);
      if (!segmentInRange(segment, min, max, scope.includeAttached)) return false;
    } else if (!sameSegment(scope.target, segment, scope.includeAttached)) {
      return false;
    }
    if (scope.parity && scope.parity !== '連' && segment.value % 2 !== (scope.parity === '單' ? 1 : 0)) return false;
  }

  if (scope.attachedRequired) {
    const targetSegment = (targetIndex >= 0 ? addressPath[targetIndex] : null) || addressPath[addressPath.length - 1];
    if (!targetSegment?.attached && !address.attached) return false;
  }
  if (!floorCouldMatchPartially(scope.floor, address.floors)) return false;
  if (scope.floor && !address.floors) return allowPartial;
  return true;
}

function scopeSpecificity(scope) {
  let score = 0;
  if (scope.floor) score += 1000;
  if (scope.exact) score += 700;
  // A fixed `527巷全` exception outranks a broad root house-number range, while
  // deeper nested exceptions still win through their prefix-depth score.
  if (scope.mode === 'all' && scope.target) score += 400;
  if (scope.mode === 'range' || scope.mode === 'atMost' || scope.mode === 'atLeast') score += 350;
  if (scope.mode === 'all') score += 50;
  score += (scope.atoms?.length || 0) * 45;
  score += (scope.prefix?.length || 0) * 200;
  if (scope.target?.unit === '弄') score += 12;
  if (scope.target?.unit === '巷') score += 8;
  if (scope.parity) score += 20;
  if (scope.target?.branch !== null && scope.target?.branch !== undefined) score += 80;
  if (scope.includeAttached) score += 35;
  return score;
}

function scopeItemText(item) {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (item && typeof item.scope === 'string') return item.scope;
  return '';
}

function matchZipcodeScope(scopeTextOrItem, addressTextOrParsed) {
  const scope = scopeTextOrItem?.atoms ? scopeTextOrItem : parseScope(scopeItemText(scopeTextOrItem));
  const address = addressTextOrParsed?.path ? addressTextOrParsed : parseAddressSuffix(addressTextOrParsed);
  if (!address.complete) return false;
  return scopeMatchesParsed(scope, address);
}

/**
 * Return the concrete address part that caused a scope to match.
 *
 * The reported part follows the rule's explicit unit. For example,
 * `25巷85號` matched by `單77號以上` reports `85號`; a preceding lane is not
 * substituted for a house-number rule.
 */
function getZipcodeScopeMatchBasis(scopeTextOrItem, addressTextOrParsed) {
  const scope = scopeTextOrItem?.atoms ? scopeTextOrItem : parseScope(scopeItemText(scopeTextOrItem));
  const address = addressTextOrParsed?.path ? addressTextOrParsed : parseAddressSuffix(addressTextOrParsed);
  if (!address.complete || !scopeMatchesParsed(scope, address)) return null;

  const parts = [];
  if (scope.target || scope.implicitTarget) {
    const targetIndex = addressTargetIndex(scope, address.path);
    const segment = targetIndex >= 0 ? address.path[targetIndex] : null;
    if (segment?.raw) {
      let segmentText = compactText(segment.raw);
      if (segment.attached && address.compact?.includes(`${segmentText}附號`)) {
        segmentText += '附號';
      }
      parts.push(segmentText);
    }
  }
  if (scope.floor && address.floors?.floors?.length) {
    parts.push(...address.floors.floors.map((floor) => compactText(floor.raw)));
  }

  return {
    parts,
    text: parts.join('、') || '路名',
  };
}

function pendingScope(scopeTextOrItem, address) {
  const scope = scopeTextOrItem?.atoms ? scopeTextOrItem : parseScope(scopeItemText(scopeTextOrItem));
  return scopeMatchesParsed(scope, address, { allowPartial: true });
}

/**
 * Resolve a list of scope records for an address suffix.
 *
 * `matches` and `pending` contain the original scope records (not parsed
 * copies), making the result directly usable by the application view.
 */
function resolveZipcodeScopes(scopes, addressText) {
  const items = Array.isArray(scopes) ? scopes : [];
  const address = addressText?.path ? addressText : parseAddressSuffix(addressText);
  if (!address.compact) return { status: 'empty', matches: [], pending: [] };

  const parsedItems = items.map((item, index) => ({
    item,
    index,
    parsed: parseScope(scopeItemText(item)),
  }));
  const candidates = parsedItems.filter(({ parsed }) => pendingScope(parsed, address));

  if (!address.complete) {
    return {
      status: 'incomplete',
      matches: [],
      pending: candidates
        .sort((a, b) => b.parsed.specificity - a.parsed.specificity || a.index - b.index)
        .map(({ item }) => item),
    };
  }

  const matches = parsedItems
    .filter(({ parsed }) => scopeMatchesParsed(parsed, address))
    .sort((a, b) => b.parsed.specificity - a.parsed.specificity || a.index - b.index);
  const pending = candidates
    .filter(({ parsed }) => !scopeMatchesParsed(parsed, address))
    .sort((a, b) => b.parsed.specificity - a.parsed.specificity || a.index - b.index);
  const topMatchScore = matches[0]?.parsed.specificity ?? Number.NEGATIVE_INFINITY;
  const topPendingScore = pending[0]?.parsed.specificity ?? Number.NEGATIVE_INFINITY;

  // A complete house/lane token can still be insufficient when the database
  // further divides that address by floor or attached number.  Do not fall
  // back to a broader match (or report it as invalid) until that qualifier is
  // supplied.
  if (pending.length && topPendingScore > topMatchScore) {
    return {
      status: 'incomplete',
      matches: [],
      pending: pending.map(({ item }) => item),
    };
  }
  if (!matches.length) return { status: 'unmatched', matches: [], pending: [] };

  const topScore = matches[0].parsed.specificity;
  const top = matches.filter(({ parsed }) => parsed.specificity === topScore);
  const topZipcodes = new Set(top.map(({ item }) => item && typeof item === 'object' ? item.zipcode : undefined));
  const ambiguous = top.length > 1 && (topZipcodes.size > 1 || topZipcodes.has(undefined));
  return {
    status: ambiguous ? 'ambiguous' : 'matched',
    matches: matches.map(({ item }) => item),
  };
}

function findMatchingScope(scopes, addressText) {
  const result = resolveZipcodeScopes(scopes, addressText);
  return result.matches[0] || null;
}

const matchScope = matchZipcodeScope;
const parseZipcodeScope = parseScope;

export {
  findMatchingScope,
  getZipcodeScopeMatchBasis,
  matchScope,
  matchZipcodeScope,
  parseAddressSuffix,
  parseScope,
  parseZipcodeScope,
  resolveZipcodeScopes,
};

export default {
  findMatchingScope,
  getZipcodeScopeMatchBasis,
  matchScope,
  matchZipcodeScope,
  parseAddressSuffix,
  parseScope,
  parseZipcodeScope,
  resolveZipcodeScopes,
};

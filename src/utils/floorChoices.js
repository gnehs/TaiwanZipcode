import { parseAddressSuffix, parseScope, resolveZipcodeScopes } from './zipcodeScopeMatcher.js';

function floorText(value) {
  return value < 0 ? `地下${-value}樓` : `${value}樓`;
}

function floorLabel(floor) {
  if (!floor) return '其他樓層';
  const [first, second] = floor.floors.map((item) => floorText(item.value));
  if (floor.mode === 'atMost') return `${first}以下`;
  if (floor.mode === 'atLeast') return `${first}以上`;
  return floor.mode === 'range' && second ? `${first}至${second}` : first;
}

// Floors in this order make the floor filled in for a range its lowest one
// above ground.
function probeOrder(value) {
  return value > 0 ? value : 1000 - value;
}

/**
 * When a complete house number still waits on its floor, the floors that
 * decide it: one choice per rule, with the floor to fill in, the range it
 * stands for, and its zipcode and recipient. Each floor is checked with the
 * same resolver the lookup uses, so a choice always resolves when picked.
 */
export function getFloorChoices(scopes, addressSuffix) {
  const address = parseAddressSuffix(addressSuffix);
  if (!address.complete || address.floor) return [];
  const resolution = resolveZipcodeScopes(scopes, addressSuffix);
  if (resolution.status !== 'incomplete') return [];
  const floors = resolution.pending.map((scope) => parseScope(scope.scope).floor);
  if (!floors.length || floors.some((floor) => !floor)) return [];

  const probes = new Set([1]);
  for (const { min, max } of floors) {
    for (const value of [min - 1, min, max, max + 1]) {
      if (Number.isFinite(value)) probes.add(value === 0 ? (value < min ? -1 : 1) : value);
    }
  }

  const choices = new Map();
  for (const value of [...probes].sort((a, b) => probeOrder(a) - probeOrder(b))) {
    const floor = floorText(value);
    const { status, matches } = resolveZipcodeScopes(scopes, `${addressSuffix.trimEnd()}${floor}`);
    const scope = status === 'matched' ? matches[0] : null;
    if (!scope || choices.has(scope)) continue;
    choices.set(scope, {
      floor,
      value,
      label: floorLabel(parseScope(scope.scope).floor),
      zipcode: scope.zipcode,
      department: scope.department || null,
    });
  }
  return [...choices.values()]
    .sort((a, b) => a.value - b.value)
    .map(({ value, ...choice }) => choice);
}

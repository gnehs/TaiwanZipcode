function canonicalSuffix(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/gu, '')
    .replace(/[‐‑‒–—−－-]/gu, '之')
    .replace(/(\d+)之(\d+)號/gu, '$1號之$2');
}

// Compare the entered suffix with the parts actually represented in English.
// This catches dropped room numbers, building names, and nested lane parts.
export function hasUnconvertedAddressParts(input, reconstructed) {
  return canonicalSuffix(input) !== canonicalSuffix(reconstructed);
}

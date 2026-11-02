// Pseudonymisation for AI prompts (plan D2): real names and emails never leave
// the project. Pure ESM with no Deno/Node APIs — imported by the edges (Deno)
// and by tests/golden/aiAliases.test.mjs (Node).
const KIND_ORDER = { student: 0, staff: 1, room: 2, program: 3 };
const KIND_PREFIX = { student: 'S', staff: 'T', room: 'R', program: 'P' };

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asText = (value) => (typeof value === 'string' ? value : '');

// Profiles/rooms/programs carry numeric ids, profiles carry uuids: sort
// numerically when possible, lexicographically otherwise, so the mapping is
// stable across calls regardless of fetch order.
const compareIds = (a, b) => {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a).localeCompare(String(b));
};

export function createAliasMap(entries = []) {
  const sorted = (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && KIND_PREFIX[entry.kind])
    .slice()
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || compareIds(a.id, b.id));

  const aliasByKey = new Map();
  const counters = { student: 0, staff: 0, room: 0, program: 0 };
  const realToAlias = new Map();
  const aliasToReal = new Map();

  for (const entry of sorted) {
    const key = `${entry.kind}:${String(entry.id)}`;
    let alias = aliasByKey.get(key);
    if (!alias) {
      alias = `${KIND_PREFIX[entry.kind]}-${String((counters[entry.kind] += 1)).padStart(2, '0')}`;
      aliasByKey.set(key, alias);
    }
    const display = asText(entry.name).trim() || asText(entry.email).trim();
    for (const value of [asText(entry.name).trim(), asText(entry.email).trim()]) {
      if (!value) continue;
      const lower = value.toLowerCase();
      if (!realToAlias.has(lower)) realToAlias.set(lower, alias);
    }
    if (display && !aliasToReal.has(alias)) aliasToReal.set(alias, display);
  }

  // Longest first so "Ana Marie" wins over "Ana" at the same position.
  const reals = Array.from(realToAlias.keys()).sort((a, b) => b.length - a.length);
  const aliases = Array.from(aliasToReal.keys()).sort((a, b) => b.length - a.length);
  // Unicode word boundaries: "Ana" must not rewrite "Banana", while a name that
  // ends in punctuation (or is followed by a hyphen) still maps.
  const wordChar = '\\p{L}\\p{N}';
  const forwardSource = reals.length
    ? `(?<![${wordChar}])(?:${reals.map(escapeRegExp).join('|')})(?![${wordChar}])`
    : null;
  const forwardPattern = forwardSource ? new RegExp(forwardSource, 'giu') : null;
  const reversePattern = aliases.length ? new RegExp(aliases.map(escapeRegExp).join('|'), 'g') : null;

  const forward = (text) => {
    const value = asText(text);
    if (!value || !forwardPattern) return value;
    return value.replace(forwardPattern, (match) => realToAlias.get(match.toLowerCase()) ?? match);
  };

  // Aliases are ASCII and case-sensitive: S-01 is the alias, s-01 is just text.
  const reverse = (text) => {
    const value = asText(text);
    if (!value || !reversePattern) return value;
    return value.replace(reversePattern, (match) => aliasToReal.get(match) ?? match);
  };

  const hasReal = (text) => {
    const value = asText(text).toLowerCase();
    return Boolean(value) && reals.some((real) => value.includes(real));
  };

  return { forward, reverse, hasReal };
}

export const estimateTokens = (text) => Math.ceil(asText(text).length / 4);

// A null cap means "no cap"; an absent number counts as zero.
export const withinCap = (used, cap, estimate) => {
  if (cap === null || cap === undefined) return true;
  return (Number(used) || 0) + (Number(estimate) || 0) <= Number(cap);
};

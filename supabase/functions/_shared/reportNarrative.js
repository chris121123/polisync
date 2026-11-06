// Provenance guard for AI report prose (plan §5.4, D7): a model may narrate
// only the numbers the edge computed from SQL. Pure ESM with no Deno/Node APIs,
// imported by the `ai-reports` edge and by tests/golden/reportNarrative.test.mjs.

// Dates and clock times are labels, not metrics: they never count as an
// invented figure and sanitize must not mangle them.
const LABEL = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}:\d{2}\b|\b(?:19|20)\d{2}\b/g;
// Decimal numbers with optional thousands separators and a trailing percent.
// Ids/aliases (T-01, S-02) are not figures: a preceding letter, digit, `_` or
// `-` excludes them.
const NUMBER = /(?<![\p{L}\p{N}_-])(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?/gu;
const PLACEHOLDER = '\uE000';

const asText = (value) => (typeof value === 'string' ? value : '');

/** Replace dates/times with a private-use placeholder, collected in text order. */
const protectLabels = (text) => {
  const labels = [];
  const marked = text.replace(LABEL, (label) => {
    labels.push(label);
    return PLACEHOLDER;
  });
  return { marked, labels };
};

const restoreLabels = (text, labels) => {
  let index = 0;
  return text.replace(new RegExp(PLACEHOLDER, 'g'), () => labels[index++] ?? PLACEHOLDER);
};

const toNumber = (token) => {
  const value = Number(token.replace(/[%,]/g, ''));
  return Number.isFinite(value) ? value : null;
};

/** Numbers in prose that are meant as figures (dates and times excluded). */
export function extractNumbers(text) {
  const { marked } = protectLabels(asText(text));
  const numbers = [];
  for (const match of marked.matchAll(NUMBER)) {
    const value = toNumber(match[0]);
    if (value !== null) numbers.push(value);
  }
  return numbers;
}

/** Every numeric leaf of a metrics value, nested objects and arrays included. */
export function flattenNumbers(value, out = []) {
  if (typeof value === 'number' && Number.isFinite(value)) out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => flattenNumbers(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => flattenNumbers(item, out));
  return out;
}

/** Numbers in the prose that do not appear among the metric values. */
export function numbersSubset(narrative, metrics) {
  const known = new Set(flattenNumbers(metrics));
  return extractNumbers(narrative).filter((number) => !known.has(number));
}

/**
 * Replaces every numeric token the model invented with `N/A`, so a figure
 * cannot enter the brief unless the edge computed it. Returns the cleaned text
 * and the numbers that were removed.
 */
export function sanitizeNarrative(text, metrics) {
  const known = new Set(flattenNumbers(metrics));
  const unknownNumbers = [];
  const { marked, labels } = protectLabels(asText(text));

  const cleaned = marked.replace(NUMBER, (token) => {
    const value = toNumber(token);
    if (value === null || known.has(value)) return token;
    if (!unknownNumbers.includes(value)) unknownNumbers.push(value);
    return 'N/A';
  });

  return { text: restoreLabels(cleaned, labels), unknownNumbers };
}

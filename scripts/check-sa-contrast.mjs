// WCAG AA gate for the SuperAdmin Atelier token blocks (dark + light).
// Plans: docs/plans/superadmin-atelier-plan.md §2, superadmin-light-mode-plan.md §6.
// Single-file, no deps: node scripts/check-sa-contrast.mjs  → exit 1 on any pair below threshold.
import { readFileSync } from 'node:fs';

const CSS_PATH = new URL('../src/styles/superadminTheme.css', import.meta.url);
// Comments are stripped first so a '}' inside one cannot close a block early.
const css = readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// ── Parse the two token blocks ───────────────────────────────────────
function blockBody(selector) {
  const match = new RegExp(`^${selector}\\s*\\{`, 'm').exec(css);
  if (!match) throw new Error(`token block not found: ${selector}`);
  let depth = 1;
  let i = css.indexOf('{', match.index) + 1;
  const start = i;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    i++;
  }
  if (depth !== 0) throw new Error(`unbalanced braces in block: ${selector}`);
  return css.slice(start, i - 1);
}

function tokensOf(selector) {
  const tokens = {};
  for (const [, name, hex] of blockBody(selector).matchAll(/(--sa-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) {
    tokens[name] = hex;
  }
  return tokens;
}

// 24 tokens per block (4 surfaces + 4 lines + 6 text + 5 gold + 3 bars + 2 semantic).
// Guards the parser against a silent partial read of a renamed/restructured block.
const EXPECTED_TOKENS = 24;

function tokenBlock(label, selector) {
  const tokens = tokensOf(selector);
  const count = Object.keys(tokens).length;
  if (count !== EXPECTED_TOKENS) throw new Error(`${label}: parsed ${count} tokens, expected ${EXPECTED_TOKENS}`);
  return tokens;
}

// ── WCAG 2.1 relative luminance and contrast ─────────────────────────
const channel = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// ── Pairs under test ─────────────────────────────────────────────────
// Text (4.5:1) on the surfaces it actually sits on; gold also as focus/accent
// and bar-accent as a data mark (3:1, WCAG 1.4.11).
// --sa-line-* / --sa-gold-line / --sa-gold-fill-* are decorative: exempt (L-A2).
const TEXT = 4.5;
const UI = 3;

const PAIRS = [
  ['text-primary', 'surface-1', 'text', TEXT],
  ['text-primary', 'bg-base', 'text', TEXT],
  ['text-secondary', 'surface-1', 'text', TEXT],
  ['text-secondary', 'bg-base', 'text', TEXT],
  ['text-muted', 'surface-1', 'text', TEXT],
  ['text-muted', 'bg-base', 'text', TEXT],
  ['text-subtle', 'surface-1', 'text', TEXT],
  ['text-subtle', 'bg-base', 'text', TEXT],
  ['text-warm', 'surface-1', 'text', TEXT],
  ['text-warm', 'bg-base', 'text', TEXT],
  ['text-warm', 'surface-warm', 'text', TEXT], // avatar initials
  ['text-warm-dim', 'surface-warm', 'text', TEXT],
  ['gold', 'surface-1', 'text', TEXT],
  ['gold', 'surface-2', 'text', TEXT], // .sa-row:hover
  ['gold', 'bg-base', 'text', TEXT],
  ['gold-light', 'surface-1', 'hover text', TEXT],
  ['gold-light', 'bg-base', 'hover text', TEXT], // primary button on canvas
  ['danger', 'surface-1', 'text', TEXT],
  ['success', 'surface-1', 'text', TEXT],
  ['gold', 'surface-1', 'focus', UI],
  ['gold', 'bg-base', 'focus', UI],
  ['bar-accent', 'bar-track', 'mark', UI], // data marks, WCAG 1.4.11
];

const BLOCKS = [
  ['DARK  .sa-theme', '.sa-theme'],
  ['LIGHT html:not(.dark) .sa-theme', 'html:not\\(\\.dark\\) \\.sa-theme'],
];

let failures = 0;

for (const [label, selector] of BLOCKS) {
  const tokens = tokenBlock(label, selector);
  console.log(`\n${label}`);
  console.log('─'.repeat(66));
  console.log('pair'.padEnd(30) + 'fg'.padEnd(10) + 'bg'.padEnd(10) + 'ratio'.padEnd(8) + 'need   result');
  for (const [fgName, bgName, kind, need] of PAIRS) {
    const fg = tokens[`--sa-${fgName}`];
    const bg = tokens[`--sa-${bgName}`];
    if (!fg || !bg) throw new Error(`${label}: missing token --sa-${!fg ? fgName : bgName}`);
    const value = ratio(fg, bg);
    const pass = value >= need;
    if (!pass) failures++;
    const pair = `${fgName} on ${bgName}`;
    console.log(
      pair.padEnd(30) + fg.padEnd(10) + bg.padEnd(10) +
      `${value.toFixed(2)}:1`.padEnd(8) + `${need.toFixed(1)}:1`.padEnd(7) + (pass ? 'PASS' : 'FAIL') +
      (kind === 'focus' ? '  (focus/accent)' : kind === 'text' ? '' : `  (${kind})`)
    );
  }
}

console.log(
  failures === 0
    ? '\nAll AA pairs pass in both blocks.'
    : `\n${failures} pair(s) below threshold.`
);
process.exit(failures === 0 ? 0 : 1);

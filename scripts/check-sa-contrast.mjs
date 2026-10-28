// WCAG AA gate for the SuperAdmin Atelier token blocks (dark + light).
// Plans: docs/plans/superadmin-atelier-plan.md §2, superadmin-light-mode-plan.md §6.
// Single-file, no deps: node scripts/check-sa-contrast.mjs  → exit 1 on any pair below threshold.
import { readFileSync } from 'node:fs';

const CSS_PATH = new URL('../src/styles/superadminTheme.css', import.meta.url);
// Comments are stripped first so a '}' inside one cannot close a block early.
const css = readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// ── Parse the two token blocks ───────────────────────────────────────
function blockBody(selector) {
  // Tolerates a comma-list selector: matches up to the block's opening brace.
  const match = new RegExp(`^${selector}[^{]*\\{`, 'm').exec(css);
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

// Alpha composite, sRGB channels: what `bg-role-*/10` paints over a surface.
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (fg, bg, alpha) => {
  const [f, b] = [rgb(fg), rgb(bg)];
  return '#' + f.map((v, i) => Math.round(alpha * v + (1 - alpha) * b[i]).toString(16).padStart(2, '0')).join('');
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
  // Neutral header (ModalHeader / session detail): warm fill, token inks, hairline controls.
  ['text-primary', 'surface-warm', 'text', TEXT],
  ['text-secondary', 'surface-warm', 'text', TEXT],
  ['text-muted', 'surface-warm', 'text', TEXT],
  // Danger on the warm header ships as a 3:1 graphical mark (border/icon), never as text:
  // measured 4.12:1 in dark, below the 4.5 text floor.
  ['danger', 'surface-warm', 'mark', UI],
  ['gold', 'surface-1', 'focus', UI],
  ['gold', 'bg-base', 'focus', UI],
  ['bar-accent', 'bar-track', 'mark', UI], // data marks, WCAG 1.4.11
];

const BLOCKS = [
  ['DARK  .sa-theme', '.sa-theme'],
  ['LIGHT html.sa-theme:not(.dark)', 'html\\.sa-theme:not\\(\\.dark\\)'],
];

// ── Remapped app/role tokens (ADR-R9 / ADR-R5) ───────────────────────
// Each alias must resolve to a parsed --sa-* hex in both blocks; a rename
// that silently drops one would leave the pairs below testing nothing.
const EXPECTED_REMAPS = [
  '--color-role-superadmin', '--color-role-admin', '--color-role-teacher',
  '--color-role-therapist', '--color-role-parent',
  '--ps-surface', '--ps-bg', '--ps-ink-1', '--ps-ink-2', '--ps-accent', '--ps-primary',
];

function aliasTargets(selector) {
  const map = {};
  const pattern = /--((?:color-)?(?:role|ps)-[a-z0-9-]+)\s*:\s*var\((--sa-[a-z0-9-]+)\)/g;
  for (const [, name, target] of blockBody(selector).matchAll(pattern)) map[`--${name}`] = target;
  return map;
}

// Role aliases are declared once in the base block and inherit into the light
// block, so the base map is the fallback; hexes resolve per block.
const BASE_ALIASES = aliasTargets('.sa-theme');

function remapsOf(label, selector, saTokens) {
  const targets = { ...BASE_ALIASES, ...aliasTargets(selector) };
  const resolved = {};
  for (const [name, target] of Object.entries(targets)) {
    const hex = saTokens[target];
    if (!hex) throw new Error(`${label}: ${name} points at unknown token ${target}`);
    resolved[name] = hex;
  }
  const missing = EXPECTED_REMAPS.filter((name) => !resolved[name]);
  if (missing.length) throw new Error(`${label}: missing remap(s) ${missing.join(', ')}`);
  return resolved;
}

const ROLES = ['superadmin', 'admin', 'teacher', 'therapist', 'parent'];

// White on the primary control surface (active nav item, primary button).
const VAR_PAIRS = [
  ['#FFFFFF', '--ps-primary', 'on primary control', TEXT],
  ['--ps-ink-1', '--ps-surface', 'shell ink', TEXT],
  ['--ps-ink-1', '--ps-bg', 'shell ink', TEXT],
  ['--ps-ink-2', '--ps-surface', 'shell ink', TEXT],
  ['--ps-accent', '--ps-surface', 'shell accent', TEXT],
  ['--ps-accent', '--ps-bg', 'shell accent', TEXT],
  ['--ps-ink-1', '--sa-surface-2', 'raised ink', TEXT],   // R1: modal/raised surface
  ['--sa-text-secondary', '--sa-surface-2', 'raised ink', TEXT],
];

let failures = 0;

function check(pair, fg, bg, kind, need) {
  if (!fg || !bg) throw new Error(`pair references a missing token: ${pair}`);
  const value = ratio(fg, bg);
  const pass = value >= need;
  if (!pass) failures++;
  console.log(
    pair.padEnd(36) + fg.padEnd(10) + bg.padEnd(10) +
    `${value.toFixed(2)}:1`.padEnd(8) + `${need.toFixed(1)}:1`.padEnd(7) + (pass ? 'PASS' : 'FAIL') +
    (kind === 'focus' ? '  (focus/accent)' : kind === 'text' ? '' : `  (${kind})`)
  );
}

for (const [label, selector] of BLOCKS) {
  const tokens = tokenBlock(label, selector);
  const vars = { ...tokens, ...remapsOf(label, selector, tokens) };
  console.log(`\n${label}`);
  console.log('─'.repeat(66));
  console.log('pair'.padEnd(36) + 'fg'.padEnd(10) + 'bg'.padEnd(10) + 'ratio'.padEnd(8) + 'need   result');

  for (const [fgName, bgName, kind, need] of PAIRS) {
    check(`${fgName} on ${bgName}`, tokens[`--sa-${fgName}`], tokens[`--sa-${bgName}`], kind, need);
  }

  // Role inks, plain and over their own 10% tint (bg-role-*/10) — risk R2.
  for (const role of ROLES) {
    const ink = vars[`--color-role-${role}`];
    check(`role-${role} on surface-1`, ink, vars['--sa-surface-1'], 'text', TEXT);
    check(`role-${role} on bg-base`, ink, vars['--sa-bg-base'], 'text', TEXT);
    check(`role-${role} on its 10% tint`, ink, mix(ink, vars['--sa-surface-1'], 0.1), 'text', TEXT);
  }

  // Semantic inks over their own 10% tint — the state chips (bg-ps-danger/10, bg-ps-success/10).
  for (const ink of ['danger', 'success']) {
    check(`${ink} on its 10% tint`, tokens[`--sa-${ink}`], mix(tokens[`--sa-${ink}`], vars['--sa-surface-1'], 0.1), 'text', TEXT);
  }

  for (const [fgName, bgName, kind, need] of VAR_PAIRS) {
    const plain = (name) => name.replace(/^--/, '');
    const val = (name) => (name.startsWith('#') ? name : vars[name]);
    check(`${plain(fgName)} on ${plain(bgName)}`, val(fgName), val(bgName), kind, need);
  }

  console.log('\nremaps');
  for (const name of EXPECTED_REMAPS) console.log(`  ${name.padEnd(24)} ${vars[name]}`);
}

console.log(
  failures === 0
    ? '\nAll AA pairs pass in both blocks.'
    : `\n${failures} pair(s) below threshold.`
);
process.exit(failures === 0 ? 0 : 1);

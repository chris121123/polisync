// WCAG AA gate for the SuperAdmin Atelier token blocks (dark + light) and the
// plan-18 ITX scoped token blocks (light canonical + derived dark).
// Plans: docs/plans/superadmin-atelier-plan.md §2, superadmin-light-mode-plan.md §6,
// docs/plans/itx-industrial-minimalism-plan-v3.md §B1/D4.
// Single-file, no deps: node scripts/check-sa-contrast.mjs  → exit 1 on any pair below threshold.
import { readFileSync } from 'node:fs';

const CSS_PATH = new URL('../src/styles/superadminTheme.css', import.meta.url);
const ITX_PATH = new URL('../src/styles/itxTokens.css', import.meta.url);
// Comments are stripped first so a '}' inside one cannot close a block early.
const css = readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const itxCss = readFileSync(ITX_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// ── Parse the token blocks ───────────────────────────────────────────
function blockBody(source, selector) {
  // Tolerates a comma-list selector: matches up to the block's opening brace.
  const match = new RegExp(`^${selector}[^{]*\\{`, 'm').exec(source);
  if (!match) throw new Error(`token block not found: ${selector}`);
  let depth = 1;
  let i = source.indexOf('{', match.index) + 1;
  const start = i;
  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    i++;
  }
  if (depth !== 0) throw new Error(`unbalanced braces in block: ${selector}`);
  return source.slice(start, i - 1);
}

function tokensOf(selector) {
  const tokens = {};
  for (const [, name, hex] of blockBody(css, selector).matchAll(/(--sa-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) {
    tokens[name] = hex;
  }
  return tokens;
}

// Token count is derived, not hard-coded: plan 21 Phase 1 added state and
// chart tokens to both blocks. The dark block is parsed first and the light
// block must expose exactly the same names, so a rename or a half-read block
// trips the sync guard instead of silently testing nothing. The floor catches
// a degenerate parse where both blocks read empty and would "agree".
const SA_MIN_TOKENS = 30;

function tokenBlock(label, selector) {
  const tokens = tokensOf(selector);
  const count = Object.keys(tokens).length;
  if (count < SA_MIN_TOKENS) throw new Error(`${label}: parsed ${count} tokens, expected at least ${SA_MIN_TOKENS}`);
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
  ['danger-hover', 'surface-1', 'text', TEXT],
  ['danger-pressed', 'surface-1', 'text', TEXT],
  ['success', 'surface-1', 'text', TEXT],
  ['warning', 'surface-1', 'text', TEXT],
  ['info', 'surface-1', 'mark', UI],
  // Primary control: the global action ink pairs with bar-primary (fill) and
  // action-pressed (pressed fill) in both modes.
  ['action-text', 'bar-primary', 'text', TEXT],
  ['action-text', 'action-pressed', 'text', TEXT],
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
  for (const [, name, target] of blockBody(css, selector).matchAll(pattern)) map[`--${name}`] = target;
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

// The primary control's ink is `--sa-action-text` (light fill in dark mode,
// dark fill in light mode), so the pair must follow it, not a fixed white.
const VAR_PAIRS = [
  ['--sa-action-text', '--ps-primary', 'on primary control', TEXT],
  ['--ps-ink-1', '--ps-surface', 'shell ink', TEXT],
  ['--ps-ink-1', '--ps-bg', 'shell ink', TEXT],
  ['--ps-ink-2', '--ps-surface', 'shell ink', TEXT],
  ['--ps-accent', '--ps-surface', 'shell accent', TEXT],
  ['--ps-accent', '--ps-bg', 'shell accent', TEXT],
  ['--ps-ink-1', '--sa-surface-2', 'raised ink', TEXT],   // R1: modal/raised surface
  ['--sa-text-secondary', '--sa-surface-2', 'raised ink', TEXT],
];

let failures = 0;
let scored = 0;

function check(pair, fg, bg, kind, need) {
  if (!fg || !bg) throw new Error(`pair references a missing token: ${pair}`);
  scored += 1;
  const value = ratio(fg, bg);
  const pass = value >= need;
  if (!pass) failures++;
  console.log(
    pair.padEnd(36) + fg.padEnd(10) + bg.padEnd(10) +
    `${value.toFixed(2)}:1`.padEnd(8) + `${need.toFixed(1)}:1`.padEnd(7) + (pass ? 'PASS' : 'FAIL') +
    (kind === 'focus' ? '  (focus/accent)' : kind === 'text' ? '' : `  (${kind})`)
  );
}

// Parse both blocks before scoring so the mode-pair sync is checked once.
const SA_PARSED = BLOCKS.map(([label, selector]) => ({ label, selector, tokens: tokenBlock(label, selector) }));
{
  const [dark, light] = SA_PARSED.map((block) => block.tokens);
  const darkOnly = Object.keys(dark).filter((name) => !(name in light));
  const lightOnly = Object.keys(light).filter((name) => !(name in dark));
  if (darkOnly.length || lightOnly.length) {
    throw new Error(`Global token blocks disagree: dark-only [${darkOnly.join(', ')}], light-only [${lightOnly.join(', ')}]`);
  }
}

for (const { label, selector, tokens } of SA_PARSED) {
  const vars = { ...tokens, ...remapsOf(label, selector, tokens) };
  console.log(`\n${label}`);
  console.log('─'.repeat(66));
  console.log(`${Object.keys(tokens).length} hex tokens per block`);
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

// ── ITX scoped tokens (plan 18 §B1) ──────────────────────────────────
// The light block is the canonical set; the dark block is the derived set.
// Only the two blocks below may carry ITX hex values. The expected count is
// derived rather than hard-coded (plan 20 added three state tokens after the
// first guard): the light block is parsed first and the dark block must expose
// exactly the same names, so a rename or a half-read block trips the sync guard
// instead of silently testing nothing. The floor catches a degenerate parse
// where both blocks read empty and would "agree".
const ITX_MIN_TOKENS = 20;

function itxTokensOf(label, selector) {
  const tokens = {};
  for (const [, name, hex] of blockBody(itxCss, selector).matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) {
    tokens[name] = hex;
  }
  const count = Object.keys(tokens).length;
  if (count < ITX_MIN_TOKENS) throw new Error(`${label}: parsed ${count} tokens, expected at least ${ITX_MIN_TOKENS}`);
  return tokens;
}

// Text: every ink token on the surfaces it is actually used on. `ink-subtle`
// is a page-copy/helper ink (canvas + surface), never on the sunken tag fill.
// The pressed/hover pairs below are the plan-20 button-state tokens: a state
// token is only legitimate if its ink still reads on the fill it paints with.
const ITX_TEXT_PAIRS = [
  ['ink-primary', 'surface'], ['ink-primary', 'bg-canvas'], ['ink-primary', 'surface-sunken'], ['ink-primary', 'surface-hover'],
  ['ink-strong', 'surface'], ['ink-strong', 'bg-canvas'], ['ink-strong', 'surface-sunken'],
  ['ink-body', 'surface'], ['ink-body', 'bg-canvas'], ['ink-body', 'surface-sunken'], ['ink-body', 'surface-hover'],
  ['ink-muted', 'surface'], ['ink-muted', 'bg-canvas'], ['ink-muted', 'surface-sunken'], ['ink-muted', 'surface-hover'],
  ['ink-subtle', 'surface'], ['ink-subtle', 'bg-canvas'], ['ink-subtle', 'surface-hover'],
  ['ink-avatar', 'surface-sunken'],            // avatar initials on surface-warm
  ['accent', 'surface'], ['accent', 'bg-canvas'], ['accent', 'surface-sunken'],
  ['action-text', 'action-bg'],                // primary button
  ['action-text', 'action-hover'],             // primary button hover
  ['action-text', 'action-pressed'],           // primary button pressed
  ['danger', 'surface'], ['success', 'surface'], ['warning', 'surface'],
  ['danger-hover', 'surface-hover'],           // danger button hover (fill + ink)
  ['danger-pressed', 'surface-sunken'],        // danger button pressed (fill + ink)
  ['chart-axis', 'surface'],                   // axis labels are text
];

// Non-text (WCAG 1.4.11): focus/accent ring, checked fill, state dots, bars.
const ITX_UI_PAIRS = [
  ['accent', 'surface'], ['accent', 'bg-canvas'], ['accent', 'surface-sunken'], ['accent', 'surface-hover'],
  ['danger', 'surface'], ['success', 'surface'], ['warning', 'surface'], ['info', 'surface'],
  ['action-bg', 'surface'],                    // primary control fill/boundary
  ['chart-1', 'surface'], ['chart-2', 'surface'],
];
// Recorded, not gated: --chart-3 (#A9A79F) is a tertiary series that cannot
// reach 3:1 on white (2.41:1) and is never a sole indicator; --line-* are
// hairlines (decorative, same exemption as the Atelier block). Native input
// boundaries (--line-default) are the plan's documented AA note.

const ITX_BLOCKS = [
  ['ITX LIGHT  .itx-scope', 'html\\.sa-theme \\.itx-scope'],
  ['ITX DARK   html.dark .itx-scope', 'html\\.dark \\.sa-theme \\.itx-scope'],
];

// Parse both blocks before scoring so the mode-pair sync is checked once.
const ITX_PARSED = ITX_BLOCKS.map(([label, selector]) => ({ label, tokens: itxTokensOf(label, selector) }));
{
  const [light, dark] = ITX_PARSED.map((block) => block.tokens);
  const lightOnly = Object.keys(light).filter((name) => !(name in dark));
  const darkOnly = Object.keys(dark).filter((name) => !(name in light));
  if (lightOnly.length || darkOnly.length) {
    throw new Error(`ITX blocks disagree: light-only [${lightOnly.join(', ')}], dark-only [${darkOnly.join(', ')}]`);
  }
}

for (const { label, tokens } of ITX_PARSED) {
  console.log(`\n${label}`);
  console.log('─'.repeat(66));
  console.log(`${Object.keys(tokens).length} hex tokens · color-scheme ${label.includes('DARK') ? 'dark' : 'light'}`);
  console.log('pair'.padEnd(36) + 'fg'.padEnd(10) + 'bg'.padEnd(10) + 'ratio'.padEnd(8) + 'need   result');

  for (const [fg, bg] of ITX_TEXT_PAIRS) {
    check(`${fg} on ${bg}`, tokens[`--${fg}`], tokens[`--${bg}`], 'text', TEXT);
  }
  for (const [fg, bg] of ITX_UI_PAIRS) {
    check(`${fg} on ${bg}`, tokens[`--${fg}`], tokens[`--${bg}`], 'mark', UI);
  }
  // Alert text: --x-notice-ink is color-mix(danger 90%, ink-primary) on sunken.
  check('notice-ink on surface-sunken', mix(tokens['--danger'], tokens['--ink-primary'], 0.9), tokens['--surface-sunken'], 'text', TEXT);

  console.log('recorded (not gated)');
  console.log(`  chart-3 on surface              ${ratio(tokens['--chart-3'], tokens['--surface']).toFixed(2)}:1`);
  console.log(`  line-default on surface         ${ratio(tokens['--line-default'], tokens['--surface']).toFixed(2)}:1  (input boundary, plan AA note)`);
  console.log(`  line-strong on surface          ${ratio(tokens['--line-strong'], tokens['--surface']).toFixed(2)}:1`);
}

console.log(
  failures === 0
    ? `\nAll AA pairs pass in every block (Atelier dark/light + ITX light/dark). ${scored} pairs scored; ITX ${Object.keys(ITX_PARSED[0].tokens).length} tokens per block.`
    : `\n${failures} pair(s) below threshold (${scored} scored).`
);
process.exit(failures === 0 ? 0 : 1);

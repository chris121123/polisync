#!/usr/bin/env node
// Plan 18 (industrial minimalism) guardrail — plan 21 Phase 5 extended it from
// the IT-Manager set to the whole UI.
//   node scripts/audit-itx.mjs   -> prints file:line + rule, exits 1 on any find.
//   node scripts/audit-itx.mjs --self-test -> proves a seeded violation exits 1.
//
// Scope: every UI file — `src/pages/**/*.jsx`, `src/components/**/*.jsx`,
// `src/styles/**/*.css`, `src/index.css`, `src/App.jsx` and `src/main.jsx`.
// Non-UI libraries (`src/lib`, `src/state`, `src/context`) are out, except
// `itxProgramPalette.js` (the data hexes) and `ItxSelect` (a UI component).
//
// Legal value sites (the only places raw colour values may live):
//   - src/styles/itxTokens.css: the light and the derived-dark token blocks.
//   - src/styles/superadminTheme.css: the app theme's global token blocks.
//   - src/index.css: the Tailwind `@theme` token block.
//   - src/lib/itxProgramPalette.js: the 7 seeded program hexes are lookup keys for
//     data-driven `programs.color` values, not styling.
//   - src/styles/itxBase.css / src/styles/itWorkspace.css: the type tiers,
//     sizes and shapes are declared here by design; the tier check below allows
//     exactly their sizes and the ALLOW list covers authored control geometry.
//
// Wordmark exception (plan 18 §A2 M1): `.sa-wordmark` keeps 16px ink and the
// 0.35em brand tracking. The brief forbids altering the wordmark asset, so its
// font-size is an allowed departure from the tier table — a decision, not a
// bypass, and it is listed in ALLOW below.
//
// Inline styles: only hard-coded colour/radius/font/shadow declarations are finds.
// Geometry or data values (width, top, height, left, transform) and `var(--token)`
// / computed values (e.g. programColor(...)) are legitimate and pass.
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const SEEDED_FILE = ':seeded-violation:';
const SEEDED = process.argv.includes('--seeded-violation');

// The self-test spawns this file with a seeded violation and asserts exit 1.
if (process.argv.includes('--self-test')) {
  const run = spawnSync(process.execPath, [SELF, '--seeded-violation'], { encoding: 'utf8' });
  if (run.status !== 1) {
    console.error(`self-test FAILED: seeded violation exited ${run.status} (expected 1)\n${run.stdout}${run.stderr}`);
    process.exit(1);
  }
  console.log('OK: self-test — a seeded violation exits 1.');
  process.exit(0);
}

const ROOT = new URL('../', import.meta.url);
const read = (file) => (file === SEEDED_FILE
  ? '// seeded self-test violation\nconst bad = "#123456";\nconst tint = "rgba(1, 2, 3, 0.5)";\n'
  : readFileSync(new URL(file, ROOT), 'utf8'));

// Comments are prose: hide them from the scanner but keep the line count.
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '));

// Every UI file, discovered so a new page/component/style cannot escape the gate.
const UI_DIRS = ['src/pages', 'src/components', 'src/styles'];
const uiFiles = UI_DIRS.flatMap((dir) =>
  readdirSync(new URL(`${dir}/`, ROOT), { recursive: true })
    .map((entry) => `${dir}/${String(entry).replaceAll('\\', '/')}`)
    .filter((file) => /\.(?:jsx|css)$/.test(file))
    .sort()
    .map((file) => [file.replace(/^src\/(?:pages|components|styles)\//, ''), file]),
);

const FILES = [
  ...(SEEDED ? [['seeded', SEEDED_FILE]] : []),
  ...uiFiles,
  ['App', 'src/App.jsx'],
  ['main', 'src/main.jsx'],
  ['index.css', 'src/index.css'],
  ['itxProgramPalette', 'src/lib/itxProgramPalette.js'],
];

const OLD_HEX = '0B0B0B|1B1C1E|232427|2F2E29|222325|37383C|3D3E40|4A4A4C|CBC8C3|BCB8AF|A8A7AC|C47A6E|8FA58B|C3B090|CEBEA4|C6BFAF|BEAA8F|C7B7A0|413D34|D9DADE|3C3D3F';
const SAT_HEX = '8B5CF6|0EA5E9|F59E0B|6366F1|A78BFA|06B6D4|FBBF24';

const RULES = [
  ['banned-hex', new RegExp(`#(?:${OLD_HEX})\\b`, 'gi'), 'old Atelier hex outside itxTokens.css'],
  ['gold-literal', /#(?:856730|A28C62)\b/gi, 'gold/accent literal outside itxTokens.css'],
  ['chart-hex', new RegExp(`#(?:${SAT_HEX})\\b`, 'gi'), 'saturated program/chart hex'],
  ['hex-literal', /#[0-9a-f]{3,8}\b/gi, 'any hex literal outside the token blocks'],
  ['colour-fn', /\b(?:rgba?|hsla?|color-mix)\(/gi, 'computed colour literal outside the token blocks'],
  ['saturated-utility', /\b(?:bg|text|border|divide|from|to|via|ring|fill|stroke|decoration|outline)-(?:violet|sky|amber|emerald|rose|red|blue|green|indigo|fuchsia|cyan|lime|orange|teal|purple|pink)-\d{2,3}\b/g, 'saturated Tailwind palette'],
  ['radius-zero', /\brounded-none\b|\brounded-\[0|(?<![-\w])(?:border-)?radius:\s*0(?:px)?\b/g, 'squared corner on a card/control'],
  ['shadow', /\bshadow-(?:sm|xl)\b/g, 'elevation utility outside tokens'],
  ['gradient-blur', /\bgradient\b|backdrop-blur|\bblur\(/g, 'gradient/blur'],
  ['black-white-utility', /\bbg-black(?:\/\d+)?\b|\bbg-white\/\d+/g, 'black/translucent-white utility'],
  ['white-as-text', /\btext-white\b|color:\s*(?:#fff(?:fff)?|white)\b/gi, '#FFFFFF used as text (text is --ink-*)'],
  ['rgba-black', /rgba\(\s*0\s*,\s*0\s*,\s*0/g, 'rgba(0,0,0 …)'],
  ['font-weight', /\bfont-(?:light|300|semibold|bold)\b|font-weight:\s*(?:300|[6-9]00)\b|fontWeight:\s*(?:300|[6-9]00)\b/g, 'weight 300 / 600+'],
  ['tracking', /\btracking-(?:wide|wider|widest)\b|tracking-\[0\.(?:1[5-9]|[2-9])|letter-spacing:\s*0\.1[5-9]|letter-spacing:\s*0\.[2-9]/g, 'letter-spacing > 0.14em'],
  ['uppercase', /\buppercase\b|text-transform:\s*uppercase/g, 'uppercase off the micro/button tier'],
  ['disabled-opacity', /\bopacity-(?:30|40|50|60)\b|opacity:\s*0\.(?:3|4|5|6)\b/g, 'legacy disabled opacity (token rule is 45%)'],
  ['divide-x', /\bdivide-x\b/g, 'vertical divide rule'],
  ['divide-y', /\bdivide-y\b/g, 'horizontal divide rule'],
  ['sa-rule-b', /\bsa-rule-b\b/g, 'legacy header rule'],
  ['sa-list', /\bsa-list\b/g, 'list hairline wrapper'],
  ['btn-44', null, 'sa-btn still carries min-h-11 (36px tier)'],
  // Plan 20 additions. `min-h-11-bare` guards the 36px button tier without
  // misreading the documented 44px rows (ALLOW below). `motion` reads JS motion
  // props (scale/x/y, spring) and transition durations over 200ms; a 140ms
  // colour transition is the house standard and passes. `bare-bg-white` is the
  // untokenised surface; `opacity-75` is a half state. Radius 0 produced by the
  // Atelier `*` reset is not source-checkable — see RADIUS_SELECTOR.
  ['min-h-11-bare', /\bmin-h-11\b/g, 'min-h-11 without the sa-btn tier (rows only, on purpose)'],
  ['sa-gold-alias', /--sa-gold(?:-light|-line)?\b/g, 'legacy --sa-gold alias in scope (--accent / --accent-soft)'],
  ['strong-weight', /<strong\b/g, 'UA 700 <strong> (emphasis is weight 500)'],
  ['motion', /\btype:\s*['"](?:spring|inertia)['"]|\bscale:\s*-?[\d.]+|\by:\s*-?[\d.]+|\bx:\s*-?[\d.]+|duration-(?:2[1-9]\d|[3-9]\d\d|\d{4,})\b|duration:\s*(?:0?\.(?:2[1-9]|[3-9]\d*)|[1-9]\d*(?:\.\d+)?)\b/g, 'transform/spring motion or a transition over 200ms'],
  ['bare-bg-white', /\bbg-white(?!\/)/g, 'bare bg-white (surfaces are --surface)'],
  ['opacity-75', /\bopacity-75\b/g, 'opacity-75 (no half states)'],
];

// The four ITX type tiers that are legal in page/copy CSS and utilities.
// Figures may exceed them only through a documented data-figure class
// (`sa-kpi-value`) or an explicit ALLOW (SchedulerConsole metric, avatar glyph).
const TIER_SIZES = new Set([11, 11.5, 12, 12.5, 13, 14, 15, 17]);
const NAMED_TEXT_PX = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24,
  '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128,
};
const TEXT_SIZE_RE = /\btext-\[(\d+(?:\.\d+)?)px\]|\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/g;
const CSS_FONT_SIZE_RE = /font-size:\s*(\d+(?:\.\d+)?)px/g;
// Documented figure exceptions: KPI values and the profile avatar glyph.
const DATA_FIGURE = /(?:sa-kpi-value|itx-avatar)/;

function offTierFontSizes(line, isCss) {
  const hits = [];
  if (isCss) {
    for (const m of line.matchAll(CSS_FONT_SIZE_RE)) {
      if (!TIER_SIZES.has(Number(m[1]))) hits.push(m[0]);
    }
    return hits;
  }
  for (const m of line.matchAll(TEXT_SIZE_RE)) {
    const size = m[1] ? Number(m[1]) : NAMED_TEXT_PX[m[2]];
    if (!TIER_SIZES.has(size)) hits.push(m[0]);
  }
  return hits;
}

// CSS selectors that own the squared-corner rule. A `border-radius: 0` elsewhere
// (e.g. flush-left nav rows under the accent bar) is not a card/control corner.
// A computed radius of 0 cannot be source-checked: the Atelier reset
// (.sa-theme * { border-radius: 0 }) squares every node unless a scoped rule
// re-grants a shape. The runtime capture (computed radius census) is the only
// proof of ITX radii; this rule catches authored square corners only.
const RADIUS_SELECTOR = /(?:sa-panel|sa-kpi|itx-card|sa-btn|sa-input|itx-tab|sa-badge|itx-modal|itx-menu|itx-search-panel|\binput\b|\bselect\b|\btextarea\b|\bbutton\b)/i;
const UPPERCASE_SELECTOR = /(?:itx-eyebrow|sa-micro|sa-label|sa-btn|sa-link|micro|button|nav p|thead)/i;
const UPPERCASE_LINE = /(?:itx-eyebrow|sa-micro|sa-label|sa-btn|text-\[11(?:\.5)?px\])/;

// Non-ITX branches kept verbatim for frozen roles/routes. `contains` must be an
// exact substring of the offending line, so a regression on that line still fails.
// There is no file-wide entry: each 44px row/field is pinned to its own line.
const ALLOW = [
  // Brand assets and the 44px touch row: decisions, not bypasses.
  { file: 'src/components/Layout.jsx', rule: 'font-weight', contains: 'sa-wordmark', why: 'wordmark: 16px/500 lockup + 0.35em tracking is the brand asset' },
  { file: 'src/components/Layout.jsx', rule: 'font-size-tier', contains: 'sa-wordmark', why: 'brand wordmark: 16px lockup is the asset, not copy (brief forbids altering it)' },
  { file: 'src/styles/superadminTheme.css', rule: 'font-size-tier', contains: 'font-size: 16px', why: 'brand wordmark: 16px lockup, not copy (brief forbids altering the asset)' },
  { file: 'src/styles/superadminTheme.css', rule: 'tracking', contains: 'letter-spacing: 0.35em', why: 'brand wordmark: the lockup tracking is the asset' },
  { file: 'src/styles/superadminTheme.css', rule: 'uppercase', contains: 'text-transform: uppercase', why: 'brand wordmark: the lockup is uppercase by design' },
  { file: 'src/styles/superadminTheme.css', rule: 'font-weight', contains: ':where(.font-semibold, .font-bold)', why: 'the neutraliser itself: it pins the legacy 600/700 utilities to 500' },
  { file: 'src/components/Layout.jsx', rule: 'font-weight', contains: 'block font-semibold', why: 'mobile wordmark, same rule' },
  { file: 'src/components/Layout.jsx', rule: 'font-weight', contains: 'rounded-full', why: 'unread count; weight pinned in itWorkspace.css' },
  { file: 'src/components/Layout.jsx', rule: 'font-weight', contains: 'itx-profile-name', why: 'weight pinned by .itx-profile-name' },
  { file: 'src/components/Layout.jsx', rule: 'bare-bg-white', contains: 'overflow-hidden bg-white shrink-0', why: 'brand crown tile: the JPG asset is white-backed, not a surface' },
  { file: 'src/components/Layout.jsx', rule: 'min-h-11-bare', contains: 'min-h-11 lg:min-h-0', why: 'nav row: 44px touch target on phone/tablet only' },

  // Documented figure/geometry exemptions, one pin per distinct line.
  { file: 'src/pages/admin/SchedulerConsole.jsx', rule: 'font-size-tier', contains: 'text-2xl', why: 'metric figure (24px): documented data-figure exemption' },
  { file: 'src/components/AiSchedulingPanel.jsx', rule: 'min-h-11-bare', contains: 'min-h-11 w-full border', why: '44px field' },
  { file: 'src/components/AiSchedulingPanel.jsx', rule: 'min-h-11-bare', contains: 'flex min-h-11 cursor-pointer items-center gap-3', why: '44px option row' },
  { file: 'src/components/ScheduleImportWizard.jsx', rule: 'min-h-11-bare', contains: 'min-h-11 w-full items-center gap-2', why: '44px field' },
  { file: 'src/components/ScheduleImportWizard.jsx', rule: 'min-h-11-bare', contains: 'min-h-11 border px-3 text-xs', why: '44px step tab' },
  { file: 'src/components/ScheduleImportWizard.jsx', rule: 'min-h-11-bare', contains: 'flex min-h-11 cursor-pointer items-start gap-3 bg-[var(--surface-sunken)]', why: '44px checkbox row' },
  { file: 'src/pages/admin/UserManagement.jsx', rule: 'min-h-11-bare', contains: 'min-h-11 whitespace-nowrap border px-0.5', why: '44px segmented tab' },
  { file: 'src/pages/admin/UserManagement.jsx', rule: 'min-h-11-bare', contains: 'w-full flex min-h-11 items-center gap-2.5 px-3 py-2 text-[13px]', why: '44px action-menu rows' },
  { file: 'src/pages/admin/HealthPage.jsx', rule: 'min-h-11-bare', contains: 'flex min-h-11 items-center justify-between gap-3', why: '44px metric rows' },
  { file: 'src/pages/admin/ReportsPage.jsx', rule: 'min-h-11-bare', contains: 'min-h-11 grid-cols-[minmax(0,1fr)_auto]', why: '44px metric row' },
  { file: 'src/pages/admin/AiProviderPage.jsx', rule: 'min-h-11-bare', contains: 'flex min-h-11 cursor-pointer items-start gap-3', why: '44px checkbox rows' },
  { file: 'src/pages/admin/AiProviderPage.jsx', rule: 'min-h-11-bare', contains: 'flex min-h-11 cursor-pointer items-center gap-2', why: '44px disclosure summary' },
  { file: 'src/pages/admin/PlannerPage.jsx', rule: 'min-h-11-bare', contains: 'relative flex min-h-11 flex-col', why: '44px day cell' },
  { file: 'src/pages/admin/PlannerPage.jsx', rule: 'min-h-11-bare', contains: 'flex min-h-11 cursor-pointer items-center justify-between gap-3', why: '44px disclosure summary' },
  { file: 'src/pages/assistant/AssistantPage.jsx', rule: 'min-h-11-bare', contains: 'flex min-h-11 items-center gap-1 rounded-full', why: '44px chat chip' },
  { file: 'src/pages/assistant/AssistantPage.jsx', rule: 'min-h-11-bare', contains: 'flex min-h-11 items-center gap-2 py-2', why: '44px thread toolbar' },
  { file: 'src/pages/assistant/AssistantPage.jsx', rule: 'min-h-11-bare', contains: 'sa-link min-h-11 text-[12px]', why: '44px retry link' },
  { file: 'src/pages/assistant/AssistantPage.jsx', rule: 'min-h-11-bare', contains: 'flex min-h-11 min-w-0 max-w-full', why: '44px thread row' },
  { file: 'src/pages/assistant/AssistantPage.jsx', rule: 'min-h-11-bare', contains: 'sa-link mt-2 min-h-11 py-1', why: '44px text link' },
  { file: 'src/pages/assistant/AssistantPage.jsx', rule: 'min-h-11-bare', contains: 'itx-chip-btn min-h-11', why: '44px chat chip' },
  { file: 'src/pages/assistant/AssistantPage.jsx', rule: 'min-h-11-bare', contains: 'sa-link mt-1 min-h-11 py-1', why: '44px text link' },

  // Copy that names a policy, not a styling utility.
  { file: 'src/pages/FAQ.jsx', rule: 'uppercase', contains: 'one uppercase letter', why: 'password-policy copy, not a class' },

  // Rules that own a value the scanner reads as a finding.
  { file: 'src/pages/Settings.jsx', rule: 'strong-weight', contains: '<strong>Data Collection', why: 'UA 700 neutralised by the scoped `.itx-scope strong` rule (weight 500) in itxBase.css' },
  { file: 'src/pages/Settings.jsx', rule: 'strong-weight', contains: '<strong>Row-Level Security', why: 'same scoped weight-500 rule' },
  { file: 'src/pages/Settings.jsx', rule: 'strong-weight', contains: '<strong>Zero-Sale Policy', why: 'same scoped weight-500 rule' },
  { file: 'src/pages/Settings.jsx', rule: 'strong-weight', contains: '<strong>Usage', why: 'same scoped weight-500 rule' },
  { file: 'src/pages/Settings.jsx', rule: 'strong-weight', contains: '<strong>Accountability', why: 'same scoped weight-500 rule' },
  { file: 'src/pages/Settings.jsx', rule: 'strong-weight', contains: '<strong>Data Availability', why: 'same scoped weight-500 rule' },
];

const PALETTE_HEX = new Set(['saturated-utility', 'chart-hex']);
// The known hexes are reported by their own rule; the generic rule only adds
// colours that would otherwise slip through.
const KNOWN_HEX = new RegExp(`#(?:${OLD_HEX}|${SAT_HEX}|856730|A28C62)\\b`, 'i');

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

// [startLine, endLine] (1-based, inclusive) of a CSS block, comments not stripped.
function blockLines(source, selector) {
  const match = new RegExp(`^${selector}[^{]*\\{`, 'm').exec(source);
  if (!match) throw new Error(`token block not found: ${selector}`);
  let depth = 1;
  let i = source.indexOf('{', match.index) + 1;
  const start = i;
  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') depth -= 1;
    i += 1;
  }
  if (depth !== 0) throw new Error(`unbalanced braces: ${selector}`);
  return [lineOf(source, start), lineOf(source, i - 1)];
}

function cssSelectorAt(lines, index) {
  for (let i = index; i >= Math.max(0, index - 10); i -= 1) {
    const text = lines[i].trim();
    if (text.endsWith('{')) {
      let selector = text.slice(0, -1).trim();
      for (let j = i - 1; j >= Math.max(0, i - 6); j -= 1) {
        const prev = lines[j].trim();
        if (!prev || /[{};]/.test(prev)) break;
        selector = `${prev} ${selector}`;
      }
      return selector;
    }
  }
  return '';
}

// Literal declarations for styling props. `var(--x)` and template values with
// `${...}` are token/dynamic and pass; geometry props are not in the list.
function inlineStyleFinds(text) {
  const re = /(?:^|[\s,{])(color|background|backgroundColor|borderColor|borderLeftColor|borderTopColor|borderRadius|fontSize|fontFamily|boxShadow)\s*:\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`|(-?\d+(?:\.\d+)?))/g;
  const hits = [];
  for (const m of text.matchAll(re)) {
    const value = m[2] ?? m[3] ?? m[4] ?? m[5] ?? '';
    if (String(value).includes('var(') || String(value).includes('${')) continue;
    if (['inherit', 'none', 'transparent', 'currentColor'].includes(String(value))) continue;
    hits.push({ text: m[0].trim() });
  }
  return hits;
}

const tokens = read('src/styles/itxTokens.css');
const LIGHT = blockLines(tokens, 'html\\.sa-theme \\.itx-scope');
const DARK = blockLines(tokens, 'html\\.dark \\.sa-theme \\.itx-scope,');

// Token blocks are the only legal value sites: hex/colour literals inside them
// are declarations, not page styling.
const LEGAL_BLOCKS = new Map([
  ['src/styles/itxTokens.css', [LIGHT, DARK]],
  [
    'src/styles/superadminTheme.css',
    [blockLines(read('src/styles/superadminTheme.css'), '\\.sa-theme'), blockLines(read('src/styles/superadminTheme.css'), 'html\\.sa-theme:not\\(\\.dark\\),')],
  ],
  ['src/index.css', [blockLines(read('src/index.css'), '@theme')]],
]);
const VALUE_RULES = new Set(['banned-hex', 'gold-literal', 'chart-hex', 'white-as-text', 'hex-literal', 'colour-fn']);

const findings = [];
let scanned = 0;

for (const [, file] of FILES) {
  const source = read(file);
  const allLines = stripComments(source).split(/\r?\n/);
  const regions = [[0, allLines.length - 1]];

  const isCss = file.endsWith('.css');
  const isJsx = file.endsWith('.jsx');

  scanned += regions.reduce((sum, [start, end]) => sum + end - start + 1, 0);
  const lines = regions.flatMap(([start, end]) => Array.from({ length: end - start + 1 }, (_, k) => start + k));

  for (const i of lines) {
    const line = allLines[i];
    const lineNo = i + 1;
    const inTokenBlock = (LEGAL_BLOCKS.get(file) || []).some(([a, b]) => lineNo >= a && lineNo <= b);
    const selector = isCss ? cssSelectorAt(allLines, i) : '';

    for (const [id, regex, why] of RULES) {
      if (regex) {
        regex.lastIndex = 0;
        if (!regex.test(line)) continue;
      }
      if (id === 'btn-44' && !(/\bsa-btn\b/.test(line) && /\bmin-h-11\b|\bh-11\b/.test(line))) continue;
      if (id === 'min-h-11-bare' && /\bsa-btn\b/.test(line)) continue;
      if (id === 'sa-list' && !isJsx && file !== 'src/styles/itWorkspace.css') continue;
      if (id === 'sa-gold-alias' && (inTokenBlock || file === 'src/styles/itxTokens.css')) continue;
      // A <strong> whose own weight is pinned in source is already 500.
      if (id === 'strong-weight' && /<strong[^>]*font-(?:medium|normal|[1-5]00)/.test(line)) continue;
      if (inTokenBlock && VALUE_RULES.has(id)) continue;
      if (id === 'hex-literal') {
        const fresh = [...line.matchAll(/#[0-9a-f]{3,8}\b/gi)].filter((m) => !KNOWN_HEX.test(m[0]));
        if (fresh.length === 0) continue;
      }
      if (file === 'src/lib/itxProgramPalette.js' && (PALETTE_HEX.has(id) || id === 'hex-literal')) continue;
      if (id === 'radius-zero' && isCss && !RADIUS_SELECTOR.test(selector)) continue;
      if (id === 'uppercase' && (isCss ? UPPERCASE_SELECTOR : UPPERCASE_LINE).test(isCss ? selector : line)) continue;
      if (ALLOW.some((a) => a.file === file && a.rule === id && (a.contains === undefined || line.includes(a.contains)))) continue;
      findings.push({ file, line: lineNo, rule: id, why, text: line.trim().slice(0, 160) });
    }

    // Font sizes: the tier table is the only scale for copy. Documented
    // figures (`sa-kpi-value`, `.itx-avatar`) may exceed it by class; the
    // SchedulerConsole metric is a named ALLOW below.
    if (!DATA_FIGURE.test(isCss ? selector : line)) {
      for (const hit of offTierFontSizes(line, isCss)) {
        if (ALLOW.some((a) => a.file === file && a.rule === 'font-size-tier' && line.includes(a.contains))) continue;
        findings.push({ file, line: lineNo, rule: 'font-size-tier', why: 'font size off the 11–17 tier table', text: hit.slice(0, 160) });
      }
    }

    for (const hit of inlineStyleFinds(line)) {
      findings.push({ file, line: lineNo, rule: 'inline-style', why: 'hard-coded inline colour/radius/font/shadow', text: hit.text.slice(0, 160) });
    }
  }
}

const byRule = new Map();
for (const f of findings) byRule.set(f.rule, (byRule.get(f.rule) || 0) + 1);

if (findings.length) {
  for (const f of findings) console.log(`${f.file}:${f.line}  [${f.rule}]  ${f.why}\n    ${f.text}`);
  console.log(`\n${findings.length} find(s): ${[...byRule].map(([rule, n]) => `${rule}=${n}`).join(', ')}`);
  process.exit(1);
}

console.log(`OK: ${FILES.length} ITX files, ${scanned} lines, 0 finds.`);
console.log(`tokens: light block lines ${LIGHT[0]}-${LIGHT[1]}, dark block lines ${DARK[0]}-${DARK[1]}`);
console.log(`${ALLOW.length} explicit non-ITX/override allowances (see ALLOW in scripts/audit-itx.mjs).`);

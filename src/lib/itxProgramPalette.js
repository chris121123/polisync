// F28: `programs.color` is seeded data (7 saturated hexes in the migration), so the
// muted ITX series is derived at render time. Fixed order, documented as data order:
// seeded hex -> token. Identity only: no --success/--danger, a dot must not read as status.
//   #6366F1 -> --chart-1      #8B5CF6 -> --chart-2      #A78BFA -> --chart-3
//   #0EA5E9 -> --info         #06B6D4 -> --ink-muted    #F59E0B -> --ink-body
//   #FBBF24 -> --line-strong
// Anything outside the seeded set renders neutral (--chart-3).
const PROGRAM_TONES = new Map([
  ['#6366F1', 'var(--chart-1)'],
  ['#8B5CF6', 'var(--chart-2)'],
  ['#A78BFA', 'var(--chart-3)'],
  ['#0EA5E9', 'var(--info)'],
  ['#06B6D4', 'var(--ink-muted)'],
  ['#F59E0B', 'var(--ink-body)'],
  ['#FBBF24', 'var(--line-strong)'],
]);

export const programTone = (color) => (
  PROGRAM_TONES.get(String(color ?? '').trim().toUpperCase()) ?? 'var(--chart-3)'
);

// Golden fixtures captured from src/lib/scheduler.js before the move (see _source inside
// tests/fixtures/scheduler.json). They must stay green through every later step; S1 only repoints
// this import at the new modules and the fixture JSON must not change.
//
// localSmartSchedule determinism branch: BYTE-IDENTICAL. stats.elapsed is deleted (it comes from
// Date.now()), then 20 runs produce identical JSON, so the fixture asserts the whole output.
//
// findAllConflicts (the provider's conflict useMemo) is NOT captured here: it is inline in a
// component and needs a renderer. Its cases are hand-written in S1 from the documented output
// shape, and the live conflict badge is the check for it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// lib/supabase.js reads import.meta.env at module scope: undefined under Node, so it logs the
// missing-credentials error. Expected noise, silenced only around the import.
const [logError, logInfo] = [console.error, console.info];
console.error = () => {};
console.info = () => {};
const { detectConflicts, scoreSchedule, localSmartSchedule } = await import('../../src/lib/scheduler.js');
console.error = logError;
console.info = logInfo;

const fixture = JSON.parse(readFileSync(new URL('../fixtures/scheduler.json', import.meta.url), 'utf8'));

const normalize = (value) => JSON.parse(JSON.stringify(value));

for (const { name, newSession, existingSessions, expected } of fixture.conflicts.cases) {
  test(`detectConflicts — ${name}`, () => {
    assert.deepEqual(normalize(detectConflicts(newSession, existingSessions)), expected);
  });
}

for (const { name, assignments, unscheduledCount, expected } of fixture.score.cases) {
  test(`scoreSchedule — ${name}`, () => {
    assert.equal(scoreSchedule(assignments, unscheduledCount), expected);
  });
}

const { input, expected } = fixture.localSchedule;

test('localSmartSchedule — matches golden output', () => {
  const result = localSmartSchedule(input);
  delete result.stats.elapsed;
  assert.deepEqual(normalize(result), expected);
});

test('localSmartSchedule — 20 runs produce identical output', () => {
  const run = () => {
    const result = localSmartSchedule(input);
    delete result.stats.elapsed;
    return JSON.stringify(result);
  };

  const first = run();
  for (let i = 1; i < fixture.localSchedule.determinism.runs; i++) {
    assert.equal(run(), first);
  }
});
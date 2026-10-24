// Golden fixtures captured from src/lib/scheduler.js before the move (see _source inside
// tests/fixtures/scheduler.json). They must stay green through every later step; S1 only repoints
// this import at the new modules and the fixture JSON must not change.
//
// localSmartSchedule determinism branch: BYTE-IDENTICAL. stats.elapsed is deleted (it comes from
// Date.now()), then 20 runs produce identical JSON, so the fixture asserts the whole output.
//
// findAllConflicts (the provider's conflict useMemo) is NOT captured in the fixture: it was inline
// in a component and needs a renderer. Its cases below are hand-written from the memo's documented
// output shape, and the live conflict badge is the check for it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { findAllConflicts } from '../../src/lib/scheduling/conflicts.js';
import { scoreSchedule } from '../../src/lib/scheduling/scoring.js';
import { localSmartSchedule } from '../../src/lib/scheduling/engine.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/scheduler.json', import.meta.url), 'utf8'));

const normalize = (value) => JSON.parse(JSON.stringify(value));

const findAllCases = [
  {
    name: 'therapist-only clash',
    sessions: [
      { id: 'a', therapistId: 't1', room: 'Room A', startHour: 9, span: 1 },
      { id: 'b', therapistId: 't1', room: 'Room B', startHour: 9.5, span: 1 },
    ],
    expected: [
      { type: 'therapist', sessionIds: ['a', 'b'], therapistId: 't1', startHour: 9.5 },
    ],
  },
  {
    name: 'room-only clash',
    sessions: [
      { id: 'a', therapistId: 't1', room: 'Room A', startHour: 9, span: 1 },
      { id: 'b', therapistId: 't2', room: 'Room A', startHour: 9, span: 1 },
    ],
    expected: [
      { type: 'room', sessionIds: ['a', 'b'], room: 'Room A', startHour: 9 },
    ],
  },
  {
    name: 'therapist and room clash',
    sessions: [
      { id: 'a', therapistId: 't1', room: 'Room A', startHour: 9, span: 2 },
      { id: 'b', therapistId: 't1', room: 'Room A', startHour: 10, span: 1 },
    ],
    expected: [
      { type: 'therapist', sessionIds: ['a', 'b'], therapistId: 't1', startHour: 10 },
      { type: 'room', sessionIds: ['a', 'b'], room: 'Room A', startHour: 10 },
    ],
  },
  {
    name: 'adjacent but not overlapping',
    sessions: [
      { id: 'a', therapistId: 't1', room: 'Room A', startHour: 9, span: 1 },
      { id: 'b', therapistId: 't1', room: 'Room A', startHour: 10, span: 1 },
    ],
    expected: [],
  },
  {
    name: 'three-way overlap keeps pair order',
    sessions: [
      { id: 'a', therapistId: 't1', room: 'Room A', startHour: 9, span: 2 },
      { id: 'b', therapistId: 't1', room: 'Room A', startHour: 10, span: 1 },
      { id: 'c', therapistId: 't1', room: 'Room B', startHour: 10.5, span: 1 },
    ],
    expected: [
      { type: 'therapist', sessionIds: ['a', 'b'], therapistId: 't1', startHour: 10 },
      { type: 'room', sessionIds: ['a', 'b'], room: 'Room A', startHour: 10 },
      { type: 'therapist', sessionIds: ['a', 'c'], therapistId: 't1', startHour: 10.5 },
      { type: 'therapist', sessionIds: ['b', 'c'], therapistId: 't1', startHour: 10.5 },
    ],
  },
  {
    name: 'empty input',
    sessions: [],
    expected: [],
  },
];

for (const { name, sessions, expected } of findAllCases) {
  test(`findAllConflicts — ${name}`, () => {
    assert.deepEqual(normalize(findAllConflicts(sessions)), expected);
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

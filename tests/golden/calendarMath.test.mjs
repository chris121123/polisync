// Golden tests for the pure calendar helpers extracted from ScheduleCalendar (B1).
// Dates are built from local components so the assertions do not depend on the machine timezone.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatHour, getSessionDay, formatDateISO, getWeekStart, weekDatesFor,
  filterSessionsForView, groupSessionsByDay, slotHasConflict,
} from '../../src/pages/ScheduleCalendar/calendarMath.js';

test('formatHour', () => {
  assert.equal(formatHour(8), '8:00 AM');
  assert.equal(formatHour(12), '12:00 PM');
  assert.equal(formatHour(13), '1:00 PM');
  assert.equal(formatHour(17), '5:00 PM');
});

test('getSessionDay is the id modulo 5', () => {
  assert.equal(getSessionDay({ id: 1 }), 1);
  assert.equal(getSessionDay({ id: 5 }), 0);
  assert.equal(getSessionDay({ id: 7 }), 2);
  // String ids keep JS % semantics: '7' % 5 is 2, a non-numeric id is NaN.
  assert.equal(getSessionDay({ id: '7' }), 2);
  assert.ok(Number.isNaN(getSessionDay({ id: 'abc' })));
});

test('formatDateISO', () => {
  assert.equal(formatDateISO(new Date(2026, 9, 21)), '2026-10-21');
  assert.equal(formatDateISO(new Date(2026, 0, 5)), '2026-01-05');
});

test('getWeekStart returns the Monday of the week', () => {
  // Wed 21, Sat 24 and Sun 25 Oct 2026 all belong to the week starting Mon 19 Oct 2026.
  assert.equal(formatDateISO(getWeekStart(new Date(2026, 9, 21))), '2026-10-19');
  assert.equal(formatDateISO(getWeekStart(new Date(2026, 9, 24))), '2026-10-19');
  assert.equal(formatDateISO(getWeekStart(new Date(2026, 9, 25))), '2026-10-19');
  assert.equal(formatDateISO(getWeekStart(new Date(2026, 9, 19))), '2026-10-19');
});

test('weekDatesFor returns Monday to Friday', () => {
  const week = weekDatesFor(new Date(2026, 9, 19, 7, 30));
  assert.equal(week.length, 5);
  assert.deepEqual(week.map(formatDateISO), [
    '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23',
  ]);
  // The time of day of the week start is preserved.
  assert.equal(week[4].getHours(), 7);
});

// id 1 has a sessionDate, 3/4/6 a dayOfWeek, 2 another sessionDate, 5 no date at all.
const SESSIONS = [
  { id: 1, type: 'sped', sessionDate: '2026-10-21' },
  { id: 2, type: 'rehab', sessionDate: '2026-10-20' },
  { id: 3, type: 'sped', dayOfWeek: 2 },
  { id: 4, type: 'rehab', dayOfWeek: 4 },
  { id: 5, type: 'playschool' },
  { id: 6, type: 'sped', dayOfWeek: null },
];

const idsOf = (sessions) => sessions.map(s => s.id);

test('filterSessionsForView daily keeps the selected date and legacy rows', () => {
  const filtered = filterSessionsForView({
    sessions: SESSIONS,
    filterType: 'all',
    calendarView: 'daily',
    selectedDateISO: '2026-10-21',
    selectedDayOfWeek: 2,
  });
  // 1 matches the date, 3 matches dayOfWeek 2, 5 and 6 have no usable day.
  assert.deepEqual(idsOf(filtered), [1, 3, 5, 6]);
});

test('filterSessionsForView weekly ignores the selected date', () => {
  const filtered = filterSessionsForView({
    sessions: SESSIONS,
    filterType: 'all',
    calendarView: 'weekly',
    selectedDateISO: '2026-10-21',
    selectedDayOfWeek: 2,
  });
  assert.deepEqual(idsOf(filtered), [1, 2, 3, 4, 5, 6]);
});

test('filterSessionsForView applies the type filter', () => {
  const filtered = filterSessionsForView({
    sessions: SESSIONS,
    filterType: 'rehab',
    calendarView: 'weekly',
    selectedDateISO: '2026-10-21',
    selectedDayOfWeek: 2,
  });
  assert.deepEqual(idsOf(filtered), [2, 4]);
});

test('groupSessionsByDay groups by sessionDate and falls back to id % 5', () => {
  const weekDates = weekDatesFor(new Date(2026, 9, 19));
  const grouped = groupSessionsByDay([
    { id: 10, type: 'sped', sessionDate: '2026-10-21' }, // Wednesday -> index 2
    { id: 2, type: 'sped' },                             // 2 % 5 -> index 2
    { id: 3, type: 'rehab' },                            // 3 % 5 -> index 3
    { id: 4, type: 'rehab', sessionDate: '2026-11-02' }, // outside the week -> dropped
  ], 'all', weekDates);

  assert.equal(grouped.length, 5);
  assert.deepEqual(grouped.map(day => idsOf(day)), [[], [], [10, 2], [3], []]);
});

test('groupSessionsByDay applies the type filter', () => {
  const weekDates = weekDatesFor(new Date(2026, 9, 19));
  const grouped = groupSessionsByDay([
    { id: 10, type: 'sped', sessionDate: '2026-10-21' },
    { id: 3, type: 'rehab' },
  ], 'rehab', weekDates);

  assert.deepEqual(grouped.map(day => idsOf(day)), [[], [], [], [3], []]);
});

const selected = { id: 1, startHour: 9, span: 1, therapistId: 't1', room: 'Room A', sessionDate: '2026-10-21' };

test('slotHasConflict detects a therapist clash', () => {
  const other = { id: 2, startHour: 10, span: 1, therapistId: 't1', room: 'Room B', sessionDate: '2026-10-21' };
  assert.equal(slotHasConflict([selected, other], selected, 10), true);
});

test('slotHasConflict detects a room clash', () => {
  const other = { id: 2, startHour: 10, span: 1, therapistId: 't2', room: 'Room A', sessionDate: '2026-10-21' };
  assert.equal(slotHasConflict([selected, other], selected, 10), true);
});

test('slotHasConflict skips the session itself', () => {
  assert.equal(slotHasConflict([selected], selected, 10), false);
});

test('slotHasConflict ignores other days', () => {
  const other = { id: 2, startHour: 10, span: 1, therapistId: 't1', room: 'Room A', sessionDate: '2026-10-22' };
  assert.equal(slotHasConflict([selected, other], selected, 10), false);
});

test('slotHasConflict is false when nothing overlaps', () => {
  const other = { id: 2, startHour: 14, span: 1, therapistId: 't1', room: 'Room A', sessionDate: '2026-10-21' };
  assert.equal(slotHasConflict([selected, other], selected, 10), false);
});

test('slotHasConflict is true without a selected session', () => {
  assert.equal(slotHasConflict([selected], null, 10), true);
});

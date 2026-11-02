// Golden tests for the pure Year Planner math (13f). Dates are built from local
// components so the assertions do not depend on the machine timezone.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultYearWindow, normalizeYearWindow, monthSpan, weekdayIndex, sessionsOnDate, buildWeek, buildYear, layoutDaySessions,
} from '../../src/lib/visualSchedule.js';
import { groupSessionsByDay, weekDatesFor } from '../../src/pages/ScheduleCalendar/calendarMath.js';

const idsOf = (sessions) => sessions.map((s) => s.id);

// 2026-11-02 is a Monday. Tuesdays are index 1, Wednesdays index 2, Fridays index 4.
const SESSIONS = [
  { id: 1, sessionDate: '2026-11-03' },
  { id: 5, sessionDate: '2026-11-03', isConfirmed: false },
  { id: 3, sessionDate: '2026-11-04' },
  { id: 2 },
  { id: 7 },
  { id: 4 },
];

test('sessionsOnDate: dated sessions match their own date, undated ones id % 5', () => {
  assert.deepEqual(idsOf(sessionsOnDate(SESSIONS, '2026-11-03')), [1, 5]);
  assert.deepEqual(idsOf(sessionsOnDate(SESSIONS, '2026-11-04')), [3, 2, 7]);
  assert.deepEqual(idsOf(sessionsOnDate(SESSIONS, '2026-11-06')), [4]);
  assert.deepEqual(idsOf(sessionsOnDate(SESSIONS, '2026-11-05')), []);
});

test('buildWeek snaps to Monday and mirrors the day calendar grouping exactly', () => {
  const week = buildWeek(SESSIONS, '2026-11-04');
  assert.deepEqual(week.map((d) => d.iso), [
    '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
  ]);
  assert.deepEqual(week.map((d) => d.index), [0, 1, 2, 3, 4]);
  const grouped = groupSessionsByDay(SESSIONS, 'all', weekDatesFor(new Date(2026, 10, 2)));
  assert.deepEqual(week.map((d) => idsOf(d.sessions)), grouped.map(idsOf));
  assert.deepEqual(week.map((d) => idsOf(d.sessions)), [[], [1, 5], [3, 2, 7], [], [4]]);
});

test('buildYear keeps only in-window weekdays of each month', () => {
  const year = buildYear(SESSIONS, '2026-06-01', '2027-03-31');
  const days = year.flatMap((month) => month.days);
  assert.equal(year.length, 10);
  assert.equal(year[0].label, 'Jun 2026');
  assert.equal(year.at(-1).label, 'Mar 2027');
  assert.equal(days.length, 218);
  assert.equal(days[0].iso, '2026-06-01');
  assert.equal(days.at(-1).iso, '2027-03-31');
  assert.ok(days.every((day) => day.index >= 0 && day.index <= 4));
  assert.ok(!days.some((day) => day.iso === '2026-05-29'), 'the Friday before the window is out');
  assert.ok(!days.some((day) => day.iso === '2027-04-01'), 'the Thursday after the window is out');
});

test('a weekly undated session occurs once per matching weekday of the month', () => {
  const june = buildYear([{ id: 3 }], '2026-06-01', '2026-06-30');
  const days = june[0].days;
  assert.equal(days.filter((day) => day.sessions.length === 1).length, 4);
  assert.deepEqual(
    days.filter((day) => day.sessions.length).map((day) => day.iso),
    ['2026-06-04', '2026-06-11', '2026-06-18', '2026-06-25'],
  );
});

test('monthSpan crosses a December into the next January', () => {
  assert.deepEqual(monthSpan('2026-12-01', '2027-01-31').map((m) => m.label), ['Dec 2026', 'Jan 2027']);
  assert.deepEqual(monthSpan('2026-12-15', '2026-12-15').map((m) => m.label), ['Dec 2026']);
  assert.equal(monthSpan('2026-12-01', '2026-11-01').length, 0);
});

test('defaultYearWindow and normalizeYearWindow fall back and order the sides', () => {
  assert.deepEqual(defaultYearWindow(new Date(2027, 4, 15)), { start: '2027-01-01', end: '2027-12-31' });
  assert.deepEqual(normalizeYearWindow('2026-06-01', '2027-03-31'), { start: '2026-06-01', end: '2027-03-31' });
  assert.deepEqual(normalizeYearWindow('2027-03-31', '2026-06-01'), { start: '2026-06-01', end: '2027-03-31' });
  assert.deepEqual(normalizeYearWindow('', null), defaultYearWindow());
  // An impossible date falls back on its own side only.
  assert.deepEqual(normalizeYearWindow('2026-02-31', '2027-03-31'), {
    start: defaultYearWindow().start,
    end: '2027-03-31',
  });
});

test('overlapping sessions get side-by-side lanes, separate clusters restart at lane 0', () => {
  const placed = layoutDaySessions([
    { id: 1, startHour: 10, span: 1 },
    { id: 2, startHour: 10, span: 1.5 },
    { id: 3, startHour: 11, span: 1 },
    { id: 4, startHour: 14, span: 1 },
  ]);
  assert.deepEqual(placed.map((p) => [p.session.id, p.lane, p.lanes]), [
    [1, 0, 2], [2, 1, 2], [3, 0, 2], [4, 0, 1],
  ]);
  assert.deepEqual(layoutDaySessions([]), []);
});

test('the unconfirmed flag survives the expansion, and bad dates never throw', () => {
  const year = buildYear([{ id: 1, sessionDate: '2026-06-02', isConfirmed: false }], '2026-06-01', '2026-06-30');
  const day = year[0].days.find((d) => d.iso === '2026-06-02');
  assert.equal(day.sessions.length, 1);
  assert.equal(day.sessions[0].isConfirmed, false);

  // Weekends are never a day, whatever the session says.
  assert.equal(weekdayIndex('2026-11-07'), null);
  assert.deepEqual(sessionsOnDate([{ id: 1, sessionDate: '2026-11-07' }, { id: 2 }], '2026-11-07'), []);

  assert.deepEqual(sessionsOnDate(undefined, 'nope'), []);
  assert.equal(weekdayIndex('2026-02-31'), null);
  assert.deepEqual(monthSpan(undefined, undefined), []);
  assert.deepEqual(buildYear([], '', ''), []);
  assert.equal(buildWeek([], 'not-a-date').length, 5);
});

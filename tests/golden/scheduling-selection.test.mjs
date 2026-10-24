// Phase E acceptance tests for the auto-scheduler redesign, pinned to the pure local engine
// (src/lib/scheduling/engine.js). The edge function is the reference implementation (SCHED-002),
// so the offline fallback must answer the same contract: only the selected requirements, at most
// one session per requirement per weekday, sessions_per_week spread across Mon-Fri, and an honest
// "quota not fully met" reason instead of a silent over-booking.
//
// Not covered here because they need a live Supabase/Deno runtime: edge auth + CORS, the 422/500
// responses, the unique index actually rejecting a duplicate insert, insert-failure rollback, and
// the Pending tab UI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { localSmartSchedule } from '../../src/lib/scheduling/engine.js';

// 2026-10-21 is a Wednesday, so its anchor week runs Mon 2026-10-19 .. Fri 2026-10-23.
const ANCHOR = '2026-10-21';
const WEEKDAYS = [0, 1, 2, 3, 4];

const pad = (value) => String(value).padStart(2, '0');

// Local date parts only: toISOString() would shift the day on non-UTC machines.
const anchorDate = (dayOfWeek) => {
  const [year, month, day] = ANCHOR.split('-').map(Number);
  const anchor = new Date(year, month - 1, day);
  const monday = new Date(year, month - 1, day - ((anchor.getDay() + 6) % 7));
  const target = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + dayOfWeek);
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
};

const availability = (studentId, days = WEEKDAYS, start = '08:00', end = '17:00') =>
  days.map((dayOfWeek) => ({ student_id: studentId, day_of_week: dayOfWeek, start_time: start, end_time: end }));

// Same shape tests/fixtures/generate.mjs feeds localSmartSchedule.
const requirement = (id, studentId, overrides = {}) => ({
  id,
  student_id: studentId,
  program_id: 11,
  status: 'pending',
  priority: 5,
  preferred_duration_hours: 1,
  assigned_teacher_id: null,
  ...overrides,
});

const buildInput = (overrides = {}) => ({
  studentPrograms: [requirement(101, 1)],
  staff: [
    { id: 201, name: 'Teacher One', app_role: 'teacher', role: 'Teacher', status: 'Active' },
    { id: 202, name: 'Therapist Two', app_role: 'therapist', role: 'Therapist', status: 'Active' },
  ],
  rooms: [
    { id: 'r1', name: 'Room A', maxCapacity: 5 },
    { id: 'r2', name: 'Room B', maxCapacity: 5 },
  ],
  programs: [{ id: 11, name: 'Speech Therapy', type: 'individual', default_duration_hours: 1 }],
  sessions: [],
  studentAvailability: availability(1),
  schedulingSettings: {
    min_break_minutes: 15,
    max_daily_hours_per_student: 4,
    operating_start_time: '08:00',
    operating_end_time: '17:00',
  },
  dayOfWeek: 0,
  ...overrides,
});

const threePending = () => ({
  studentPrograms: [requirement(101, 1), requirement(102, 2), requirement(103, 3)],
  studentAvailability: [...availability(1), ...availability(2), ...availability(3)],
});

const runSelectedSubset = () =>
  localSmartSchedule({
    ...buildInput(threePending()),
    scope: 'whole-week',
    sessionDate: ANCHOR,
    studentProgramIds: [101],
  });

const runThreePerWeek = (studentAvailability = availability(1)) =>
  localSmartSchedule({
    ...buildInput({ studentPrograms: [requirement(101, 1, { sessions_per_week: 3 })], studentAvailability }),
    scope: 'whole-week',
    sessionDate: ANCHOR,
  });

test('localSmartSchedule subset — schedules only the selected requirement', () => {
  const result = runSelectedSubset();

  assert.ok(result.scheduled.length > 0, 'nothing was scheduled, so the isolation check would prove nothing');
  assert.deepEqual([...new Set(result.scheduled.map((a) => a.studentProgramId))], [101]);
});

test('localSmartSchedule subset — unselected requirements appear in neither list', () => {
  const result = runSelectedSubset();
  const touched = [
    ...result.scheduled.map((a) => a.studentProgramId),
    ...result.unscheduled.map((u) => u.studentProgramId),
  ];

  for (const id of [102, 103]) {
    assert.ok(!touched.includes(id), `requirement ${id} was touched: ${JSON.stringify(result)}`);
  }
});

test('localSmartSchedule whole-week — books sessions_per_week on distinct weekdays', () => {
  const result = runThreePerWeek();
  const booked = result.scheduled.filter((a) => a.studentProgramId === 101);

  assert.equal(booked.length, 3, `expected 3 sessions, got ${JSON.stringify(booked)}`);

  const days = new Set(booked.map((a) => a.dayOfWeek));
  assert.equal(days.size, 3, `expected 3 distinct weekdays, got ${JSON.stringify([...days])}`);
  for (const day of days) {
    assert.ok(day >= 0 && day <= 4, `dayOfWeek ${day} is outside Mon-Fri`);
  }

  assert.deepEqual(result.unscheduled, [], 'a met quota must leave nothing unscheduled');
});

test('localSmartSchedule whole-week — sessionDate follows the anchor week', () => {
  // Guard the expectation itself: a wrong anchor would make the loop below tautological.
  assert.equal(anchorDate(0), '2026-10-19', `${ANCHOR} must resolve to Monday 2026-10-19`);

  const result = runThreePerWeek();
  for (const assignment of result.scheduled) {
    const expected = anchorDate(assignment.dayOfWeek);
    assert.equal(
      assignment.sessionDate,
      expected,
      `day ${assignment.dayOfWeek}: expected ${expected}, got ${assignment.sessionDate}`
    );
  }
});

test('localSmartSchedule whole-week — two available weekdays book 2 of 3', () => {
  const result = runThreePerWeek(availability(1, [0, 1]));
  const booked = result.scheduled.filter((a) => a.studentProgramId === 101);

  assert.equal(booked.length, 2, `expected 2 sessions (Mon+Tue only), got ${JSON.stringify(booked)}`);
});

test('localSmartSchedule whole-week — partial quota reports Weekly quota not fully met (2/3)', () => {
  const result = runThreePerWeek(availability(1, [0, 1]));
  const entry = result.unscheduled.find((u) => u.studentProgramId === 101);

  assert.ok(entry, `expected an unscheduled entry for 101, got ${JSON.stringify(result.unscheduled)}`);
  assert.ok(
    entry.reason.includes('Weekly quota not fully met (2/3)'),
    `expected reason "Weekly quota not fully met (2/3)", got "${entry.reason}"`
  );
});

test('localSmartSchedule whole-week — a requirement already at quota is not re-booked', () => {
  const sessions = [0, 1, 2].map((dayOfWeek) => ({
    id: 900 + dayOfWeek,
    studentProgramId: 101,
    student_id: 1,
    programId: 11,
    dayOfWeek,
    startHour: 9,
    span: 1,
    therapistId: 201,
    room: 'Room A',
    studentIds: [1],
  }));

  const result = localSmartSchedule({
    ...buildInput({ studentPrograms: [requirement(101, 1, { sessions_per_week: 3 })], sessions }),
    scope: 'whole-week',
    sessionDate: ANCHOR,
  });

  assert.deepEqual(result.alreadyScheduled, [101]);
  assert.equal(
    result.scheduled.filter((a) => a.studentProgramId === 101).length,
    0,
    'requirement was re-booked'
  );
});

test('localSmartSchedule selected-day — keeps the requested day and date', () => {
  const result = localSmartSchedule({
    ...buildInput(),
    scope: 'selected-day',
    dayOfWeek: 2,
    sessionDate: '2026-10-21',
  });

  assert.ok(result.scheduled.length > 0, 'nothing was scheduled, so the shape check would prove nothing');
  for (const assignment of result.scheduled) {
    assert.equal(assignment.dayOfWeek, 2);
    assert.equal(assignment.sessionDate, '2026-10-21');
  }
});

test('localSmartSchedule selected-day — sessionDate is null when the caller omits it', () => {
  const result = localSmartSchedule({ ...buildInput(), scope: 'selected-day', dayOfWeek: 2 });

  assert.ok(result.scheduled.length > 0, 'nothing was scheduled, so the shape check would prove nothing');
  for (const assignment of result.scheduled) {
    assert.equal(assignment.sessionDate, null);
  }
});

test('localSmartSchedule — two identical whole-week runs produce identical output', () => {
  const run = () => {
    const result = runThreePerWeek();
    delete result.stats.elapsed; // Date.now()-derived, can never match
    return JSON.stringify(result);
  };

  assert.equal(run(), run());
});

test('localSmartSchedule — a legacy session with no dayOfWeek blocks its own weekday only', () => {
  // Manual sessions from AddSessionModal: session_date set, day_of_week null.
  const legacy = {
    id: 950,
    therapistId: 201,
    studentIds: [1],
    room: 'Room A',
    startHour: 8,
    span: 9, // 08:00–17:00, so every Tuesday slot collides with student 1
    dayOfWeek: null,
    sessionDate: '2026-10-20', // Tuesday of the ANCHOR week
  };
  const input = buildInput({ sessions: [legacy] });

  const tuesday = localSmartSchedule({
    ...input,
    scope: 'selected-day',
    dayOfWeek: 1,
    sessionDate: '2026-10-20',
  });
  assert.deepEqual(tuesday.scheduled, [], `Tuesday must be blocked, got ${JSON.stringify(tuesday.scheduled)}`);

  const monday = localSmartSchedule({
    ...input,
    scope: 'selected-day',
    dayOfWeek: 0,
    sessionDate: '2026-10-19',
  });
  assert.ok(monday.scheduled.length > 0, `Monday must stay bookable, got ${JSON.stringify(monday)}`);
});

const migration = readFileSync(
  new URL('../../supabase/migrations/20261025000001_sessions_student_program_link.sql', import.meta.url),
  'utf8'
);

test('SCHED-004 migration — adds the link column and the per-day unique index', () => {
  for (const needle of ['student_program_id', 'uniq_sessions_student_program_day', 'IF NOT EXISTS']) {
    assert.ok(migration.includes(needle), `migration is missing "${needle}"`);
  }
});
// Golden tests for the deterministic schedule validator (plan D3, §6.3): the
// gate every AI base plan and daily repair must pass before anything is written.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyRepairActions,
  repairActionCap,
  validateBasePlan,
  validateRepairPlan,
} from '../../supabase/functions/_shared/schedulerValidate.js';

// ─── Fixture: one small school ───────────────────────────────────────────────

const settings = {
  operating_start_time: '08:00',
  operating_end_time: '17:00',
  max_daily_hours_per_student: 4,
  allow_overbook: false,
};

const students = [
  { id: 1, status: 'Enrolled' },
  { id: 2, status: 'Enrolled' },
  { id: 3, status: 'Inactive' },
];

const programs = [
  { id: 10, name: 'OT Therapy', type: 'rehab', is_active: true, requires_certification: ['OT'], default_duration_hours: 1 },
  { id: 11, name: 'Speech', type: 'rehab', is_active: true, requires_certification: [], default_duration_hours: 1 },
];

const staff = [
  { id: 't-1', app_role: 'therapist', is_active: true, certifications: ['OT', 'Speech'] },
  { id: 't-2', app_role: 'therapist', is_active: true, certifications: ['Speech'] },
  { id: 'p-1', app_role: 'parent', is_active: true, certifications: [] },
];

const rooms = [
  { id: 1, name: 'Room A', max_capacity: 1, is_active: true },
  { id: 2, name: 'Room B', max_capacity: 4, is_active: true },
];

const studentPrograms = [
  { id: 100, student_id: 1, program_id: 10, sessions_per_week: 1, status: 'pending' },
  { id: 101, student_id: 2, program_id: 11, sessions_per_week: 2, status: 'pending' },
];

// Student 1 only attends mornings; student 2 has no rows, so any hour fits.
const studentAvailability = [0, 1, 2, 3, 4].map((day) => ({
  student_id: 1,
  day_of_week: day,
  start_time: '08:00',
  end_time: '12:00',
  is_active: true,
}));

const base = (overrides = {}) => ({
  assignments: [],
  existingSessions: [],
  studentPrograms,
  programs,
  staff,
  students,
  rooms,
  studentAvailability,
  settings,
  ...overrides,
});

const assignment = (overrides = {}) => ({
  studentProgramId: 100,
  studentId: 1,
  programId: 10,
  therapistId: 't-1',
  roomId: 1,
  dayOfWeek: 0,
  startHour: 9,
  span: 1,
  ...overrides,
});

// 2026-11-02 is a Monday, so weekday 0.
const MONDAY = '2026-11-02';

const mondaySessions = () => [
  { id: 1, day_of_week: 0, start_hour: 9, span: 1, room: 'Room A', therapist_id: 't-1', student_ids: [1] },
  { id: 2, day_of_week: 0, start_hour: 11, span: 1, room: 'Room B', therapist_id: 't-2', student_ids: [2] },
];

const repair = (overrides = {}) => ({
  actions: [],
  dateISO: MONDAY,
  sessions: mondaySessions(),
  staff,
  rooms,
  settings,
  absences: {},
  ...overrides,
});

const codes = (verdict) => verdict.errors.map((error) => error.code);

// ─── Base plan ───────────────────────────────────────────────────────────────

test('a legal weekly assignment passes with no errors', () => {
  const verdict = validateBasePlan(base({ assignments: [assignment()] }));

  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.errors, []);
  assert.deepEqual(verdict.warnings, []);
});

test('a therapist booked twice at the same time is rejected', () => {
  const verdict = validateBasePlan(base({
    assignments: [
      assignment(),
      assignment({ studentProgramId: 101, studentId: 2, programId: 11, roomId: 2, startHour: 9.5 }),
    ],
  }));

  assert.equal(verdict.ok, false);
  assert.ok(codes(verdict).includes('STAFF_OVERLAP'));
});

test('a student outside their availability window is rejected', () => {
  const verdict = validateBasePlan(base({
    assignments: [assignment({ startHour: 14 })],
  }));

  assert.equal(verdict.ok, false);
  assert.deepEqual(codes(verdict), ['STUDENT_UNAVAILABLE']);
});

test('a second weekly session for a one-a-week requirement is rejected', () => {
  const verdict = validateBasePlan(base({
    assignments: [assignment(), assignment({ dayOfWeek: 1 })],
  }));

  assert.equal(verdict.ok, false);
  assert.ok(codes(verdict).includes('QUOTA_EXCEEDED'));
});

test('a legacy undated row with no weekday still occupies its id % 5 day', () => {
  // 7 % 5 = 2: the same Wednesday, same hour, same therapist as the assignment.
  const legacy = { id: 7, start_hour: 9, span: 1, room: 'Room A', therapist_id: 't-1', student_ids: [] };
  const wednesday = validateBasePlan(base({ assignments: [assignment({ dayOfWeek: 2 })], existingSessions: [legacy] }));
  const monday = validateBasePlan(base({ assignments: [assignment()], existingSessions: [legacy] }));

  assert.equal(wednesday.ok, false);
  assert.ok(codes(wednesday).includes('STAFF_OVERLAP'));
  assert.equal(monday.ok, true);
});

test('a room with no free place is rejected unless the school allows overbooking', () => {
  const fullRoom = [{ id: 1, name: 'Room A', max_capacity: 0, is_active: true }];
  const blocked = validateBasePlan(base({ assignments: [assignment()], rooms: fullRoom }));
  const allowed = validateBasePlan(base({
    assignments: [assignment()],
    rooms: fullRoom,
    settings: { ...settings, allow_overbook: true },
  }));

  assert.equal(blocked.ok, false);
  assert.deepEqual(codes(blocked), ['ROOM_CAPACITY']);
  assert.equal(allowed.ok, true);
});

// ─── Daily repair ────────────────────────────────────────────────────────────

test('a move into an occupied room is rejected', () => {
  const verdict = validateRepairPlan(repair({
    sessions: [
      { id: 1, day_of_week: 0, start_hour: 9, span: 1, room: 'Room A', therapist_id: 't-1', student_ids: [1] },
      { id: 2, day_of_week: 0, start_hour: 11, span: 1, room: 'Room A', therapist_id: 't-2', student_ids: [2] },
    ],
    actions: [{ sessionId: 2, action: 'move', startHour: 9.5, reason: 'Room clash' }],
  }));

  assert.equal(verdict.ok, false);
  assert.deepEqual(codes(verdict), ['ROOM_OVERLAP']);
});

test('a session left with an absent therapist is rejected', () => {
  const verdict = validateRepairPlan(repair({ absences: { staffIds: ['t-1'] } }));

  assert.equal(verdict.ok, false);
  assert.ok(codes(verdict).includes('ABSENT_STAFF'));
});

test('more fixes than the blast-radius cap allows are rejected', () => {
  const fourSessions = [
    ...mondaySessions(),
    { id: 3, day_of_week: 0, start_hour: 13, span: 1, room: 'Room A', therapist_id: 't-1', student_ids: [1] },
    { id: 4, day_of_week: 0, start_hour: 14, span: 1, room: 'Room B', therapist_id: 't-2', student_ids: [2] },
  ];
  const verdict = validateRepairPlan(repair({
    sessions: fourSessions,
    actions: [
      { sessionId: 1, action: 'cancel', reason: 'Absent student' },
      { sessionId: 3, action: 'cancel', reason: 'Absent student' },
    ],
  }));

  assert.equal(repairActionCap(4), 1);
  assert.equal(repairActionCap(8), 2);
  assert.equal(verdict.ok, false);
  assert.ok(codes(verdict).includes('ACTION_CAP'));
});

test('cancelling the only affected session is a valid repair', () => {
  const actions = [{ sessionId: 1, action: 'cancel', reason: 'Therapist sick' }];
  const verdict = validateRepairPlan(repair({ actions, absences: { staffIds: ['t-1'] } }));

  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.errors, []);

  const after = applyRepairActions(mondaySessions(), actions, rooms);
  assert.deepEqual(after.map((row) => row.id), [2]);
});

test('applyRepairActions returns the moved hour and the new room name', () => {
  const after = applyRepairActions(
    mondaySessions(),
    [{ sessionId: 2, action: 'move', startHour: 8, roomId: 1 }],
    rooms,
  );
  const moved = after.find((row) => row.id === 2);

  assert.equal(moved.startHour, 8);
  assert.equal(moved.room, 'Room A');
  assert.equal(moved.roomId, 1);
});

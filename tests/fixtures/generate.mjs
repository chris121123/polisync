// Manual golden-fixture generator. Run once, by hand: node tests/fixtures/generate.mjs
// Never part of the gate. The JSON it writes is committed and immutable: changing a fixture
// requires a reviewed commit, otherwise the gate would silently follow the code.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
const source = (module) => `${module} @ ${commit}`;

const write = (name, data) => {
  writeFileSync(new URL(name, import.meta.url), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${name}`);
};

// lib/supabase.js reads import.meta.env at module scope. Under Node that is undefined, so it logs
// the missing-credentials error. Expected noise: silenced only around the import.
const [logError, logInfo] = [console.error, console.info];
console.error = () => {};
console.info = () => {};
const { validatePassword, isPasswordValid } = await import('../../src/lib/passwordPolicy.js');
const { DAY_NAMES, sessionDayIndex, sessionDayName, formatHour, formatTime } = await import('../../src/lib/sessionDay.js');
const { auditLine } = await import('../../src/lib/auditLog.js');
const { detectConflicts, scoreSchedule, localSmartSchedule } = await import('../../src/lib/scheduler.js');
console.error = logError;
console.info = logInfo;

// ── passwordPolicy ───────────────────────────────────────────────────────────

const passwordInputs = [
  null,
  '',
  'Ab1',
  'Abcdefg',
  'Abcdefg1',
  'abcdefg1',
  'Abcdefgh',
  'Pässwörd1',
  ' Abcdefg1',
  'Abcdefg1 ',
];

write('passwordPolicy.json', {
  _source: source('src/lib/passwordPolicy.js'),
  cases: passwordInputs.map((input) => ({
    input,
    failed: validatePassword(input).map(({ id, label }) => ({ id, label })),
    valid: isPasswordValid(input),
  })),
});

// ── sessionDay ───────────────────────────────────────────────────────────────

const sessions = [
  { session: { dayOfWeek: 0 }, expected: { index: 0, name: 'Monday' } },
  { session: { dayOfWeek: 3 }, expected: { index: 3, name: 'Thursday' } },
  { session: { dayOfWeek: 4 }, expected: { index: 4, name: 'Friday' } },
  { session: { dayOfWeek: 6 }, expected: { index: 0, name: 'Monday' } },
  { session: {}, expected: { index: 0, name: 'Monday' } },
  { session: { sessionDate: '2026-10-19T10:00:00' }, expected: null },
  { session: { sessionDate: '2026-10-23T10:00:00' }, expected: null },
  { session: { sessionDate: '2026-10-24T10:00:00' }, expected: null },
  { session: { sessionDate: 'not-a-date', dayOfWeek: 2 }, expected: null },
  { session: { sessionDate: '2026-10-21T10:00:00', dayOfWeek: 0 }, expected: null },
].map((c) => ({
  ...c,
  expected: c.expected ?? { index: sessionDayIndex(c.session), name: sessionDayName(c.session) },
}));

const times = [];
for (const hour of [8, 12.5, 17]) {
  times.push({ hour, span: null, formatHour: formatHour(hour), formatTime: formatTime(hour) });
  for (const span of [0.5, 1, 2]) {
    times.push({ hour, span, formatHour: formatHour(hour), formatTime: formatTime(hour, span) });
  }
}

write('sessionDay.json', {
  _source: source('src/lib/sessionDay.js'),
  _note:
    'sessionDate cases use local datetime strings on purpose: a date-only "YYYY-MM-DD" parses as UTC ' +
    'midnight, so getDay() would depend on the machine timezone and the fixture would not be portable.',
  dayNames: [...DAY_NAMES],
  sessions,
  times,
});

// ── auditLog ─────────────────────────────────────────────────────────────────

const staff = [
  { id: 'u1', name: 'Ana Reyes' },
  { id: 7, name: 'Ben Osei' },
  { id: 'u3', name: 'Cleo Park' },
];

const logs = [
  { performed_by: 'u1', target_user_id: 'u3', action: 'create_user' },
  { performed_by: 'ghost', target_user_id: 'u3', action: 'delete_user' },
  { performed_by: null, target_user_id: 'u3', action: 'update_role' },
  { performed_by: 'u1', target_user_id: 'ghost', action: 'delete_user' },
  { performed_by: 'u1', target_user_id: null, action: 'reset_password' },
  { performed_by: '7', target_user_id: 7, action: 'update' },
  { performed_by: 'u1', target_user_id: 'u3', action: null },
  { performed_by: 'u1', target_user_id: 'u3' },
];

write('auditLog.json', {
  _source: source('src/lib/auditLog.js'),
  staff,
  cases: logs.map((log) => ({ log, expected: auditLine(log, staff) })),
});

// ── scheduler ────────────────────────────────────────────────────────────────

const existing = [
  { id: 's1', therapistId: 't1', room: 'Room A', startHour: 9, span: 1, dayOfWeek: 0, studentIds: [1] },
  { id: 's2', therapistId: 't2', room: 'Room B', startHour: 12, span: 1, dayOfWeek: 0, studentIds: [2] },
];

const conflicts = [
  {
    name: 'no conflict',
    newSession: { id: 'n1', therapistId: 't3', room: 'Room C', startHour: 14, span: 1, dayOfWeek: 0, studentIds: [3] },
    existingSessions: existing,
  },
  {
    name: 'therapist clash',
    newSession: { id: 'n2', therapistId: 't1', room: 'Room C', startHour: 9, span: 1, dayOfWeek: 0, studentIds: [3] },
    existingSessions: existing,
  },
  {
    name: 'room clash',
    newSession: { id: 'n3', therapistId: 't3', room: 'Room B', startHour: 12.5, span: 1, dayOfWeek: 0, studentIds: [3] },
    existingSessions: existing,
  },
  {
    name: 'therapist and room clash',
    newSession: { id: 'n4', therapistId: 't1', room: 'Room A', startHour: 9.5, span: 1, dayOfWeek: 0, studentIds: [3] },
    existingSessions: existing,
  },
  {
    name: 'student clash',
    newSession: { id: 'n9', therapistId: 't3', room: 'Room C', startHour: 9.5, span: 1, dayOfWeek: 0, studentIds: [1] },
    existingSessions: existing,
  },
  {
    name: 'adjacent but not overlapping',
    newSession: { id: 'n5', therapistId: 't1', room: 'Room A', startHour: 10, span: 1, dayOfWeek: 0, studentIds: [1] },
    existingSessions: existing,
  },
  {
    name: 'different day',
    newSession: { id: 'n6', therapistId: 't1', room: 'Room A', startHour: 9, span: 1, dayOfWeek: 1, studentIds: [1] },
    existingSessions: existing,
  },
  {
    name: 'same id is skipped',
    newSession: { id: 's1', therapistId: 't1', room: 'Room A', startHour: 9, span: 1, dayOfWeek: 0, studentIds: [1] },
    existingSessions: existing,
  },
  {
    name: 'string id versus number id is not the same session',
    newSession: { id: '1', therapistId: 't1', room: 'Room A', startHour: 9, span: 1, dayOfWeek: 0, studentIds: [1] },
    existingSessions: [{ id: 1, therapistId: 't1', room: 'Room A', startHour: 9, span: 1, dayOfWeek: 0, studentIds: [1] }],
  },
  {
    name: 'missing therapist, room and students',
    newSession: { id: 'n7', startHour: 9, span: 1 },
    existingSessions: [{ id: 's9', startHour: 9, span: 1 }],
  },
  {
    name: 'missing startHour and span',
    newSession: { id: 'n8', therapistId: 't1', room: 'Room A' },
    existingSessions: existing,
  },
].map((c) => ({ ...c, expected: detectConflicts(c.newSession, c.existingSessions) }));

const scores = [
  { name: 'empty', assignments: [], unscheduledCount: 0 },
  {
    name: 'one assignment',
    assignments: [{ studentId: 1, startHour: 9, duration: 1 }],
    unscheduledCount: 0,
  },
  {
    name: 'five assignments',
    assignments: [
      { studentId: 1, startHour: 8, duration: 1 },
      { studentId: 1, startHour: 11, duration: 1 },
      { studentId: 2, startHour: 9, duration: 1 },
      { studentId: 2, startHour: 10, duration: 1 },
      { studentId: 2, startHour: 14, duration: 1 },
    ],
    unscheduledCount: 0,
  },
  {
    name: 'five assignments, three unscheduled',
    assignments: [
      { studentId: 1, startHour: 8, duration: 1 },
      { studentId: 1, startHour: 11, duration: 1 },
      { studentId: 2, startHour: 9, duration: 1 },
      { studentId: 2, startHour: 10, duration: 1 },
      { studentId: 2, startHour: 14, duration: 1 },
    ],
    unscheduledCount: 3,
  },
  {
    name: 'span fallback when duration is absent',
    assignments: [
      { studentId: 3, startHour: 9, span: 1 },
      { studentId: 3, startHour: 12, span: 1 },
    ],
    unscheduledCount: 0,
  },
];

const localInput = {
  studentPrograms: [
    {
      id: 101,
      student_id: 1,
      program_id: 11,
      status: 'pending',
      priority: 5,
      preferred_duration_hours: 1,
      assigned_teacher_id: null,
    },
  ],
  staff: [{ id: 201, name: 'Therapist One', app_role: 'therapist', role: 'Therapist', status: 'Active' }],
  rooms: [{ id: 'r1', name: 'Room A', maxCapacity: 5 }],
  programs: [{ id: 11, name: 'Speech Therapy', type: 'individual', default_duration_hours: 1 }],
  sessions: [],
  studentAvailability: [{ student_id: 1, day_of_week: 0, start_time: '09:00', end_time: '12:00' }],
  schedulingSettings: {
    min_break_minutes: 15,
    max_daily_hours_per_student: 4,
    operating_start_time: '08:00',
    operating_end_time: '17:00',
  },
  dayOfWeek: 0,
};

// Determinism gate: stats.elapsed is Date.now()-derived and can never match, so it is deleted
// before comparison. Backtracks and assignment order must otherwise be stable across runs.
const runLocal = () => {
  const result = localSmartSchedule(localInput);
  delete result.stats.elapsed;
  return JSON.stringify(result);
};

const runs = 20;
const firstRun = runLocal();
let identical = true;
for (let i = 1; i < runs; i++) {
  if (runLocal() !== firstRun) identical = false;
}

const localExpected = JSON.parse(firstRun);

write('scheduler.json', {
  _source: source('src/lib/scheduler.js'),
  _note: 'stats.elapsed is removed from localSchedule.expected: it derives from Date.now().',
  conflicts: { cases: conflicts },
  score: { cases: scores.map((c) => ({ ...c, expected: scoreSchedule(c.assignments, c.unscheduledCount) })) },
  localSchedule: {
    input: localInput,
    expected: localExpected,
    determinism: { runs, identical, branch: identical ? 'byte-identical' : 'shape-only' },
  },
});
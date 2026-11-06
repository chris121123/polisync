// Deterministic schedule validator for AI proposals (plan D3, §6.3).
//
// The model only proposes; this module decides. Every function is pure and
// free of Deno/Node APIs, so the same code runs in the `ai-plan` edge, in the
// commit re-check against fresh rows, and in
// tests/golden/schedulerValidate.test.mjs (Node).
//
// Codes are stable strings: the edge returns them verbatim and the repair UI
// groups fix cards by code.

const MIN_SPAN = 0.5;
const MAX_SPAN = 4;
// Plan §6.5 (blast radius): one repair may touch a quarter of the day's sessions.
const REPAIR_SHARE = 0.25;
const DAY_START = 8;
const DAY_END = 17;
const ACTION_KINDS = ['move', 'substitute', 'cancel'];

export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ─── Small helpers ───────────────────────────────────────────────────────────

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const number = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// '08:30' | 8.5 | null → hours from midnight.
export const hourOf = (value, fallback) => {
  const raw = text(value);
  if (raw.includes(':')) {
    const [hours, minutes] = raw.split(':');
    const parsed = Number(hours) + (Number(minutes) || 0) / 60;
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const parsed = number(value);
  return parsed === null ? fallback : parsed;
};

const overlaps = (aStart, aEnd, bStart, bEnd) => Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
const same = (a, b) => String(a) === String(b);
const asList = (value) => (Array.isArray(value) ? value : []);

const studentIds = (value) =>
  asList(value).map(Number).filter((id) => Number.isFinite(id));

// Only an explicit false/'Inactive' disables a row: legacy rows predate the flag.
const isActive = (row) =>
  row?.is_active !== false && text(row?.status).toLowerCase() !== 'inactive';

// Profiles carry the role twice: user_roles wins in the app, but the row itself
// is all this module sees.
const roleOf = (row) => text(row?.app_role || row?.role).toLowerCase();

const asDate = (row) => {
  const raw = text(row?.session_date ?? row?.sessionDate ?? row?.date);
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
};

// Monday = 0 … Friday = 4 from a local 'YYYY-MM-DD'; weekend/unparseable = null.
export const weekdayOfDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const jsDay = new Date(year, month - 1, day).getDay();
  return jsDay === 0 || jsDay === 6 ? null : jsDay - 1;
};

// The stored weekday wins (same rule as src/lib/scheduling/time.js); only a
// missing/weekend value falls back to the session date, then to the legacy id % 5.
const sessionDay = (row) => {
  const day = number(row?.day_of_week ?? row?.dayOfWeek);
  if (day !== null && Number.isInteger(day) && day >= 0 && day <= 4) return day;
  const dated = weekdayOfDate(asDate(row));
  if (dated !== null) return dated;
  const bucket = Number(row?.id) % 5;
  return Number.isInteger(bucket) && bucket >= 0 ? bucket : null;
};

// One row shape for existing sessions, proposals and post-repair rows.
const normalise = (row, rooms) => {
  const name = text(row?.room);
  const room = rooms.find((candidate) => text(candidate?.name) === name);
  const span = hourOf(row?.span, 1);
  return {
    id: row?.id,
    date: asDate(row),
    dayOfWeek: sessionDay(row),
    startHour: hourOf(row?.start_hour ?? row?.startHour, 0),
    span: span > 0 ? span : 1,
    roomId: room ? room.id : number(row?.room_id ?? row?.roomId),
    room: name,
    // A room is the same room by id when both sides resolve, else by name.
    roomKey: room ? `id:${room.id}` : name ? `name:${name}` : '',
    staffId: row?.therapist_id ?? row?.staffId ?? null,
    studentIds: studentIds(row?.student_ids ?? row?.studentIds),
    studentProgramId: row?.student_program_id ?? row?.studentProgramId ?? null,
  };
};

const byId = (rows) => new Map(asList(rows).map((row) => [String(row?.id), row]));

const result = (errors, warnings) => ({ ok: errors.length === 0, errors, warnings });

// ─── Repair blast radius ─────────────────────────────────────────────────────

/** How many sessions one repair may touch for a day with `sessionCount` rows. */
export const repairActionCap = (sessionCount) =>
  Math.max(1, Math.ceil((Number(sessionCount) || 0) * REPAIR_SHARE));

// ─── Base plan (year weekly template) ────────────────────────────────────────

/**
 * Checks a proposed weekly template against the current school data.
 *
 * `students` is optional on top of the documented inputs: without a roster the
 * student existence/active rule is skipped rather than misreported.
 */
export function validateBasePlan(input = {}) {
  const {
    assignments = [],
    existingSessions = [],
    studentPrograms = [],
    programs = [],
    staff = [],
    students = [],
    rooms = [],
    studentAvailability = [],
    settings = {},
  } = input;

  const errors = [];
  const warnings = [];
  const fail = (code, message, at) => errors.push({ code, message, at });
  const warn = (code, message, at) => warnings.push({ code, message, at });

  const dayStart = hourOf(settings.operating_start_time, DAY_START);
  const dayEnd = hourOf(settings.operating_end_time, DAY_END);
  const maxDaily = hourOf(settings.max_daily_hours_per_student, 4);
  const allowOverbook = settings.allow_overbook === true;

  const programById = byId(programs);
  const staffById = byId(staff);
  const roomById = byId(rooms);
  const studentById = byId(students);
  const requirementById = byId(studentPrograms);
  const roomList = asList(rooms);

  // Rows exist ⇒ the student is available only inside them (no rows = all hours).
  const availability = new Map();
  for (const row of asList(studentAvailability)) {
    if (row?.is_active === false) continue;
    const key = String(row?.student_id ?? row?.studentId);
    if (!availability.has(key)) availability.set(key, []);
    availability.get(key).push({
      dayOfWeek: number(row?.day_of_week ?? row?.dayOfWeek),
      startHour: hourOf(row?.start_time ?? row?.startHour, dayStart),
      endHour: hourOf(row?.end_time ?? row?.endHour, dayEnd),
    });
  }

  // Everything already on the weekly template, in the same shape as a proposal.
  const placed = asList(existingSessions)
    .map((row) => normalise(row, roomList))
    .filter((row) => row.dayOfWeek !== null);

  const certWarned = new Set();
  const list = asList(assignments);

  list.forEach((assignment, index) => {
    const at = index;
    const label = `Assignment ${index + 1}`;
    const dayOfWeek = number(assignment?.dayOfWeek);
    const startHour = number(assignment?.startHour);
    const span = number(assignment?.span);

    if (dayOfWeek === null || startHour === null || span === null) {
      fail('SHAPE', `${label}: dayOfWeek, startHour and span are required numbers`, at);
      return;
    }
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 4) {
      fail('DAY_RANGE', `${label}: weekday ${dayOfWeek} is outside Monday–Friday`, at);
      return;
    }
    if (span < MIN_SPAN || span > MAX_SPAN) {
      fail('DURATION_RANGE', `${label}: ${span}h is outside the ${MIN_SPAN}–${MAX_SPAN}h range`, at);
      return;
    }
    if (startHour < dayStart || startHour + span > dayEnd) {
      fail('HOURS_RANGE', `${label}: ${startHour}–${startHour + span} is outside operating hours ${dayStart}–${dayEnd}`, at);
    }

    const requirement = requirementById.get(String(assignment?.studentProgramId));
    const program = programById.get(String(assignment?.programId));
    const teacher = staffById.get(String(assignment?.therapistId));
    const room = roomById.get(String(assignment?.roomId));
    const studentId = number(assignment?.studentId);

    if (!requirement) fail('UNKNOWN_REQUIREMENT', `${label}: student programme ${assignment?.studentProgramId} does not exist`, at);
    if (!program) fail('UNKNOWN_PROGRAM', `${label}: programme ${assignment?.programId} does not exist`, at);
    else if (!isActive(program)) fail('INACTIVE_PROGRAM', `${label}: programme ${program.id} is not active`, at);
    if (!room) fail('UNKNOWN_ROOM', `${label}: room ${assignment?.roomId} does not exist`, at);
    else if (!isActive(room)) fail('INACTIVE_ROOM', `${label}: room ${room.id} is not active`, at);
    if (studentId === null) {
      fail('SHAPE', `${label}: studentId is required`, at);
    } else if (studentById.size > 0) {
      const student = studentById.get(String(studentId));
      if (!student) fail('UNKNOWN_STUDENT', `${label}: student ${studentId} does not exist`, at);
      else if (!isActive(student)) fail('INACTIVE_STUDENT', `${label}: student ${studentId} is not active`, at);
    }
    if (!teacher) {
      fail('UNKNOWN_STAFF', `${label}: staff ${assignment?.therapistId} does not exist`, at);
    } else if (roleOf(teacher) === 'parent') {
      fail('STAFF_ROLE', `${label}: a parent cannot be the therapist`, at);
    } else if (!isActive(teacher)) {
      fail('INACTIVE_STAFF', `${label}: staff ${teacher.id} is not active`, at);
    }

    // The row this writes links all three, so they have to agree.
    if (requirement) {
      if (studentId !== null && !same(requirement.student_id ?? requirement.studentId, studentId)) {
        fail('REQUIREMENT_MISMATCH', `${label}: student ${studentId} does not match the requirement`, at);
      }
      if (program && !same(requirement.program_id ?? requirement.programId, program.id)) {
        fail('REQUIREMENT_MISMATCH', `${label}: programme ${program.id} does not match the requirement`, at);
      }
    }

    // One session per requirement per weekday (also the DB unique index).
    if (requirement) {
      // `placed` already holds the existing rows and the assignments before this one.
      const duplicate = placed.some(
        (row) => row.dayOfWeek === dayOfWeek && same(row.studentProgramId, requirement.id),
      );
      if (duplicate) {
        fail('DUPLICATE_ASSIGNMENT', `${label}: this requirement already has a session on ${DAY_LABELS[dayOfWeek]}`, at);
      }

      const perWeek = number(requirement.sessions_per_week ?? requirement.sessionsPerWeek) ?? 1;
      const linked = placed.filter((row) => same(row.studentProgramId, requirement.id)).length + 1;
      if (linked > perWeek) {
        fail('QUOTA_EXCEEDED', `${label}: ${linked} sessions for a requirement limited to ${perWeek}/week`, at);
      }
    }

    const required = asList(program?.requires_certification)
      .map((value) => text(String(value)).toLowerCase())
      .filter(Boolean);
    if (required.length > 0 && teacher) {
      const held = Array.isArray(teacher.certifications)
        ? teacher.certifications.map((value) => text(String(value)).toLowerCase())
        : null;
      if (held === null) {
        // No certification column exists yet: unknown, not missing.
        if (!certWarned.has(String(teacher.id))) {
          warn('CERT_UNKNOWN', `Staff ${teacher.id} has no certification data, so ${required.join(', ')} cannot be verified`, at);
          certWarned.add(String(teacher.id));
        }
      } else if (!required.every((value) => held.includes(value))) {
        const missing = required.filter((value) => !held.includes(value));
        fail('CERT_MISSING', `${label}: staff lacks ${missing.join(', ')}`, at);
      }
    }

    const windows = availability.get(String(studentId));
    if (windows && windows.length > 0) {
      const covered = windows.some(
        (window) => window.dayOfWeek === dayOfWeek
          && startHour >= window.startHour
          && startHour + span <= window.endHour,
      );
      if (!covered) {
        fail('STUDENT_UNAVAILABLE', `${label}: student is not available on ${DAY_LABELS[dayOfWeek]} at ${startHour}`, at);
      }
    }

    const capacity = number(room?.max_capacity ?? room?.maxCapacity);
    if (room && capacity !== null && capacity < 1 && !allowOverbook) {
      fail('ROOM_CAPACITY', `${label}: room ${room.id} has no free places`, at);
    }

    const proposalRoomId = number(assignment?.roomId);
    const roomKey = room ? `id:${room.id}` : proposalRoomId === null ? '' : `id:${proposalRoomId}`;
    let staffClash = false;
    let roomClash = false;
    let studentClash = false;
    for (const row of placed) {
      if (row.dayOfWeek !== dayOfWeek) continue;
      if (!overlaps(startHour, startHour + span, row.startHour, row.startHour + row.span)) continue;
      if (teacher && same(row.staffId, teacher.id)) staffClash = true;
      if (roomKey && row.roomKey === roomKey) roomClash = true;
      if (studentId !== null && row.studentIds.includes(studentId)) studentClash = true;
    }
    if (staffClash) fail('STAFF_OVERLAP', `${label}: therapist is already booked at that time`, at);
    if (roomClash) fail('ROOM_OVERLAP', `${label}: room is already booked at that time`, at);
    if (studentClash) fail('STUDENT_OVERLAP', `${label}: student is already booked at that time`, at);

    if (studentId !== null) {
      const dayHours = placed
        .filter((row) => row.dayOfWeek === dayOfWeek && row.studentIds.includes(studentId))
        .reduce((sum, row) => sum + row.span, 0) + span;
      if (dayHours > maxDaily) {
        fail('DAILY_HOURS', `${label}: ${dayHours}h on ${DAY_LABELS[dayOfWeek]} exceeds ${maxDaily}h/day`, at);
      }
    }

    placed.push({
      dayOfWeek,
      startHour,
      span,
      roomKey,
      staffId: assignment?.therapistId ?? null,
      studentIds: studentId === null ? [] : [studentId],
      studentProgramId: requirement?.id ?? null,
      proposed: true,
    });
  });

  return result(errors, warnings);
}

// ─── Daily repair ────────────────────────────────────────────────────────────

/**
 * Applies repair actions to a copy of `sessions` and returns the new rows
 * (cancelled rows removed). Used by validateRepairPlan and by tests/previews.
 * `rooms` resolves a `move`'s roomId to its name; it is optional.
 */
export function applyRepairActions(sessions = [], actions = [], rooms = []) {
  const roomList = asList(rooms);
  const rows = asList(sessions).map((row) => normalise(row, roomList));
  const index = new Map(rows.map((row) => [String(row.id), row]));
  const cancelled = new Set();

  for (const action of asList(actions)) {
    const row = index.get(String(action?.sessionId));
    if (!row) continue;
    const kind = text(action?.action);

    if (kind === 'cancel') {
      cancelled.add(String(row.id));
      continue;
    }

    if (kind === 'move') {
      const startHour = number(action?.startHour);
      if (startHour !== null) row.startHour = startHour;
      const roomId = number(action?.roomId);
      if (roomId !== null) {
        const room = roomList.find((candidate) => same(candidate?.id, roomId));
        row.roomId = roomId;
        row.roomKey = `id:${roomId}`;
        row.room = room ? text(room.name) : '';
      }
    }

    if (kind === 'substitute') {
      const therapistId = text(action?.therapistId);
      if (therapistId) row.staffId = therapistId;
    }
  }

  return rows.filter((row) => !cancelled.has(String(row.id)));
}

/**
 * Checks a proposed repair for one date.
 *
 * `sessions` should hold the day's rows (dated rows for `dateISO` plus undated
 * rows on that weekday); a row for another date is rejected with OTHER_DATE.
 * Weekly quotas are not re-checked here: a repair never adds a session.
 */
export function validateRepairPlan(input = {}) {
  const {
    actions = [],
    dateISO = '',
    sessions = [],
    staff = [],
    rooms = [],
    settings = {},
    absences = {},
  } = input;

  const errors = [];
  const warnings = [];
  const fail = (code, message, at) => errors.push({ code, message, at });
  const warn = (code, message, at) => warnings.push({ code, message, at });

  const weekday = weekdayOfDate(dateISO);
  const list = asList(actions);
  if (weekday === null) {
    fail('BAD_DATE', 'dateISO must be a Monday–Friday date in YYYY-MM-DD form', null);
    return result(errors, warnings);
  }

  const dayStart = hourOf(settings.operating_start_time, DAY_START);
  const dayEnd = hourOf(settings.operating_end_time, DAY_END);
  const allowOverbook = settings.allow_overbook === true;

  const absentStaff = new Set(asList(absences?.staffIds).map(String));
  const absentStudents = new Set(asList(absences?.studentIds).map(String));
  const absentRooms = new Set(asList(absences?.roomIds).map(String));

  const staffById = byId(staff);
  const roomById = byId(rooms);
  const roomList = asList(rooms);

  // A dated row belongs to exactly its date; an undated row recurs every weekday.
  const onDay = (row) => (row.date ? row.date === dateISO : row.dayOfWeek === weekday);
  const all = asList(sessions).map((row) => normalise(row, roomList));
  const dayRows = all.filter(onDay);
  const dayById = new Map(dayRows.map((row) => [String(row.id), row]));
  const allById = new Map(all.map((row) => [String(row.id), row]));

  const cap = repairActionCap(dayRows.length);
  if (list.length > cap) {
    fail('ACTION_CAP', `A repair may touch at most ${cap} of ${dayRows.length} sessions for ${dateISO}`, null);
  }

  const touched = new Set();
  const seen = new Set();

  list.forEach((action, index) => {
    const at = action?.sessionId ?? index;
    const label = `Action ${index + 1}`;
    const kind = text(action?.action);

    if (!ACTION_KINDS.includes(kind)) {
      fail('BAD_ACTION', `${label}: action must be move, substitute or cancel`, at);
      return;
    }

    const row = dayById.get(String(action?.sessionId));
    if (!row) {
      const known = allById.has(String(action?.sessionId));
      fail(
        known ? 'OTHER_DATE' : 'UNKNOWN_SESSION',
        `${label}: ${known ? 'session belongs to another date' : 'session does not exist'}`,
        at,
      );
      return;
    }

    if (seen.has(String(row.id))) {
      fail('DUPLICATE_ACTION', `${label}: session ${row.id} already has an action`, at);
      return;
    }
    seen.add(String(row.id));

    if (!text(action?.reason)) warn('NO_REASON', `${label}: no reason given for session ${row.id}`, at);

    if (kind === 'move') {
      const startHour = number(action?.startHour);
      const roomId = number(action?.roomId);
      if (startHour === null && roomId === null) {
        fail('BAD_ACTION', `${label}: move needs startHour or roomId`, at);
        return;
      }
      const sameHour = startHour === null || startHour === row.startHour;
      const sameRoom = roomId === null || same(roomId, row.roomId);
      if (sameHour && sameRoom) {
        fail('NO_OP', `${label}: session ${row.id} already sits there`, at);
        return;
      }
      if (roomId !== null) {
        if (!roomById.has(String(roomId))) {
          fail('UNKNOWN_ROOM', `${label}: room ${roomId} does not exist`, at);
          return;
        }
        if (absentRooms.has(String(roomId))) {
          fail('ABSENT_ROOM', `${label}: room ${roomId} is unavailable`, at);
        }
      }
      if (startHour !== null && (startHour < dayStart || startHour + row.span > dayEnd)) {
        fail('HOURS_RANGE', `${label}: ${startHour}–${startHour + row.span} is outside operating hours ${dayStart}–${dayEnd}`, at);
      }
    }

    if (kind === 'substitute') {
      const therapistId = text(action?.therapistId);
      if (!therapistId) {
        fail('BAD_ACTION', `${label}: substitute needs therapistId`, at);
        return;
      }
      if (same(therapistId, row.staffId)) {
        fail('NO_OP', `${label}: session ${row.id} already has that therapist`, at);
        return;
      }
      const teacher = staffById.get(therapistId);
      if (!teacher) {
        fail('UNKNOWN_STAFF', `${label}: staff ${therapistId} does not exist`, at);
        return;
      }
      if (roleOf(teacher) === 'parent') {
        fail('STAFF_ROLE', `${label}: a parent cannot be the therapist`, at);
        return;
      }
      if (!isActive(teacher)) {
        fail('INACTIVE_STAFF', `${label}: staff ${therapistId} is not active`, at);
        return;
      }
      if (absentStaff.has(therapistId)) {
        fail('ABSENT_STAFF', `${label}: staff ${therapistId} is unavailable`, at);
        return;
      }
    }

    touched.add(String(row.id));
  });

  const after = applyRepairActions(dayRows, list, roomList);

  for (const row of after) {
    const at = row.id;
    // Absences are post-conditions: every affected session must be handled today.
    if (row.staffId && absentStaff.has(String(row.staffId))) {
      fail('ABSENT_STAFF', `Session ${row.id}: therapist is unavailable`, at);
    }
    const absentStudent = row.studentIds.find((id) => absentStudents.has(String(id)));
    if (absentStudent !== undefined) {
      // No action can drop one student from a group, so only a solo session blocks.
      const report = row.studentIds.length > 1 ? warn : fail;
      report('ABSENT_STUDENT', `Session ${row.id}: student ${absentStudent} is unavailable`, at);
    }
    if (row.roomId !== null && row.roomId !== undefined && absentRooms.has(String(row.roomId))) {
      fail('ABSENT_ROOM', `Session ${row.id}: room is unavailable`, at);
    }
    if (touched.has(String(row.id)) && (row.startHour < dayStart || row.startHour + row.span > dayEnd)) {
      fail('HOURS_RANGE', `Session ${row.id}: ${row.startHour}–${row.startHour + row.span} is outside operating hours`, at);
    }
    const room = row.roomId !== null && row.roomId !== undefined ? roomById.get(String(row.roomId)) : null;
    const capacity = number(room?.max_capacity ?? room?.maxCapacity);
    if (room && capacity !== null && capacity < row.studentIds.length && !allowOverbook) {
      fail('ROOM_CAPACITY', `Session ${row.id}: room holds ${capacity}, ${row.studentIds.length} students booked`, at);
    }
  }

  // A pair the repair touched must come out clean; one it left alone is reported
  // as a warning so pre-existing damage never blocks an unrelated fix.
  for (let i = 0; i < after.length; i += 1) {
    for (let j = i + 1; j < after.length; j += 1) {
      const a = after[i];
      const b = after[j];
      if (a.dayOfWeek !== null && b.dayOfWeek !== null && a.dayOfWeek !== b.dayOfWeek) continue;
      if (!overlaps(a.startHour, a.startHour + a.span, b.startHour, b.startHour + b.span)) continue;

      const report = touched.has(String(a.id)) || touched.has(String(b.id)) ? fail : warn;
      const where = `Sessions ${a.id} and ${b.id}`;
      if (a.staffId && same(a.staffId, b.staffId)) {
        report('STAFF_OVERLAP', `${where}: same therapist at the same time`, a.id);
      }
      if (a.roomKey && a.roomKey === b.roomKey) {
        report('ROOM_OVERLAP', `${where}: same room at the same time`, a.id);
      }
      const shared = a.studentIds.filter((id) => b.studentIds.includes(id));
      if (shared.length > 0) {
        report('STUDENT_OVERLAP', `${where}: student ${shared[0]} is double-booked`, a.id);
      }
    }
  }

  return result(errors, warnings);
}

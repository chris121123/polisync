// Import row parsing for the Excel/photo pipeline (plan §5.3).
//
// Plain ESM with no Deno/Node APIs: the `ai-import` edge imports it, and
// tests/golden/importRows.test.mjs runs it under Node.
//
// The browser parses the .xlsx and posts plain objects; this module only maps
// headers to fields and turns cells into the values the scheduler understands.
// Names are NOT resolved here — that needs the database and happens in `resolve`.

/** Hard row cap per batch, shared by both staging kinds and the edge. */
export const MAX_IMPORT_ROWS = 500;

// Header spellings seen in real timetables. Keys are already normalised.
const HEADER_FIELDS = {
  day: 'day',
  dayofweek: 'day',
  dayname: 'day',
  dayofweekname: 'day',
  weekday: 'day',
  start: 'start',
  starttime: 'start',
  starthour: 'start',
  from: 'start',
  fromtime: 'start',
  end: 'end',
  endtime: 'end',
  endhour: 'end',
  to: 'end',
  totime: 'end',
  duration: 'duration',
  durationhours: 'duration',
  span: 'duration',
  length: 'duration',
  hours: 'duration',
  student: 'student',
  studentname: 'student',
  studentref: 'student',
  pupil: 'student',
  pupilname: 'student',
  child: 'student',
  staff: 'staff',
  staffname: 'staff',
  staffref: 'staff',
  teacher: 'staff',
  teachername: 'staff',
  therapist: 'staff',
  therapistname: 'staff',
  provider: 'staff',
  room: 'room',
  roomname: 'room',
  location: 'room',
  program: 'program',
  programname: 'program',
  programme: 'program',
  programmename: 'program',
  service: 'program',
  servicename: 'program',
  activity: 'program',
  notes: 'notes',
  note: 'notes',
  comment: 'notes',
  comments: 'notes',
  remarks: 'notes',
};

const DAY_ALIASES = {
  monday: 0, mon: 0,
  tuesday: 1, tue: 1, tues: 1,
  wednesday: 2, wed: 2, weds: 2,
  thursday: 3, thu: 3, thur: 3, thurs: 3,
  friday: 4, fri: 4,
};

// Required for a row to become a session: the rest default or are optional.
const REQUIRED = [
  ['day', 'day'],
  ['start', 'start time'],
  ['student', 'student'],
  ['staff', 'staff'],
  ['room', 'room'],
  ['program', 'program'],
];

const asText = (value) => (value === null || value === undefined ? '' : String(value).trim());

const round2 = (value) => Math.round(value * 100) / 100;

// Own-key lookup: a column literally named "constructor" is not a match.
const fieldOf = (header) => {
  const key = normalizeHeader(header);
  return Object.prototype.hasOwnProperty.call(HEADER_FIELDS, key) ? HEADER_FIELDS[key] : null;
};

/** Case- and punctuation-insensitive header key: "Day of Week!" → "dayofweek". */
export function normalizeHeader(value) {
  return asText(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** "Monday" | "mon" | "MON." | 0 … 4 → 0–4 (Monday = 0); anything else → null. */
export function parseDayOfWeek(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= 4 ? value : null;
  }
  const key = normalizeHeader(value);
  if (!key) return null;
  if (/^[0-4]$/.test(key)) return Number(key);
  return Object.prototype.hasOwnProperty.call(DAY_ALIASES, key) ? DAY_ALIASES[key] : null;
}

/** "09:00" | "9:00" | "9 AM" | "13:30" | 9.5 → hours from midnight; else null. */
export function parseHour(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 && value < 24 ? value : null;
  const raw = asText(value).toLowerCase();
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw) < 24 ? Number(raw) : null;

  const clock = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/);
  const bare = clock ? null : raw.match(/^(\d{1,2})\s*(am|pm)$/);
  if (!clock && !bare) return null;

  let hour = Number(clock ? clock[1] : bare[1]);
  const minutes = clock ? Number(clock[2]) : 0;
  const meridiem = clock ? clock[3] : bare[2];

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (meridiem === 'pm' ? 12 : 0);
  }
  // 24:00 is midnight, not a start time: the whole hourly range is 0–23.
  if (hour >= 24 || minutes > 59) return null;
  return round2(hour + minutes / 60);
}

/**
 * Duration in hours: the `duration` cell wins, else `end − start`, else 1.
 * A value outside (0, 4] is rejected with null (the validator's own range).
 */
export function parseSpan(duration, startHour, endHour) {
  if (asText(duration) !== '') {
    const explicit = Number(duration);
    return Number.isFinite(explicit) && explicit > 0 && explicit <= 4 ? round2(explicit) : null;
  }
  if (typeof startHour !== 'number' || typeof endHour !== 'number') return 1;
  const span = round2(endHour - startHour);
  return span > 0 && span <= 4 ? span : null;
}

/**
 * Maps an array of header→value objects to schedulable rows.
 *
 * Returns `{ headerMap, rows }` where headerMap is field → original header (so
 * the wizard can show the column it matched) and every row carries its 1-based
 * `rowNo`, the parsed `fields` and its `errors`. Unknown headers are ignored.
 *
 * shortcut: rows past MAX_IMPORT_ROWS are dropped; the edge rejects a bigger
 * batch with a 422, so this only backstops a caller that skips it.
 */
export function parseImportRows(rows) {
  const list = (Array.isArray(rows) ? rows : [])
    .slice(0, MAX_IMPORT_ROWS)
    .map((row) => (row && typeof row === 'object' && !Array.isArray(row) ? row : {}));

  // Union of keys: a photo reply may omit a field on the first row only.
  const headerMap = {};
  for (const row of list) {
    for (const header of Object.keys(row)) {
      const field = fieldOf(header);
      if (field && !headerMap[field]) headerMap[field] = header;
    }
  }

  const parsed = list.map((row, index) => {
    const errors = [];
    const cell = (field) => (headerMap[field] === undefined ? undefined : row[headerMap[field]]);
    const add = (code, message, field) => errors.push({ code, message, field });

    const fields = {
      dayOfWeek: null,
      startHour: null,
      span: null,
      student: asText(cell('student')),
      staff: asText(cell('staff')),
      room: asText(cell('room')),
      program: asText(cell('program')),
      notes: asText(cell('notes')),
    };

    for (const [field, label] of REQUIRED) {
      // day and start are numbers after parsing, so they are checked below.
      if (field !== 'day' && field !== 'start' && !fields[field]) {
        add('MISSING_FIELD', `${label} is required`, field);
      }
    }

    const dayCell = cell('day');
    if (asText(dayCell) === '') add('MISSING_FIELD', 'day is required', 'day');
    else {
      fields.dayOfWeek = parseDayOfWeek(dayCell);
      if (fields.dayOfWeek === null) add('BAD_DAY', `"${asText(dayCell)}" is not a weekday (Monday–Friday)`, 'day');
    }

    const startCell = cell('start');
    if (asText(startCell) === '') add('MISSING_FIELD', 'start time is required', 'start');
    else {
      fields.startHour = parseHour(startCell);
      if (fields.startHour === null) add('BAD_TIME', `"${asText(startCell)}" is not a time (e.g. 09:00)`, 'start');
    }

    const endCell = cell('end');
    const endHour = asText(endCell) === '' ? null : parseHour(endCell);
    if (asText(endCell) !== '' && endHour === null) {
      add('BAD_TIME', `"${asText(endCell)}" is not a time (e.g. 10:00)`, 'end');
    } else {
      fields.span = parseSpan(cell('duration'), fields.startHour, endHour);
      if (fields.span === null) add('BAD_SPAN', 'duration must be more than 0 and at most 4 hours', 'duration');
    }

    return { rowNo: index + 1, fields, errors };
  });

  return { headerMap, rows: parsed };
}

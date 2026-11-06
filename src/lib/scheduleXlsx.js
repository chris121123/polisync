// Client-side schedule export (plan §5.3): the browser writes the workbook, no
// upload and no provider. Pure, so tests/golden can round-trip it under Node.
import * as XLSX from 'xlsx';
import { formatDateISO } from './dates.js';
import { getSessionDay } from './scheduling/time.js';
import { dayLabel, formatHour } from './scheduleImport.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const SHEET_NAMES = ['Weekly schedule', 'By staff', 'By rooms'];

const COLUMNS = {
  'Weekly schedule': ['Day', 'Start', 'End', 'Duration', 'Program', 'Students', 'Staff', 'Room', 'Confirmed', 'Source'],
  'By staff': ['Staff', 'Day', 'Start', 'End', 'Program', 'Students', 'Room'],
  'By rooms': ['Room', 'Day', 'Start', 'End', 'Program', 'Students', 'Staff'],
};

const WIDTHS = { Day: 12, Start: 8, End: 8, Duration: 9, Program: 22, Students: 34, Staff: 22, Room: 14, Confirmed: 11, Source: 10 };

// A real date for a dated row, the weekday name for the weekly template. No ids.
const dayCell = (session) => {
  if (typeof session.sessionDate === 'string' && ISO_DATE.test(session.sessionDate)) {
    const [year, month, day] = session.sessionDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return dayLabel(getSessionDay(session));
};

const dayKey = (value) => (value instanceof Date ? formatDateISO(value) : String(value));

const byId = (rows) => new Map((rows || []).map((row) => [String(row.id), row]));
const names = (ids, index) => (ids || []).map((id) => index.get(String(id))?.name).filter(Boolean);

const prepare = (session, { studentById, staffById, programById }) => {
  const program = programById.get(String(session.programId));
  const staff = staffById.get(String(session.therapistId));
  const start = Number(session.startHour) || 0;
  const span = Number(session.span) || 0;
  return {
    day: dayCell(session),
    start: formatHour(start),
    end: formatHour(start + span),
    duration: span,
    program: program?.name || session.title || '',
    students: names(session.studentIds, studentById).join(', '),
    staff: staff?.name || '',
    room: session.room || '',
    confirmed: session.isConfirmed === false ? 'No' : 'Yes',
    source: session.source || 'manual',
  };
};

// The weekly template first (Mon–Fri), then dated extras; times ascending.
const order = (session) => (session.sessionDate ? `1${session.sessionDate}` : `0${getSessionDay(session)}`);
const byTime = (a, b) => order(a).localeCompare(order(b))
  || (Number(a.startHour) || 0) - (Number(b.startHour) || 0)
  || String(a.title || '').localeCompare(String(b.title || ''));

const sheetOf = (name, rows, dayColumn) => {
  const headers = COLUMNS[name];
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet['!cols'] = headers.map((header) => ({ wch: WIDTHS[header] ?? 14 }));
  // Dates are already date cells; name the format so Excel shows them as days.
  for (let row = 1; row <= rows.length; row += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: dayColumn })];
    if (cell && cell.t === 'n') cell.z = 'yyyy-mm-dd';
  }
  return sheet;
};

/**
 * `{ sessions, students, staff, programs }` → a three-sheet workbook.
 * One row per session; a session without a room still appears (an export never hides data).
 */
export const buildScheduleWorkbook = ({ sessions = [], students = [], staff = [], programs = [] } = {}) => {
  const lookups = {
    studentById: byId(students),
    staffById: byId(staff),
    programById: byId(programs),
  };
  const ordered = [...sessions].sort(byTime);
  const prepared = ordered.map((session) => prepare(session, lookups));

  const weekly = prepared.map((cells) => [
    cells.day, cells.start, cells.end, cells.duration, cells.program,
    cells.students, cells.staff, cells.room, cells.confirmed, cells.source,
  ]);

  const byStaff = [...prepared]
    .sort((a, b) => a.staff.localeCompare(b.staff) || dayKey(a.day).localeCompare(dayKey(b.day)) || a.start.localeCompare(b.start))
    .map((cells) => [cells.staff, cells.day, cells.start, cells.end, cells.program, cells.students, cells.room]);

  const byRoom = [...prepared]
    .sort((a, b) => a.room.localeCompare(b.room) || dayKey(a.day).localeCompare(dayKey(b.day)) || a.start.localeCompare(b.start))
    .map((cells) => [cells.room, cells.day, cells.start, cells.end, cells.program, cells.students, cells.staff]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetOf(SHEET_NAMES[0], weekly, 0), SHEET_NAMES[0]);
  XLSX.utils.book_append_sheet(workbook, sheetOf(SHEET_NAMES[1], byStaff, 1), SHEET_NAMES[1]);
  XLSX.utils.book_append_sheet(workbook, sheetOf(SHEET_NAMES[2], byRoom, 1), SHEET_NAMES[2]);
  return workbook;
};

export const scheduleFileName = (date = new Date()) => `polisync-schedule-${formatDateISO(date)}.xlsx`;

/** Writes and hands the file to the browser; nothing leaves the machine. */
export const downloadWorkbook = (workbook, filename = scheduleFileName()) => {
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const url = URL.createObjectURL(new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // The download reads the blob after the click; revoking in the same tick breaks Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

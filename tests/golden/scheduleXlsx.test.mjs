// Golden pins for the Excel writer/reader pair (src/lib/scheduleXlsx.js + scheduleImport.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

import { buildScheduleWorkbook } from '../../src/lib/scheduleXlsx.js';
import { MAX_IMPORT_ROWS, parseWorkbookBuffer } from '../../src/lib/scheduleImport.js';
import { formatDateISO } from '../../src/lib/dates.js';

const students = [{ id: 1, name: 'Noah Adeyemi' }, { id: 2, name: 'Zainab Bello' }];
const staff = [{ id: 'u-t1', name: 'Nadia Okafor' }];
const programs = [{ id: 1, name: 'Speech Therapy' }];

const session = (overrides = {}) => ({
  id: 1,
  title: 'Speech',
  therapistId: 'u-t1',
  studentIds: [1],
  room: 'Room A',
  startHour: 9,
  span: 1,
  programId: 1,
  isConfirmed: false,
  dayOfWeek: 0,
  sessionDate: null,
  source: 'manual',
  ...overrides,
});

const write = (workbook) => XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
const rowsOf = (buffer, sheet) => XLSX.utils.sheet_to_json(XLSX.read(buffer, { type: 'array', cellDates: true }).Sheets[sheet], { header: 1, defval: '' });

const workbookOf = (rows) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Timetable');
  return workbook;
};

test('export writes the three sheets with a header row and one row per session', () => {
  const workbook = buildScheduleWorkbook({ sessions: [session()], students, staff, programs });
  assert.deepEqual(workbook.SheetNames, ['Weekly schedule', 'By staff', 'By rooms']);

  const buffer = write(workbook);
  const weekly = rowsOf(buffer, 'Weekly schedule');
  assert.deepEqual(weekly[0], ['Day', 'Start', 'End', 'Duration', 'Program', 'Students', 'Staff', 'Room', 'Confirmed', 'Source']);
  // Undated: the weekday name from dayOfWeek, never a session id.
  assert.deepEqual(weekly[1], ['Mon', '09:00', '10:00', 1, 'Speech Therapy', 'Noah Adeyemi', 'Nadia Okafor', 'Room A', 'No', 'manual']);

  assert.deepEqual(rowsOf(buffer, 'By staff').slice(0, 2), [
    ['Staff', 'Day', 'Start', 'End', 'Program', 'Students', 'Room'],
    ['Nadia Okafor', 'Mon', '09:00', '10:00', 'Speech Therapy', 'Noah Adeyemi', 'Room A'],
  ]);
  assert.deepEqual(rowsOf(buffer, 'By rooms')[1], ['Room A', 'Mon', '09:00', '10:00', 'Speech Therapy', 'Noah Adeyemi', 'Nadia Okafor']);
});

test('a dated row exports a real date cell that reads back as that day', () => {
  const workbook = buildScheduleWorkbook({
    sessions: [session({ sessionDate: '2026-10-08', dayOfWeek: 3, span: 0.5, startHour: 13.5 })],
    students,
    staff,
    programs,
  });
  const buffer = write(workbook);

  const sheet = XLSX.read(buffer, { type: 'array', cellDates: true }).Sheets['Weekly schedule'];
  assert.equal(sheet.A2.t, 'd');
  assert.equal(formatDateISO(sheet.A2.v), '2026-10-08');
  assert.deepEqual(rowsOf(buffer, 'Weekly schedule')[1].slice(1, 3), ['13:30', '14:00']);

  // And the importer turns the Date cell into the ISO day the edge stores.
  assert.equal(parseWorkbookBuffer(buffer).rows[0].Day, '2026-10-08');
});

test('the import parser reads a generated workbook with headers preserved', () => {
  const workbook = workbookOf([
    ['Day', 'Start', 'End', 'Student', 'Staff', 'Program', 'Room'],
    ['Monday', '09:00', '10:00', 'Noah Adeyemi', 'Nadia Okafor', 'Speech Therapy', 'Room A'],
    ['Tue', '10:00', '', 'Zainab Bello', '', 'Speech Therapy', ''],
  ]);
  const parsed = parseWorkbookBuffer(write(workbook), 'timetable.xlsx');

  assert.equal(parsed.fileName, 'timetable.xlsx');
  assert.equal(parsed.truncated, false);
  assert.deepEqual(parsed.rows, [
    { Day: 'Monday', Start: '09:00', End: '10:00', Student: 'Noah Adeyemi', Staff: 'Nadia Okafor', Program: 'Speech Therapy', Room: 'Room A' },
    { Day: 'Tue', Start: '10:00', End: '', Student: 'Zainab Bello', Staff: '', Program: 'Speech Therapy', Room: '' },
  ]);
});

test('the parser keeps the first 500 rows and says the rest was dropped', () => {
  const rows = Array.from({ length: MAX_IMPORT_ROWS + 20 }, (_, index) => ['Monday', '09:00', `Row ${index + 1}`]);
  const parsed = parseWorkbookBuffer(write(workbookOf([['Day', 'Start', 'Who'], ...rows])));

  assert.equal(parsed.rows.length, MAX_IMPORT_ROWS);
  assert.equal(parsed.truncated, true);
  assert.equal(parsed.rows.at(-1).Who, `Row ${MAX_IMPORT_ROWS}`);
});

test('empty and unreadable input is no rows, not a throw', () => {
  assert.deepEqual(parseWorkbookBuffer(new ArrayBuffer(0)), { fileName: 'import.xlsx', rows: [], truncated: false });
  assert.deepEqual(parseWorkbookBuffer(new Uint8Array([1, 2, 3]), 'broken.xlsx'), { fileName: 'broken.xlsx', rows: [], truncated: false });
});

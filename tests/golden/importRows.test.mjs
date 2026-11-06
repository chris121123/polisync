// Golden tests for the import row parser (phase 13c, plan §5.3): the module
// that turns browser-parsed Excel rows (or vision-extracted rows) into the
// assignments the deterministic validator checks.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_IMPORT_ROWS,
  normalizeHeader,
  parseDayOfWeek,
  parseHour,
  parseImportRows,
  parseSpan,
} from '../../supabase/functions/_shared/importRows.js';

const validRow = {
  Day: 'Monday',
  Start: '09:00',
  End: '10:30',
  Student: 'Ana Cruz',
  Staff: 'Ben Diaz',
  Room: 'Room A',
  Program: 'OT Therapy',
  Notes: 'first session',
};

const codes = (row) => row.errors.map((error) => error.code);

test('weekday names, short forms and 0–4 numbers resolve to Monday = 0', () => {
  assert.equal(parseDayOfWeek('Monday'), 0);
  assert.equal(parseDayOfWeek('friday'), 4);
  assert.equal(parseDayOfWeek('THU'), 3);
  assert.equal(parseDayOfWeek('Mon.'), 0);
  assert.equal(parseDayOfWeek(2), 2);
  assert.equal(parseDayOfWeek('4'), 4);

  assert.equal(parseDayOfWeek('Saturday'), null);
  assert.equal(parseDayOfWeek(5), null);
  assert.equal(parseDayOfWeek(''), null);
});

test('clock and meridiem times resolve to hours from midnight', () => {
  assert.equal(parseHour('9:00'), 9);
  assert.equal(parseHour('09:30'), 9.5);
  assert.equal(parseHour('13:30'), 13.5);
  assert.equal(parseHour('9 AM'), 9);
  assert.equal(parseHour('1 pm'), 13);
  assert.equal(parseHour('12 AM'), 0);
  assert.equal(parseHour('12 PM'), 12);
  assert.equal(parseHour('09:00:00'), 9);
  assert.equal(parseHour('23:30'), 23.5);
  assert.equal(parseHour(9.5), 9.5);

  assert.equal(parseHour('noon'), null);
  assert.equal(parseHour('25:00'), null);
  assert.equal(parseHour('24:00'), null);
  assert.equal(parseHour('24'), null);
  assert.equal(parseHour(24), null);
  assert.equal(parseHour(''), null);
});

test('span comes from duration, else end − start, else defaults to 1', () => {
  assert.equal(parseSpan(1.5), 1.5);
  assert.equal(parseSpan('2'), 2);
  assert.equal(parseSpan(null, 9, 10.5), 1.5);
  assert.equal(parseSpan(undefined, 13, 13.5), 0.5);
  assert.equal(parseSpan(undefined, undefined, undefined), 1);

  assert.equal(parseSpan(0), null);
  assert.equal(parseSpan(5), null);
  assert.equal(parseSpan(null, 10, 9), null);
});

test('a complete row maps every field and reports no errors', () => {
  const { headerMap, rows } = parseImportRows([validRow]);

  assert.deepEqual(headerMap, {
    day: 'Day',
    start: 'Start',
    end: 'End',
    student: 'Student',
    staff: 'Staff',
    room: 'Room',
    program: 'Program',
    notes: 'Notes',
  });
  assert.deepEqual(rows[0].fields, {
    dayOfWeek: 0,
    startHour: 9,
    span: 1.5,
    student: 'Ana Cruz',
    staff: 'Ben Diaz',
    room: 'Room A',
    program: 'OT Therapy',
    notes: 'first session',
  });
  assert.deepEqual(rows[0].errors, []);
  assert.equal(rows[0].rowNo, 1);
});

test('a missing required field is a row error naming the field', () => {
  const { rows } = parseImportRows([{ ...validRow, Student: '   ' }]);

  assert.deepEqual(codes(rows[0]), ['MISSING_FIELD']);
  assert.equal(rows[0].errors[0].field, 'student');
});

test('unknown headers are ignored, not reported', () => {
  const { headerMap, rows } = parseImportRows([{ ...validRow, Colour: 'red', 'Teacher ID': 'T-3', constructor: 'boom' }]);

  assert.equal(headerMap.colour, undefined);
  assert.equal(headerMap.teacherid, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(headerMap, 'constructor'), false);
  assert.deepEqual(rows[0].errors, []);
});

test('an unreadable day, time or span is a row error', () => {
  const { rows } = parseImportRows([
    { ...validRow, Day: 'Caturday' },
    { ...validRow, Start: 'noon' },
    { ...validRow, End: '08:00' },
  ]);

  assert.deepEqual(codes(rows[0]), ['BAD_DAY']);
  assert.deepEqual(codes(rows[1]), ['BAD_TIME']);
  assert.deepEqual(codes(rows[2]), ['BAD_SPAN']);
  assert.equal(rows[0].fields.dayOfWeek, null);
  assert.equal(rows[1].fields.startHour, null);
  assert.equal(rows[2].fields.span, null);
});

test('rows are capped at MAX_IMPORT_ROWS and row numbers stay 1-based', () => {
  const many = Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => ({ ...validRow }));
  const { rows } = parseImportRows(many);

  assert.equal(MAX_IMPORT_ROWS, 500);
  assert.equal(rows.length, MAX_IMPORT_ROWS);
  assert.equal(rows[0].rowNo, 1);
  assert.equal(rows[MAX_IMPORT_ROWS - 1].rowNo, MAX_IMPORT_ROWS);
});

test('header spelling, case and punctuation do not matter', () => {
  const { headerMap, rows } = parseImportRows([{
    ' Day of Week! ': 'wednesday',
    'START TIME': '10:00',
    duration: '2',
    'Student Name': 'Ana Cruz',
    Therapist: 'Ben Diaz',
    ' Room ': 'Room B',
    Programme: 'Speech',
    Comments: 'weekly',
  }]);

  assert.equal(headerMap.day, ' Day of Week! ');
  assert.equal(headerMap.start, 'START TIME');
  assert.equal(headerMap.duration, 'duration');
  assert.equal(headerMap.student, 'Student Name');
  assert.equal(headerMap.staff, 'Therapist');
  assert.equal(headerMap.room, ' Room ');
  assert.equal(headerMap.program, 'Programme');
  assert.equal(headerMap.notes, 'Comments');
  assert.deepEqual(rows[0].fields, {
    dayOfWeek: 2,
    startHour: 10,
    span: 2,
    student: 'Ana Cruz',
    staff: 'Ben Diaz',
    room: 'Room B',
    program: 'Speech',
    notes: 'weekly',
  });
  assert.deepEqual(rows[0].errors, []);
  assert.equal(normalizeHeader('  Room  B  '), 'roomb');
});

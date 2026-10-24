// Pure matchers extracted from GlobalSearch (B9). The component lowercases the query
// once and passes it in, so every case here uses an already-lowercased q.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  matchesStaff, matchesStudent, matchesSession, matchesRoom, matchesAnyKeyword,
} from '../../src/lib/search/matchers.js';

test('matchesStaff: name or role', () => {
  const staff = { name: 'Ana Reyes', role: 'therapist', department: 'Rehab' };
  assert.equal(matchesStaff(staff, 'ana'), true, 'name prefix');
  assert.equal(matchesStaff(staff, 'reyes'), true, 'name suffix');
  assert.equal(matchesStaff(staff, 'therap'), true, 'role substring');
  assert.equal(matchesStaff(staff, 'teacher'), false);
  assert.equal(matchesStaff(staff, 'rehab'), false, 'department is not searched');
});

test('matchesStudent: name, role or diagnosis', () => {
  const student = { name: 'Liam Cruz', role: 'student', diagnosis: 'Autism Spectrum' };
  assert.equal(matchesStudent(student, 'liam'), true);
  assert.equal(matchesStudent(student, 'student'), true);
  assert.equal(matchesStudent(student, 'autism'), true, 'diagnosis is matched lowercased');
  assert.equal(matchesStudent(student, 'speech'), false);
});

test('matchesStudent: a student without a diagnosis never matches on diagnosis', () => {
  // diagnosis is optional. The source guard is `s.diagnosis && ...`, so the result is
  // falsy (undefined / null / '') rather than strictly false — that is current behaviour.
  assert.ok(!matchesStudent({ name: 'Liam Cruz', role: 'student' }, 'autism'));
  assert.ok(!matchesStudent({ name: 'Liam Cruz', role: 'student', diagnosis: null }, 'autism'));
  assert.ok(!matchesStudent({ name: 'Liam Cruz', role: 'student', diagnosis: '' }, 'autism'));
  assert.equal(matchesStudent({ name: 'Liam Cruz', role: 'student' }, 'liam'), true, 'name still matches');
});

test('matchesSession: title only', () => {
  const session = { title: 'Group Play', room: 'Room 5', type: 'speech' };
  assert.equal(matchesSession(session, 'group'), true);
  assert.equal(matchesSession(session, 'room 5'), false, 'room is not searched');
  assert.equal(matchesSession(session, 'speech'), false, 'type is not searched');
});

test('matchesRoom: name or type', () => {
  const room = { name: 'Room 101', type: 'Therapy Room' };
  assert.equal(matchesRoom(room, 'room 101'), true);
  assert.equal(matchesRoom(room, 'therapy'), true);
  assert.equal(matchesRoom(room, 'playschool'), false);
});

test('empty query matches everything', () => {
  assert.equal(matchesStaff({ name: 'Ana Reyes', role: 'therapist' }, ''), true);
  assert.equal(matchesStudent({ name: 'Liam Cruz', role: 'student' }, ''), true);
  assert.equal(matchesSession({ title: 'Speech Therapy' }, ''), true);
  assert.equal(matchesRoom({ name: 'Room 101', type: 'Therapy Room' }, ''), true);
  assert.equal(matchesAnyKeyword('', ['settings', 'preferences']), true);
});

test('matchesAnyKeyword: first keyword containing the query wins', () => {
  assert.equal(matchesAnyKeyword('sett', ['settings', 'preferences']), true);
  assert.equal(matchesAnyKeyword('pref', ['settings', 'preferences']), true);
  assert.equal(matchesAnyKeyword('conflict', ['settings', 'preferences']), false);
  assert.equal(matchesAnyKeyword('theme', ['dark mode', 'theme', 'appearance']), true);
  assert.equal(matchesAnyKeyword('user', ['user management', 'users', 'accounts']), true);
  assert.equal(matchesAnyKeyword('people', ['directory', 'staff', 'people']), true);
  // reversed direction: the keyword must contain the query, not the other way around
  assert.equal(matchesAnyKeyword('user management page', ['user management']), false);
});

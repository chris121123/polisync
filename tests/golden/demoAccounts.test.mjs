import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDemoAccounts, DEMO_ROLE_LABELS } from '../../src/lib/demoAccounts.js';

test('missing or empty env yields no accounts', () => {
  assert.deepEqual(parseDemoAccounts(undefined), []);
  assert.deepEqual(parseDemoAccounts(''), []);
  assert.deepEqual(parseDemoAccounts(null), []);
  assert.deepEqual(parseDemoAccounts('  '), []);
  assert.deepEqual(parseDemoAccounts(';;'), []);
});

test('rows that do not have exactly 3 fields are skipped', () => {
  assert.deepEqual(parseDemoAccounts('admin|demo-admin@example.com'), []);
  assert.deepEqual(parseDemoAccounts('admin|demo-admin@example.com|Demo12345|extra'), []);
  assert.deepEqual(parseDemoAccounts('admin||Demo12345'), []);
  assert.deepEqual(parseDemoAccounts('|demo-admin@example.com|Demo12345'), []);
  assert.deepEqual(parseDemoAccounts('admin|demo-admin@example.com|   '), []);
  assert.deepEqual(
    parseDemoAccounts('admin|demo-admin@example.com|Demo12345;teacher'),
    [{ role: 'admin', email: 'demo-admin@example.com', password: 'Demo12345' }]
  );
});

test('unknown roles are skipped', () => {
  assert.deepEqual(parseDemoAccounts('principal|demo@example.com|Demo12345'), []);
  assert.deepEqual(parseDemoAccounts('constructor|demo@example.com|Demo12345'), []);
});

test('invalid emails are skipped', () => {
  assert.deepEqual(parseDemoAccounts('admin|demo-admin|Demo12345'), []);
  assert.deepEqual(parseDemoAccounts('admin|demo @example.com|Demo12345'), []);
  assert.deepEqual(parseDemoAccounts('admin|demo@example|Demo12345'), []);
});

test('roles are de-duplicated, first wins, input order preserved', () => {
  const raw = [
    'teacher|t1@example.com|One',
    'admin|a1@example.com|Two',
    'teacher|t2@example.com|Three',
    'parent|p1@example.com|Four',
  ].join(';');

  assert.deepEqual(parseDemoAccounts(raw), [
    { role: 'teacher', email: 't1@example.com', password: 'One' },
    { role: 'admin', email: 'a1@example.com', password: 'Two' },
    { role: 'parent', email: 'p1@example.com', password: 'Four' },
  ]);
});

test('at most five accounts are returned', () => {
  // six valid roles would be needed to exceed the cap, so repeat one role's slot with extra unknown-safe rows
  const raw = [
    'superadmin|s@example.com|One',
    'admin|a@example.com|Two',
    'teacher|t@example.com|Three',
    'therapist|th@example.com|Four',
    'parent|p@example.com|Five',
    'admin|x@example.com|Six',
  ].join(';');

  assert.deepEqual(
    parseDemoAccounts(raw).map((a) => a.role),
    ['superadmin', 'admin', 'teacher', 'therapist', 'parent']
  );
});

test('role is lower-cased and trimmed, password is not', () => {
  assert.deepEqual(parseDemoAccounts('  SuperAdmin  |  demo@example.com  |  Demo12345 '), [
    { role: 'superadmin', email: 'demo@example.com', password: '  Demo12345 ' },
  ]);
});

test('role labels cover every accepted role', () => {
  assert.deepEqual(Object.keys(DEMO_ROLE_LABELS), ['superadmin', 'admin', 'teacher', 'therapist', 'parent']);
  assert.equal(DEMO_ROLE_LABELS.superadmin, 'Super Admin');
});

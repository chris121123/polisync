// Golden fixture captured from src/lib/auditLog.js before the refactor (see _source inside
// tests/fixtures/auditLog.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { auditLine } from '../../src/lib/auditLog.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/auditLog.json', import.meta.url), 'utf8'));

// JSON round-trip drops `target: undefined` (id present, staff row absent) so it matches the
// fixture's missing key. `target: null` survives, so undefined and null stay distinguishable.
const normalize = (value) => JSON.parse(JSON.stringify(value));

for (const { log, expected } of fixture.cases) {
  test(`auditLine(${JSON.stringify(log)})`, () => {
    assert.deepEqual(normalize(auditLine(log, fixture.staff)), expected);
  });
}
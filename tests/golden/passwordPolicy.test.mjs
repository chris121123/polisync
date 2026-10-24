// Golden fixture captured from src/lib/passwordPolicy.js before the refactor (see _source inside
// tests/fixtures/passwordPolicy.json). Rule functions are not stored: only ids and labels.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { validatePassword, isPasswordValid } from '../../src/lib/passwordPolicy.js';

const { cases } = JSON.parse(readFileSync(new URL('../fixtures/passwordPolicy.json', import.meta.url), 'utf8'));

for (const { input, failed, valid } of cases) {
  test(`validatePassword(${JSON.stringify(input)})`, () => {
    assert.deepEqual(validatePassword(input).map(({ id, label }) => ({ id, label })), failed);
    assert.equal(isPasswordValid(input), valid);
  });
}
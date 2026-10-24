// Golden fixture captured from src/lib/sessionDay.js before the refactor (see _source inside
// tests/fixtures/sessionDay.json). The fixture uses local datetime strings for sessionDate, so the
// day index does not depend on the machine timezone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DAY_NAMES, sessionDayIndex, sessionDayName, formatHour, formatTime } from '../../src/lib/sessionDay.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/sessionDay.json', import.meta.url), 'utf8'));

test('DAY_NAMES', () => {
  assert.deepEqual([...DAY_NAMES], fixture.dayNames);
});

for (const { session, expected } of fixture.sessions) {
  test(`sessionDay(${JSON.stringify(session)})`, () => {
    assert.equal(sessionDayIndex(session), expected.index);
    assert.equal(sessionDayName(session), expected.name);
  });
}

for (const { hour, span, formatHour: expectedHour, formatTime: expectedTime } of fixture.times) {
  test(`formatHour/formatTime(${hour}, ${span})`, () => {
    assert.equal(formatHour(hour), expectedHour);
    assert.equal(formatTime(hour, span), expectedTime);
  });
}
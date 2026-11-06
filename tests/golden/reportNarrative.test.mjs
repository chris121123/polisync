// Golden tests for the report provenance guard (plan D7, phase 13d): a brief
// may only repeat numbers the edge computed.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractNumbers,
  flattenNumbers,
  numbersSubset,
  sanitizeNarrative,
} from '../../supabase/functions/_shared/reportNarrative.js';

test('extractNumbers keeps figures, strips thousands separators and percent signs', () => {
  assert.deepEqual(
    extractNumbers('1,250 sessions across 3.5 days; 40% were unconfirmed.'),
    [1250, 3.5, 40],
  );
});

test('numbersSubset passes when every figure is a metric value', () => {
  const metrics = [
    { id: 'sessions', label: 'Sessions', value: 12 },
    { id: 'nested', label: 'Nested', value: { total: 4, list: [{ value: 40 }] } },
  ];
  assert.deepEqual(numbersSubset('12 sessions in 4 days, 40% covered.', metrics), []);
});

test('sanitizeNarrative replaces an invented figure and lists it', () => {
  const metrics = [{ id: 'sessions', label: 'Sessions', value: 12 }];
  const result = sanitizeNarrative('12 sessions and 99 unresolved conflicts.', metrics);
  assert.equal(result.text, '12 sessions and N/A unresolved conflicts.');
  assert.deepEqual(result.unknownNumbers, [99]);
});

test('dates and clock times are labels, not figures', () => {
  const metrics = [{ id: 'sessions', label: 'Sessions', value: 12 }];
  const narrative = 'On 2026-10-01 at 09:00 there were 12 sessions.';
  assert.deepEqual(extractNumbers(narrative), [12]);
  assert.deepEqual(sanitizeNarrative(narrative, metrics), { text: narrative, unknownNumbers: [] });
  assert.deepEqual(extractNumbers('In 2026 there were 12 sessions.'), [12]);
});

test('nested metric objects contribute their numeric leaves only', () => {
  const metrics = { metrics: [{ value: 7, label: 'Seven' }], meta: { days: 2 } };
  assert.deepEqual(flattenNumbers(metrics), [7, 2]);
  assert.deepEqual(numbersSubset('7 actions over 2 days.', metrics), []);
});

test('aliases and ids are not read as figures', () => {
  const metrics = [{ id: 'sessions', label: 'Sessions', value: 3 }];
  assert.deepEqual(extractNumbers('T-01 handled 3 sessions; S-02 handled 0.'), [3, 0]);
  assert.deepEqual(sanitizeNarrative('T-01 handled 3 sessions.', metrics), {
    text: 'T-01 handled 3 sessions.',
    unknownNumbers: [],
  });
});

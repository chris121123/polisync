// Golden tests for the AI alias map (plan D2): deterministic pseudonyms,
// longest-first replacement, email handling, reverse mapping and cap math.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAliasMap,
  estimateTokens,
  withinCap,
} from '../../supabase/functions/_shared/aliases.js';

const roster = [
  { kind: 'program', id: 3, name: 'Blue Program' },
  { kind: 'staff', id: 'f3a1', name: 'Ben Cruz', email: 'ben@polisync.test' },
  { kind: 'student', id: 10, name: 'Ana Marie Santos' },
  { kind: 'student', id: 2, name: 'Ana Santos', email: 'ana@polisync.test' },
  { kind: 'room', id: 1, name: 'Room 3' },
];

test('aliases are deterministic by kind then id, zero-padded', () => {
  const forward = createAliasMap(roster);
  const shuffled = createAliasMap([...roster].reverse());

  assert.equal(forward.forward('Ana Santos'), 'S-01');
  assert.equal(forward.forward('Ana Marie Santos'), 'S-02');
  assert.equal(forward.forward('Ben Cruz'), 'T-01');
  assert.equal(forward.forward('Room 3'), 'R-01');
  assert.equal(forward.forward('Blue Program'), 'P-01');
  assert.equal(shuffled.forward('Ana Santos'), 'S-01');
  assert.equal(shuffled.forward('Blue Program'), 'P-01');
});

test('overlapping names: the longest match wins', () => {
  const map = createAliasMap([
    { kind: 'student', id: 1, name: 'Ana' },
    { kind: 'student', id: 2, name: 'Ana Marie' },
  ]);

  assert.equal(map.forward('Ana Marie and Ana'), 'S-02 and S-01');
});

test('word boundaries keep short names out of longer words, hyphens still map', () => {
  const map = createAliasMap([
    { kind: 'student', id: 1, name: 'Ana' },
    { kind: 'student', id: 2, name: 'Ana Marie' },
  ]);

  assert.equal(map.forward('Banana'), 'Banana');
  assert.equal(map.forward('Ana-Marie'), 'S-01-Marie');
});

test('forward then reverse is a round trip', () => {
  const map = createAliasMap(roster);
  const text = 'Ana Marie Santos has Room 3 for Blue Program with Ben Cruz';
  const aliased = map.forward(text);

  assert.equal(aliased, 'S-02 has R-01 for P-01 with T-01');
  assert.equal(map.reverse(aliased), text);
});

test('emails are aliased; matches are case-insensitive', () => {
  const map = createAliasMap(roster);

  assert.equal(map.forward('mail ANA@POLISYNC.TEST'), 'mail S-01');
  assert.equal(map.hasReal('ben@polisync.test'), true);
  assert.equal(map.forward('ANA SANTOS'), 'S-01');
  assert.equal(map.hasReal('ANA SANTOS'), true);
});

test('unknown text is untouched, aliases reverse only in canon form', () => {
  const map = createAliasMap(roster);

  assert.equal(map.forward('nobody here'), 'nobody here');
  assert.equal(map.hasReal('nobody here'), false);
  assert.equal(map.forward(''), '');
  assert.equal(map.forward(undefined), '');
  assert.equal(map.reverse(undefined), '');
  assert.equal(map.reverse('s-01'), 's-01');
});

test('regex metacharacters in names are escaped', () => {
  const map = createAliasMap([{ kind: 'room', id: 1, name: 'Room A (2)' }]);

  assert.equal(map.forward('Book Room A (2) now'), 'Book R-01 now');
  assert.equal(map.reverse('Book R-01 now'), 'Book Room A (2) now');
});

test('estimateTokens and withinCap handle empty and missing input', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens(undefined), 0);
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcde'), 2);

  assert.equal(withinCap(900, 1000, 100), true);
  assert.equal(withinCap(900, 1000, 101), false);
  assert.equal(withinCap(undefined, null, undefined), true);
  assert.equal(withinCap(5, 0, 0), false);
});

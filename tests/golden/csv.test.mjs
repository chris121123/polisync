// Golden pins for the System Health CSV serializer (src/lib/csv.js).
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCsv } from '../../src/lib/csv.js';

// Drops the header line and the trailing CRLF, leaving one cell's text.
const onlyCell = (value) => toCsv([{ v: value }]).slice('v\r\n'.length, -'\r\n'.length);

test('header is the union of ragged rows, in first-seen order, with CRLF endings', () => {
  const csv = toCsv([
    { id: 1, name: 'Amina' },
    { id: 2, name: 'Chidi', note: 'late column' },
  ]);
  assert.equal(csv, 'id,name,note\r\n1,Amina,\r\n2,Chidi,late column\r\n');
  // Every record ends CRLF; no lone LF sneaks in when no cell holds a newline.
  assert.equal(csv.split('\r\n').length, 4);
  assert.ok(!/[^\r]\n/.test(csv), 'a record ended with a bare LF');
});

test('commas, quotes and newlines are quoted per RFC 4180', () => {
  assert.equal(onlyCell('Bello, Kemi'), '"Bello, Kemi"');
  assert.equal(onlyCell('say "hi"'), '"say ""hi"""');
  assert.equal(onlyCell('line one\nline two'), '"line one\nline two"');
  assert.equal(onlyCell('plain'), 'plain');
});

test('null and undefined cells are empty, not the words', () => {
  assert.equal(toCsv([{ a: null, b: undefined, c: 0 }]), 'a,b,c\r\n,,0\r\n');
});

test('objects and arrays serialise as JSON', () => {
  assert.equal(onlyCell({ source: 'admin-console' }), '"{""source"":""admin-console""}"');
  assert.equal(onlyCell([1, 2]), '"[1,2]"');
});

test('leading = + - @, tab and CR are neutralised', () => {
  assert.equal(onlyCell('=1+1'), "'=1+1");
  assert.equal(onlyCell('+SUM(A1)'), "'+SUM(A1)");
  assert.equal(onlyCell('-2'), "'-2");
  assert.equal(onlyCell('@ref'), "'@ref");
  assert.equal(onlyCell('\tx'), "'\tx");
  // A CR also forces quoting, so the quote sits inside the quoted cell.
  assert.equal(onlyCell('\rx'), '"\'\rx"');
});

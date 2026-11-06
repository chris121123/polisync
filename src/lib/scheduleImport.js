// Excel import parsing for the schedule wizard (plan §5.3): the browser reads the
// workbook and posts plain row objects, so the edge never sees an xlsx (D2).
// Plain ESM with no DOM APIs, so tests/golden can load it under Node.
import * as XLSX from 'xlsx';
import { formatDateISO } from './dates.js';

/** Hard cap shared with the edge's own MAX_IMPORT_ROWS. */
export const MAX_IMPORT_ROWS = 500;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** 0–4 (Monday = 0) → 'Mon'; anything else → ''. */
export const dayLabel = (index) => {
  if (index === null || index === undefined || index === '') return '';
  const value = Number(index);
  return Number.isInteger(value) && value >= 0 && value <= 4 ? WEEKDAYS[value] : '';
};

/** 9.5 → '09:30'. 24-hour, the spelling the import parser understands. */
export const formatHour = (hour) => {
  if (hour === null || hour === undefined || hour === '') return '';
  const value = Number(hour);
  if (!Number.isFinite(value)) return '';
  const minutes = Math.round(value * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

// A Date cell becomes an ISO day: the edge stores days, and JSON would send UTC text anyway.
const plain = (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
  key,
  value instanceof Date ? formatDateISO(value) : value,
]));

/**
 * First sheet of a workbook → `{ fileName, rows, truncated }`.
 * Headers are preserved verbatim; the edge maps them to fields.
 * An unreadable file is an empty import, not an exception (the wizard says "no rows").
 */
export const parseWorkbookBuffer = (buffer, fileName = 'import.xlsx') => {
  let rows = [];
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ''];
    rows = sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '' }) : [];
  } catch {
    rows = [];
  }

  const objects = rows.filter((row) => row && typeof row === 'object' && !Array.isArray(row));
  return {
    fileName,
    rows: objects.slice(0, MAX_IMPORT_ROWS).map(plain),
    truncated: objects.length > MAX_IMPORT_ROWS,
  };
};

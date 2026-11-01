// CSV snapshot serializer for the System Health export panel.

// A leading =, +, -, @, tab or CR makes a spreadsheet run the cell as a formula,
// so those cells are prefixed with a quote (CSV injection guard).
const FORMULA_LEAD = /^[=+\-@\t\r]/;

const cell = (value) => {
  if (value == null) return '';
  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const safe = FORMULA_LEAD.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

// Union of keys across rows, in first-seen order; CRLF line endings per RFC 4180.
export const toCsv = (rows) => {
  if (!rows?.length) return '';
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row ?? {})))];
  const line = (values) => values.map(cell).join(',');
  return [line(columns), ...rows.map((row) => line(columns.map((column) => row[column])))].join('\r\n') + '\r\n';
};

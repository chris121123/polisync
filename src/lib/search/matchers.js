// Pure match predicates for GlobalSearch. `q` arrives already lowercased.
// `s.role` is read without optional chaining on purpose: every staff/student row the
// provider produces has a role, and changing that here would change search behaviour.
export const matchesStaff = (s, q) =>
  s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);

export const matchesStudent = (s, q) =>
  s.name.toLowerCase().includes(q) ||
  s.role.toLowerCase().includes(q) ||
  (s.diagnosis && s.diagnosis.toLowerCase().includes(q));

export const matchesSession = (s, q) => s.title.toLowerCase().includes(q);

export const matchesRoom = (r, q) =>
  r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);

export const matchesAnyKeyword = (q, keywords) => keywords.some(k => k.includes(q));

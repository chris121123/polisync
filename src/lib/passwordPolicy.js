// Deno cannot import this module on the Dashboard deploy path: supabase/functions/admin-create-user/index.ts keeps its own copy of these 3 rules; edit both.
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'At least 1 uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'At least 1 number', test: (p) => /[0-9]/.test(p) },
];

export const validatePassword = (pwd) => PASSWORD_RULES.filter((r) => !r.test(pwd || ''));

export const isPasswordValid = (pwd) => validatePassword(pwd).length === 0;

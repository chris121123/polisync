// demo accounts come from VITE_DEMO_ACCOUNTS: role|email|password;role|email|password;…
export const DEMO_ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  teacher: 'Teacher',
  therapist: 'Therapist',
  parent: 'Parent',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_DEMO_ACCOUNTS = 5;

export function parseDemoAccounts(raw) {
  if (!raw) return [];

  const accounts = [];
  for (const row of raw.split(';')) {
    const parts = row.split('|');
    if (parts.length !== 3) continue;

    const role = parts[0].trim().toLowerCase();
    const email = parts[1].trim();
    const password = parts[2]; // credential: never trimmed

    if (!role || !email || !password.trim()) continue;
    if (!Object.hasOwn(DEMO_ROLE_LABELS, role)) continue;
    if (!EMAIL_RE.test(email)) continue;
    if (accounts.some((account) => account.role === role)) continue;
    if (accounts.length >= MAX_DEMO_ACCOUNTS) break;

    accounts.push({ role, email, password });
  }
  return accounts;
}

// Helper to filter eligible therapists and teachers (exclude parents, admins, superadmins)
export const isTherapistOrTeacher = (s) => {
  if (!s) return false;
  const appRole = (s.app_role || '').toLowerCase();
  const role = (s.role || '').toLowerCase();

  // Explicitly exclude parent and admin roles
  if (appRole === 'parent' || role === 'parent') return false;
  if (['admin', 'superadmin', 'administrator', 'super administrator'].includes(appRole)) return false;
  if (['admin', 'administrator', 'super administrator'].includes(role)) return false;

  // If app_role is defined, must be therapist or teacher
  if (appRole) {
    return ['therapist', 'teacher'].includes(appRole);
  }

  // Fallback if app_role is not populated
  return Boolean(s.role);
};

// Availability rows for a date, limited to therapists and teachers.
// UNIQUE(staff_id, available_date) on the table, so no dedupe needed.
export const countAvailableStaff = (staff, staffAvailability, dateISO) => {
  if (!staff?.length || !staffAvailability?.length || !dateISO) return 0;
  const eligibleIds = new Set(staff.filter(isTherapistOrTeacher).map(s => s.id));
  return staffAvailability.filter(a => a.available_date === dateISO && eligibleIds.has(a.staff_id)).length;
};

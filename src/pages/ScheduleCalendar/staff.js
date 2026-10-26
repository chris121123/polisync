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

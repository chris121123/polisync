// Role colour is defined once; ADR-017 forbids role colours anywhere else.
export const ROLE_COLORS = {
  superadmin: { text: 'text-role-superadmin', bg: 'bg-role-superadmin/10', dot: 'bg-role-superadmin' },
  admin:      { text: 'text-role-admin',      bg: 'bg-role-admin/10',      dot: 'bg-role-admin' },
  teacher:    { text: 'text-role-teacher',    bg: 'bg-role-teacher/10',    dot: 'bg-role-teacher' },
  therapist:  { text: 'text-role-therapist',  bg: 'bg-role-therapist/10',  dot: 'bg-role-therapist' },
  parent:     { text: 'text-role-parent',     bg: 'bg-role-parent/10',     dot: 'bg-role-parent' },
};

export const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  teacher: 'Teacher',
  therapist: 'Therapist',
  parent: 'Parent',
};

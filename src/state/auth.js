// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';
import { validatePassword } from '../lib/passwordPolicy';

export const createAuthActions = ({
  user,
  appRole,
  setUser,
  setAppRole,
  setParentChildren,
  setMyAssignments,
  setNotifications,
  loadCoreData,
  notify,
}) => {
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }

    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', data.user.id).single(),
      supabase.from('user_roles').select('role').eq('user_id', data.user.id).single(),
    ]);

    if (!profileRes.data || !roleRes.data?.role) {
      await supabase.auth.signOut();
      throw new Error('Your account is not provisioned. Contact an administrator.');
    }

    if (profileRes.data.is_active === false) {
      await supabase.auth.signOut();
      throw new Error('Your account has been deactivated. Contact an administrator.');
    }

    const finalRole = roleRes.data.role;
    setAppRole(finalRole);
    setUser({ ...profileRes.data, app_role: finalRole });

    await loadCoreData();

    return { ...profileRes.data, app_role: finalRole };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAppRole(null);
    setParentChildren([]);
    setMyAssignments([]);
    setNotifications([]);
  };

  const changePassword = async (newPassword) => {
    const failing = validatePassword(newPassword);
    if (failing.length > 0) {
      const message = `Password must have: ${failing.map(r => r.label).join(', ')}.`;
      notify(message, 'error');
      throw new Error(message);
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    
    // Once successful, remove the flag
    const { error: dbError } = await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id);
    if (dbError) throw dbError;
    
    setUser(prev => ({ ...prev, must_change_password: false }));
    notify('Password changed successfully!', 'success');
  };

  const requestPasswordReset = async (email) => {
    if (!supabase) return false;
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    return true;
  };

  const verifyPassword = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  };

  const isSuperAdmin = () => appRole === 'superadmin';
  const isAdmin = () => appRole === 'admin' || appRole === 'superadmin';
  const isParent = () => appRole === 'parent';
  const isTeacher = () => appRole === 'teacher';
  const isTherapist = () => appRole === 'therapist';
  const isTherapistOrTeacher = () => appRole === 'therapist' || appRole === 'teacher';

  return {
    login,
    logout,
    changePassword,
    requestPasswordReset,
    verifyPassword,
    isSuperAdmin,
    isAdmin,
    isParent,
    isTeacher,
    isTherapist,
    isTherapistOrTeacher,
  };
};

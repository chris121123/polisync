// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';
import { invokeError } from './errors';

export const createUserAdminActions = ({
  user,
  staff,
  setStaff,
  setUser,
  setAppRole,
  notify,
  createNotification,
  notifyRoleUsers,
}) => {
  /**
   * Admin-only: Create a new user account via the Edge Function.
   * The Edge Function uses the service_role key securely on the server.
   */
  const adminCreateUser = async (userData) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role,
          department: userData.department || 'General',
          phone: userData.phone || '',
        },
      });

      if (error) throw new Error(await invokeError(error));
      if (!data?.success) throw new Error(data?.error || 'Failed to create user');

      // Optimistically add the new user to the staff list for instant UI
      const roleDisplayMap = {
        admin: 'Administrator',
        teacher: 'Teacher',
        therapist: 'Therapist',
        parent: 'Parent',
      };
      const newStaffEntry = {
        id: data.user?.id,
        name: userData.name,
        email: userData.email,
        role: roleDisplayMap[userData.role] || 'Staff',
        app_role: userData.role,
        department: userData.department || 'General',
        phone: userData.phone || '',
        type: 'Staff',
        status: 'Active',
        is_active: true,
        must_change_password: true,
      };
      setStaff(prev => [...prev, newStaffEntry]);

      notify(`User "${userData.name}" created successfully`, 'success');

      // Send in-app notification to the new user about their account
      if (data.user?.id) {
        createNotification({
          userId: data.user.id,
          title: 'Welcome to PoliSync!',
          message: `Your account has been created as a ${roleDisplayMap[userData.role] || 'Staff'} member. Please change your password on first login.`,
          type: 'success',
        });
      }

      // Notify other admins about the new user
      notifyRoleUsers(['admin', 'superadmin'], {
        title: 'New User Created',
        message: `"${userData.name}" (${roleDisplayMap[userData.role] || 'Staff'}) has been added to the system.`,
        type: 'info',
      });

      return data;
    } catch (error) {
      notify(error.message, 'error');
      throw error;
    }
  };

  const updateUserRole = async (targetUserId, newRole) => {
    try {
      const { error } = await supabase.rpc('set_user_role', { p_target: targetUserId, p_role: newRole });
      if (error) throw error;

      // Map app role to display role (Job Title)
      const roleDisplayMap = {
        superadmin: 'Super Administrator',
        admin: 'Administrator',
        teacher: 'Teacher',
        therapist: 'Therapist',
        parent: 'Parent',
      };
      const displayRole = roleDisplayMap[newRole] || 'Staff';

      // Optimistically update the local staff list for instant UI feedback
      setStaff(prev => prev.map(s => s.id === targetUserId ? { ...s, app_role: newRole, role: displayRole } : s));

      // If the user updated their own role, update the local user state
      if (user && user.id === targetUserId) {
        setAppRole(newRole);
        setUser(prev => ({ ...prev, app_role: newRole, role: displayRole }));
      }

      notify(`Role updated to ${newRole}`);

      // Notify the target user about their role change
      if (user?.id !== targetUserId) {
        createNotification({
          userId: targetUserId,
          title: 'Your Role Has Changed',
          message: `Your role has been updated to ${displayRole}. Your permissions have been adjusted accordingly.`,
          type: 'info',
        });
      }

      // Notify admins about the role change
      const targetUser = staff.find(s => s.id === targetUserId);
      notifyRoleUsers(['admin', 'superadmin'], {
        title: 'User Role Updated',
        message: `${targetUser?.name || 'A user'}'s role was changed to ${displayRole}.`,
        type: 'info',
      });
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  /**
   * Admin-only: Delete a user via the Edge Function
   */
  const adminDeleteUser = async (userId) => {
    try {
      // Optimistically remove from UI immediately
      setStaff(prev => prev.filter(s => s.id !== userId));
      notify('User deleted successfully');

      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId }
      });

      if (error) throw new Error(await invokeError(error));
      if (data?.error) throw new Error(data.error);

    } catch (error) {
      // Rollback: re-fetch staff if the server-side delete actually failed
      console.error('Error deleting user:', error);
      const { data: refreshed } = await supabase.from('profiles').select('*');
      if (refreshed) setStaff(refreshed);
      notify('Failed to delete user: ' + error.message, 'error');
      throw error;
    }
  };

  /**
   * Admin-only: Toggle a user's is_active status.
   */
  const toggleUserActive = async (targetUserId, isActive) => {
    try {
      const { error } = await supabase.rpc('set_user_active', { p_target: targetUserId, p_active: isActive });
      if (error) throw error;

      setStaff(prev => prev.map(s =>
        s.id === targetUserId ? { ...s, is_active: isActive } : s
      ));
      notify(isActive ? 'User activated' : 'User deactivated');

      // Notify the target user about their status change
      createNotification({
        userId: targetUserId,
        title: isActive ? 'Account Activated' : 'Account Deactivated',
        message: isActive
          ? 'Your account has been reactivated. You can now access all features.'
          : 'Your account has been deactivated. Please contact an administrator.',
        type: isActive ? 'success' : 'warning',
      });
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const deleteAccount = (userId) => {
    setStaff(prev => prev.filter(s => s.id !== userId));
    setUser(null);
  };

  return {
    adminCreateUser,
    updateUserRole,
    adminDeleteUser,
    toggleUserActive,
    deleteAccount,
  };
};

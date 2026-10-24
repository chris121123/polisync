// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';
import { invokeError } from './errors';

export const createNotificationActions = ({ setNotifications, user, staff }) => {
  const createNotification = async (notifData) => {
    try {
      const validTypes = ['info', 'success', 'warning', 'error', 'schedule'];
      const safeType = validTypes.includes(notifData.type) ? notifData.type : 'info';
      console.log('[Notification] Inserting:', { ...notifData, type: safeType });
      const { data, error } = await supabase.from('notifications').insert([{
        user_id: notifData.userId,
        title: notifData.title,
        message: notifData.message,
        type: safeType,
        related_id: notifData.relatedId,
      }]).select();
      if (error) {
        console.error('[Notification] Insert failed:', error.message, error.details, error.hint);
        throw error;
      }
      console.log('[Notification] Inserted successfully:', data);
    } catch (error) {
      console.error('[Notification] createNotification error:', error);
    }
  };

  /**
   * Send an in-app notification to all users matching a given role.
   * @param {string|string[]} roles - 'admin', 'therapist', etc. or array of roles
   * @param {{ title: string, message: string, type?: string, relatedId?: string }} notifData
   */
  const notifyRoleUsers = async (roles, notifData) => {
    try {
      const roleList = Array.isArray(roles) ? roles : [roles];
      // Get user IDs for the target roles
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', roleList);
      if (!roleRows?.length) return;

      // Don't notify the current user (they already see the toast)
      const targetIds = roleRows
        .map(r => r.user_id)
        .filter(id => id !== user?.id);
      if (!targetIds.length) return;

      const rows = targetIds.map(uid => ({
        user_id: uid,
        title: notifData.title,
        message: notifData.message,
        type: notifData.type || 'info',
        related_id: notifData.relatedId || null,
      }));
      await supabase.from('notifications').insert(rows);
    } catch (error) {
      console.error('notifyRoleUsers error:', error);
    }
  };

  /** Mark a single notification as read */
  const markNotificationRead = async (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    } catch (error) {
      console.error('markNotificationRead error:', error);
    }
  };

  /** Mark all notifications as read for the current user */
  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await supabase.from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('markAllNotificationsRead error:', error);
    }
  };

  /** Delete a single notification */
  const deleteNotification = async (notifId) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    try {
      await supabase.from('notifications').delete().eq('id', notifId);
    } catch (error) {
      console.error('deleteNotification error:', error);
    }
  };

  const dispatchNotification = async (recipientId, message) => {
    try {
      // Find user in profiles (stored in staff array currently)
      const user = staff.find(s => String(s.id) === String(recipientId));
      if (!user) return;

      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'both',
          recipient: { phone: user.phone || '', email: user.email || '' },
          message: message,
          subject: 'Polisync Schedule Update'
        }
      });
      if (error) throw new Error(await invokeError(error));
    } catch (err) {
      console.error('Notification dispatch failed', err);
    }
  };

  return {
    createNotification,
    notifyRoleUsers,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    dispatchNotification,
  };
};

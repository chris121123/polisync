// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';

export const createSessionActions = ({
  sessions,
  setSessions,
  notify,
  dispatchNotification,
  createNotification,
  notifyRoleUsers,
}) => {
  const addSession = async (session) => {
    try {
      const insertPayload = {
        title: session.title,
        therapist_id: session.therapistId,
        student_ids: session.studentIds || [],
        room: session.room,
        start_hour: session.startHour,
        span: session.span,
        type: session.type,
      };
      if (session.sessionDate) insertPayload.session_date = session.sessionDate;
      if (session.dayOfWeek !== undefined) insertPayload.day_of_week = session.dayOfWeek;
      else if (session.sessionDate) {
        // Mon=0…Fri=4 from local date parts; weekends stay unset (DB CHECK allows 0–4).
        const jsDay = new Date(`${session.sessionDate}T00:00:00`).getDay();
        if (jsDay >= 1 && jsDay <= 5) insertPayload.day_of_week = jsDay - 1;
      }

      const { data, error } = await supabase.from('sessions').insert([insertPayload]).select();

      if (error) throw error;
      if (data) {
        setSessions(prev => [...prev, {
          id: data[0].id,
          title: data[0].title,
          therapistId: data[0].therapist_id,
          studentIds: data[0].student_ids,
          room: data[0].room,
          startHour: data[0].start_hour,
          span: data[0].span,
          type: data[0].type,
          sessionDate: data[0].session_date || null,
          dayOfWeek: data[0].day_of_week,
        }]);
        notify('Session scheduled successfully');

        // Notify Therapist via external dispatch + in-app notification
        if (data[0].therapist_id) {
          dispatchNotification(data[0].therapist_id, `New session "${data[0].title}" has been scheduled for you at ${data[0].start_hour}:00.`);
          createNotification({
            userId: data[0].therapist_id,
            title: 'New Session Assigned',
            message: `"${data[0].title}" scheduled at ${data[0].start_hour}:00 in ${data[0].room}.`,
            type: 'schedule',
          });
        }

        // Notify admins about the new session
        notifyRoleUsers(['admin', 'superadmin'], {
          title: 'New Session Created',
          message: `"${data[0].title}" was scheduled at ${data[0].start_hour}:00 in ${data[0].room}.`,
          type: 'info',
        });
      }
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const moveSession = async (sessionId, newStartHour, newRoom) => {
    try {
      const { error } = await supabase.from('sessions')
        .update({ start_hour: newStartHour, room: newRoom })
        .eq('id', sessionId);

      if (error) throw error;
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, startHour: newStartHour, room: newRoom || s.room } : s));
      notify('Session moved');

      // Notify Therapist via external dispatch + in-app notification
      const session = sessions.find(s => s.id === sessionId);
      if (session && session.therapistId) {
        dispatchNotification(session.therapistId, `Your session "${session.title}" has been moved to ${newStartHour}:00 in room ${newRoom || session.room}.`);
        createNotification({
          userId: session.therapistId,
          title: 'Session Rescheduled',
          message: `"${session.title}" moved to ${newStartHour}:00 in ${newRoom || session.room}.`,
          type: 'schedule',
        });
      }

      // Notify admins
      notifyRoleUsers(['admin', 'superadmin'], {
        title: 'Session Rescheduled',
        message: `"${session?.title || 'A session'}" was moved to ${newStartHour}:00.`,
        type: 'info',
      });
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
      const session = sessions.find(s => s.id === sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      notify('Session cancelled');

      // Notify Therapist via external dispatch + in-app notification
      if (session && session.therapistId) {
        dispatchNotification(session.therapistId, `Your session "${session.title}" has been cancelled.`);
        createNotification({
          userId: session.therapistId,
          title: 'Session Cancelled',
          message: `"${session.title}" has been cancelled.`,
          type: 'warning',
        });
      }

      // Notify admins
      notifyRoleUsers(['admin', 'superadmin'], {
        title: 'Session Cancelled',
        message: `"${session?.title || 'A session'}" has been cancelled.`,
        type: 'warning',
      });
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const fetchSessionNotes = async () => {
    const { data } = await supabase
      .from('session_notes')
      .select('*, sessions(*), students(*)')
      .order('created_at', { ascending: false });
    return data;
  };

  return { addSession, moveSession, deleteSession, fetchSessionNotes };
};

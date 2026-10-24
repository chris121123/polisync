// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';

export const createSettingsActions = ({ setLoading, setSessions, setStudents, setRooms, setStaff, user }) => {
  const clearDatabase = async () => {
    setLoading(true);
    try {
      // 1. Delete all sessions first (foreign keys)
      await supabase.from('sessions').delete().neq('id', -1);
      // 2. Delete all students
      await supabase.from('students').delete().neq('id', -1);
      // 3. Delete all rooms
      await supabase.from('rooms').delete().neq('id', -1);
      // 4. Delete all profiles except the current logged-in user
      if (user?.id) {
        await supabase.from('profiles').delete().neq('id', user.id);
      } else {
        await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // Update local state
      setSessions([]);
      setStudents([]);
      setRooms([]);
      setStaff(user ? [user] : []);

      console.log('Database cleared successfully');
    } catch (error) {
      console.error('Error clearing database:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSchedulingSettings = async (values, id) => {
    if (!supabase) return { error: new Error('Database connection unavailable') };
    const { error } = await supabase
      .from('scheduling_settings')
      .update({
        operating_start_time: values.operating_start_time,
        operating_end_time: values.operating_end_time,
        allow_overbook: values.allow_overbook,
        max_daily_hours_per_student: Number(values.max_daily_hours_per_student),
        auto_schedule_enabled: values.auto_schedule_enabled,
        min_break_minutes: Number(values.min_break_minutes),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id || 1);
    return { error };
  };

  const checkConnection = async () => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  };

  return { clearDatabase, saveSchedulingSettings, checkConnection };
};

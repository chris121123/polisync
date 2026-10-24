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

  return { clearDatabase };
};

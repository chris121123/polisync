// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';

export const createRequirementsActions = ({ setStudentPrograms, setStudentAvailability, notify }) => {
  const addStudentProgram = async ({
    studentId,
    programId,
    sessionsPerWeek = 1,
    preferredDurationHours = 1,
    priority = 5,
    assignedTeacherId,
  }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const { data, error } = await supabase.from('student_programs').insert([{
        student_id: Number(studentId),
        program_id: Number(programId),
        sessions_per_week: Number(sessionsPerWeek),
        preferred_duration_hours: Number(preferredDurationHours),
        priority: Number(priority),
        status: 'pending',
        assigned_teacher_id: assignedTeacherId || null,
      }]).select().single();
      if (error) throw error;
      const row = { ...data, student_id: Number(data.student_id), program_id: Number(data.program_id) };
      setStudentPrograms(prev => prev.some(sp => sp.id === row.id) ? prev : [...prev, row]);
      return { success: true };
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
      return { success: false, error: error.message };
    }
  };

  const addStudentAvailability = async ({ studentId, dayOfWeek, startTime, endTime }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const { data, error } = await supabase.from('student_availability').insert([{
        student_id: Number(studentId),
        day_of_week: Number(dayOfWeek),
        start_time: startTime,
        end_time: endTime,
        is_active: true,
      }]).select().single();
      if (error) throw error;
      const row = { ...data, student_id: Number(data.student_id) };
      setStudentAvailability(prev => prev.some(a => a.id === row.id) ? prev : [...prev, row]);
      return { success: true };
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
      return { success: false, error: error.message };
    }
  };

  const removeStudentAvailability = async (id) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const { error } = await supabase.from('student_availability').delete().eq('id', id);
      if (error) throw error;
      setStudentAvailability(prev => prev.filter(a => a.id !== id));
      return { success: true };
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
      return { success: false, error: error.message };
    }
  };

  return { addStudentProgram, addStudentAvailability, removeStudentAvailability };
};

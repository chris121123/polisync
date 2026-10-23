// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';

export const createAttendanceActions = ({ user, notify }) => {
  const addSessionNote = async (noteData) => {
    try {
      const { data, error } = await supabase.from('session_notes').insert([{
        session_id: noteData.sessionId,
        student_id: noteData.studentId,
        created_by: user?.id,
        note_type: noteData.noteType || 'general',
        content: noteData.content,
        rating: noteData.rating,
      }]).select();
      if (error) throw error;
      if (data) notify('Session note added');
      return data;
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const markAttendance = async (sessionId, studentId, status, notes) => {
    try {
      const { data, error } = await supabase.from('attendance').upsert([{
        session_id: sessionId,
        student_id: studentId,
        status,
        notes,
        marked_by: user?.id,
        marked_at: new Date().toISOString(),
      }]).select();
      if (error) throw error;
      if (data) notify('Attendance marked');
      return data;
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const fetchAttendance = async (sessionId) => {
    const { data } = await supabase
      .from('attendance')
      .select('*, students(*)')
      .eq('session_id', sessionId);
    return data || [];
  };

  const assignParentToStudent = async (parentId, studentId) => {
    try {
      const { error } = await supabase.from('parent_student_relationships').insert([{
        parent_id: parentId,
        student_id: studentId,
      }]);
      if (error) throw error;
      notify('Parent linked to student');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const assignTeacherToProgram = async (teacherId, programId) => {
    try {
      const { error } = await supabase.from('teacher_program_assignments').insert([{
        teacher_id: teacherId,
        program_id: programId,
      }]);
      if (error) throw error;
      notify('Teacher assigned to program');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  return {
    addSessionNote,
    markAttendance,
    fetchAttendance,
    assignParentToStudent,
    assignTeacherToProgram,
  };
};

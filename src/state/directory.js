// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';

export const createDirectoryActions = ({ setStaff, setStudents, setSessions, notify }) => {
  const addPerson = async (person) => {
    try {
      if (person.type === 'Staff') {
        const { data, error } = await supabase.from('profiles').insert([{
          name: person.name,
          role: person.role,
          department: person.department,
          type: person.type,
          status: person.status,
          email: person.email,
          phone: person.phone,
          joined: person.joined
        }]).select();
        if (error) throw error;
        if (data) {
          setStaff(prev => [...prev, data[0]]);
          notify(`${person.name} added to staff`);
        }
      } else {
        const { data, error } = await supabase.from('students').insert([{
          name: person.name,
          role: person.role,
          department: person.department,
          type: person.type,
          status: person.status,
          email: person.email,
          phone: person.phone,
          joined: person.joined,
          diagnosis: person.diagnosis || ''
        }]).select();
        if (error) throw error;
        if (data) {
          setStudents(prev => [...prev, data[0]]);
          notify(`${person.name} enrolled successfully`);
        }
      }
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const deleteStudent = async (student) => {
    try {
      const studentId = Number(student.id);

      // Strip the student from session rosters first: sessions.student_ids is a plain
      // bigint[] with no foreign key, so the DB cannot clean it up on delete.
      const { data: rosterRows, error: rosterError } = await supabase
        .from('sessions')
        .select('id, student_ids')
        .contains('student_ids', [studentId]);
      if (rosterError) throw rosterError;

      // shortcut: roster cleanup and profile delete are two steps, not a transaction.
      // Promote to an RPC if partial failures become a real risk.
      const rosterResults = await Promise.all((rosterRows || []).map(row =>
        supabase.from('sessions')
          .update({ student_ids: (row.student_ids || []).filter(id => Number(id) !== studentId) })
          .eq('id', row.id)
      ));
      const rosterUpdateError = rosterResults.find(result => result.error)?.error;
      if (rosterUpdateError) throw rosterUpdateError;

      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (error) throw error;

      setStudents(prev => prev.filter(s => String(s.id) !== String(studentId)));
      if (rosterRows?.length) {
        const sessionIds = new Set(rosterRows.map(s => String(s.id)));
        setSessions(prev => prev.map(s => sessionIds.has(String(s.id))
          ? { ...s, studentIds: (s.studentIds || []).filter(id => String(id) !== String(studentId)) }
          : s));
      }
      notify(`${student.name} removed from the directory`);
      return true;
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
      return false;
    }
  };

  return { addPerson, deleteStudent };
};

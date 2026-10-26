// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';

export const createDirectoryActions = ({ setStaff, setStudents, notify }) => {
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

  return { addPerson };
};

// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';

export const createRoomActions = ({ setRooms, notify }) => {
  const addRoom = async (room) => {
    try {
      const { data, error } = await supabase.from('rooms').insert([{
        name: room.name,
        type: room.type,
        max_capacity: room.maxCapacity || 5
      }]).select();
      if (error) throw error;
      if (data) {
        setRooms(prev => [...prev, { ...data[0], maxCapacity: data[0].max_capacity }]);
        notify(`Room "${room.name}" added successfully`);
      }
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  return { addRoom };
};

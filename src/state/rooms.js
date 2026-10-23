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

  const updateRoom = async (id, updates) => {
    try {
      const dbUpdates = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.type) dbUpdates.type = updates.type;
      if (updates.maxCapacity) dbUpdates.max_capacity = updates.maxCapacity;

      const { error } = await supabase.from('rooms').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setRooms(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      notify('Room updated successfully');
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const deleteRoom = async (id) => {
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
      setRooms(prev => prev.filter(r => r.id !== id));
      notify('Room deleted');
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  return { addRoom, updateRoom, deleteRoom };
};

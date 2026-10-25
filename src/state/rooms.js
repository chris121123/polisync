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

  const deleteRoom = async (room) => {
    try {
      // sessions.room is a plain text reference, so deleting an occupied room would
      // orphan its sessions and hide them from the calendar.
      const { count, error: countError } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('room', room.name);
      if (countError) throw countError;

      if (count > 0) {
        notify(`"${room.name}" still has ${count} scheduled session${count === 1 ? '' : 's'}. Move or delete them first.`, 'error');
        return false;
      }

      const { error } = await supabase.from('rooms').delete().eq('id', room.id);
      if (error) throw error;

      setRooms(prev => prev.filter(r => String(r.id) !== String(room.id)));
      notify(`Room "${room.name}" deleted`);
      return true;
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
      return false;
    }
  };

  return { addRoom, deleteRoom };
};

import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, Plus, X, 
  Info, Filter, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalState } from '../../context/GlobalStateContext';
import { RoomCard } from './RoomCard.jsx';
import { RoomDetail } from './RoomDetail.jsx';
import { AppModal, ModalHeader } from '../../components/AppModal.jsx';

const Rooms = () => {
  const { rooms, sessions, staff, students, addRoom, deleteRoom } = useGlobalState();
  const [filterType, setFilterType] = useState('All');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', type: 'General SPED', maxCapacity: 5 });
  const [formErrors, setFormErrors] = useState({});
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!newRoom.name.trim()) newErrors.name = 'Room name is required';
    if (!newRoom.maxCapacity || newRoom.maxCapacity < 1) newErrors.maxCapacity = 'Capacity must be at least 1';
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateField = (field) => {
    const newErrors = { ...formErrors };
    
    if (field === 'name') {
      if (!newRoom.name.trim()) newErrors.name = 'Room name is required';
      else delete newErrors.name;
    }
    
    if (field === 'maxCapacity') {
      if (!newRoom.maxCapacity || newRoom.maxCapacity < 1) newErrors.maxCapacity = 'Capacity must be at least 1';
      else delete newErrors.maxCapacity;
    }

    setFormErrors(newErrors);
  };

  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    addRoom(newRoom);
    setIsAddModalOpen(false);
    setNewRoom({ name: '', type: 'General SPED', maxCapacity: 5 });
    setFormErrors({});
  };

  const closeDeleteModal = () => {
    if (!isDeletingRoom) setRoomToDelete(null);
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    setIsDeletingRoom(true);
    const removed = await deleteRoom(roomToDelete);
    setIsDeletingRoom(false);
    if (removed) setRoomToDelete(null);
  };

  // Calculate room details based on live sessions
  const roomData = useMemo(() => {
    return rooms.map(room => {
      const activeSessions = sessions.filter(s => s.room === room.name);
      const currentOccupancy = activeSessions.reduce((acc, s) => acc + (s.studentIds?.length || 0), 0);
      const isOverCapacity = currentOccupancy > room.maxCapacity;

      return {
        ...room,
        currentOccupancy,
        status: isOverCapacity ? "Over Capacity" : (activeSessions.length > 0 ? "In Use" : "Available"),
        activeSessionsList: activeSessions,
        therapist: staff.find(st => String(st.id) === String(activeSessions[0]?.therapistId))?.name || null
      };
    });
  }, [rooms, sessions, staff]);

  const selectedRoom = roomData.find(r => r.id === selectedRoomId);
  const roomSessionCount = roomToDelete
    ? sessions.filter(s => s.room === roomToDelete.name).length
    : 0;

  const filteredRooms = roomData.filter(room => {
    if (filterType === 'All') return true;
    if (filterType === 'Issues') return room.status === 'Over Capacity';
    if (filterType === 'Available') return room.status === 'Available';
    if (filterType === 'In Use') return room.status === 'In Use' || room.status === 'Over Capacity';
    return room.type.includes(filterType);
  });

  const stats = useMemo(() => ({
    total: roomData.length,
    available: roomData.filter(r => r.status === 'Available').length,
    occupied: roomData.filter(r => r.status === 'In Use').length,
    issues: roomData.filter(r => r.status === 'Over Capacity').length,
  }), [roomData]);

  const getStatusConfig = (status) => {
    if (status === 'Over Capacity') return {
      badge: "bg-ps-danger/10 text-ps-danger border-ps-danger/20",
      accent: "bg-ps-danger",
      dot: "bg-ps-danger",
      text: "text-ps-danger",
      bg: "bg-ps-danger/5"
    };
    if (status === 'In Use') return {
      badge: "bg-ps-accent-soft text-ps-accent border-ps-accent/20",
      accent: "bg-ps-primary",
      dot: "bg-ps-primary",
      text: "text-ps-accent",
      bg: "bg-ps-accent-soft/50"
    };
    return {
      badge: "bg-ps-success/10 text-ps-success border-ps-success/20",
      accent: "bg-ps-success",
      dot: "bg-ps-success",
      text: "text-ps-success",
      bg: "bg-ps-success/5"
    };
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-ps-bg">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col space-y-6 lg:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-ps-border/60">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded bg-ps-accent-soft text-ps-accent text-xs font-medium">Venue Overview</span>
              <span className="w-1 h-1 rounded-full bg-ps-ink-2/40" />
              <span className="text-xs font-medium text-ps-ink-2">{stats.occupied} rooms active</span>
            </div>
            <h1 className="text-2xl font-display font-semibold text-ps-ink-1 tracking-tight">Room Management</h1>
            <p className="text-xs text-ps-ink-2 font-medium mt-1">Real-time occupancy tracking for all {stats.total} facilities.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => { setIsAddModalOpen(true); setFormErrors({}); }}
              className="flex-1 md:flex-none bg-ps-primary hover:opacity-90 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={2.5}/> Add New Room
            </button>
          </div>
        </div>

        {/* Filters & Stats Bar */}
        <div className="flex flex-col space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1.5 hide-scrollbar shrink-0">
            {['All', 'Available', 'In Use', 'Issues', 'General SPED', 'Therapy Room', 'Playschool Area'].map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={clsx(
                  "px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap border flex items-center gap-2",
                  filterType === f 
                    ? "bg-ps-surface dark:bg-ps-surface text-ps-accent border-ps-accent/20 shadow-sm ring-1 ring-ps-accent/20" 
                    : "bg-ps-surface text-ps-ink-2 border-ps-border hover:bg-ps-bg"
                )}
              >
                {f === 'Issues' && <AlertTriangle size={14} className={filterType === f ? "text-ps-danger" : "text-ps-ink-2"} />}
                {f}
                <span className={clsx(
                  "ml-1 px-1.5 py-0.5 rounded-md text-xs",
                  filterType === f ? "bg-ps-accent-soft text-ps-accent" : "bg-ps-bg text-ps-ink-2"
                )}>
                  {f === 'All' ? stats.total : f === 'Available' ? stats.available : f === 'In Use' ? stats.occupied : f === 'Issues' ? stats.issues : roomData.filter(r => r.type.includes(f)).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid View (Balanced 3-column grid for 6 rooms) */}
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
        >
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                cfg={getStatusConfig(room.status)}
                isSelected={selectedRoomId === room.id}
                setSelectedRoomId={setSelectedRoomId}
                onDelete={setRoomToDelete}
              />
            ))}
        </motion.div>
        </div>
      </div>

      {/* Detail Sliding Panel */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetail
            selectedRoom={selectedRoom}
            cfg={getStatusConfig(selectedRoom.status)}
            staff={staff}
            students={students}
            setSelectedRoomId={setSelectedRoomId}
          />
        )}
      </AnimatePresence>

      {/* Add Room Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div 
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
            onClick={() => { setIsAddModalOpen(false); setFormErrors({}); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-ps-surface rounded-t-2xl sm:rounded-xl shadow-sm w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 sm:p-6 border-b border-ps-border flex justify-between items-center shrink-0">
                <h3 className="text-xl font-semibold text-ps-ink-1">Add New Room</h3>
                <button onClick={() => { setIsAddModalOpen(false); setFormErrors({}); }} className="p-2 hover:bg-ps-bg rounded-xl transition-colors">
                  <X size={20} className="text-ps-ink-2" />
                </button>
              </div>
              
              <form onSubmit={handleAddRoom} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="text-xs font-medium text-ps-ink-2  mb-1.5 block">Room Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Room 101"
                    className={clsx(
                      "w-full px-4 py-3 rounded-xl bg-ps-bg border text-sm font-medium focus:ring-2 outline-none transition-all",
                      formErrors.name 
                        ? "border-ps-danger focus:ring-ps-danger/20 text-ps-ink-1 dark:text-white" 
                        : "border-ps-border focus:ring-ps-accent text-ps-ink-1 dark:text-white"
                    )}
                    value={newRoom.name}
                    onChange={e => {
                      setNewRoom({...newRoom, name: e.target.value});
                      if (formErrors.name) setFormErrors(p => ({ ...p, name: '' }));
                    }}
                    onBlur={() => validateField('name')}
                  />
                  {formErrors.name && <p className="text-xs text-ps-danger font-medium mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.name}</p>}
                </div>
                
                <div>
                  <label className="text-xs font-medium text-ps-ink-2  mb-1.5 block">Room Type</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-ps-bg border border-ps-border text-sm font-medium focus:ring-2 focus:ring-ps-accent outline-none transition-all"
                    value={newRoom.type}
                    onChange={e => setNewRoom({...newRoom, type: e.target.value})}
                  >
                    <option>General SPED</option>
                    <option>Therapy Room</option>
                    <option>Playschool Area</option>
                    <option>Admin Office</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-ps-ink-2  mb-1.5 block">Max Capacity</label>
                  <input 
                    type="number" 
                    min="1"
                    max="50"
                    className={clsx(
                      "w-full px-4 py-3 rounded-xl bg-ps-bg border text-sm font-medium focus:ring-2 outline-none transition-all",
                      formErrors.maxCapacity 
                        ? "border-ps-danger focus:ring-ps-danger/20 text-ps-ink-1 dark:text-white" 
                        : "border-ps-border focus:ring-ps-accent text-ps-ink-1 dark:text-white"
                    )}
                    value={newRoom.maxCapacity}
                    onChange={e => {
                      setNewRoom({...newRoom, maxCapacity: parseInt(e.target.value)});
                      if (formErrors.maxCapacity) setFormErrors(p => ({ ...p, maxCapacity: '' }));
                    }}
                    onBlur={() => validateField('maxCapacity')}
                  />
                  {formErrors.maxCapacity && <p className="text-xs text-ps-danger font-medium mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.maxCapacity}</p>}
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => { setIsAddModalOpen(false); setFormErrors({}); }}
                    className="flex-1 py-3 border border-ps-border rounded-xl text-xs font-medium  text-ps-ink-2 hover:bg-ps-bg transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!newRoom.name || !newRoom.maxCapacity}
                    className="flex-1 py-3 bg-ps-primary text-white rounded-xl text-xs font-medium  shadow-sm hover:opacity-90 disabled:opacity-50 disabled:hover:bg-ps-primary disabled:cursor-default transition-all"
                  >
                    Create Room
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AppModal
        isOpen={!!roomToDelete}
        onClose={closeDeleteModal}
        maxWidth="max-w-md"
        labelledBy="delete-room-title"
      >
        <ModalHeader
          titleId="delete-room-title"
          eyebrow="Room management"
          title="Delete room"
          onClose={closeDeleteModal}
          className="bg-[var(--sa-surface-warm)]"
        />
        <div className="space-y-3 px-5 py-5 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ps-danger/10 text-ps-danger">
              <AlertTriangle size={18} />
            </div>
            <p className="text-sm font-semibold text-ps-ink-1">
              Remove {roomToDelete?.name}?
            </p>
          </div>
          {roomSessionCount > 0 ? (
            <div className="flex items-start gap-2 rounded-xl border border-ps-danger/20 bg-ps-danger/10 px-3 py-2.5">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-ps-danger" />
              <p className="text-xs font-medium text-ps-danger">
                This room still has {roomSessionCount} scheduled session{roomSessionCount === 1 ? '' : 's'}. Move or delete them before removing the room.
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium text-ps-ink-2">This permanently removes the room. This cannot be undone.</p>
          )}
        </div>
        <div className="flex shrink-0 gap-3 border-t border-ps-border bg-ps-surface px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={closeDeleteModal}
            disabled={isDeletingRoom}
            className="flex-1 rounded-xl border border-ps-border py-3 text-sm font-medium text-ps-ink-2 transition-colors hover:bg-ps-bg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeleteRoom}
            disabled={isDeletingRoom || roomSessionCount > 0}
            className="flex-1 rounded-xl border border-[var(--sa-danger)] py-3 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--sa-danger)] transition-colors hover:border-[var(--sa-line-strong)] disabled:cursor-default disabled:opacity-50"
          >
            {isDeletingRoom ? 'Deleting…' : 'Delete Room'}
          </button>
        </div>
      </AppModal>
    </div>
  );
};

export default Rooms;

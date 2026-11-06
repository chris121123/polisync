import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, Plus, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalState } from '../../context/GlobalStateContext';
import { RoomCard } from './RoomCard.jsx';
import { RoomDetail } from './RoomDetail.jsx';
import { AppModal, ModalHeader } from '../../components/AppModal.jsx';
import ItxSelect from '../../components/ItxSelect.jsx';

const fieldCls = 'w-full px-3 border bg-[var(--sa-bg-base)] text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] transition-colors';
const fieldTone = (invalid) => (invalid
  ? 'border-[var(--sa-danger)]'
  : 'border-[var(--sa-line-default)]');

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
      badge: 'sa-badge--warn',
      accent: 'bg-[var(--sa-danger)]',
      dot: 'bg-[var(--sa-danger)]'
    };
    if (status === 'In Use') return {
      badge: '',
      accent: 'bg-[var(--sa-bar-primary)]',
      dot: 'bg-[var(--sa-bar-primary)]'
    };
    return {
      badge: 'sa-badge--positive',
      accent: 'bg-[var(--sa-success)]',
      dot: 'bg-[var(--sa-success)]'
    };
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col space-y-6 lg:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="sa-micro">Venue Overview</span>
              <span className="w-1 h-1 bg-[var(--sa-line-strong)]" />
              <span className="sa-sub">{stats.occupied} rooms active</span>
            </div>
            <h1 className="sa-title">Room Management</h1>
            <p className="sa-sub mt-1">Real-time occupancy tracking for all {stats.total} facilities.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => { setIsAddModalOpen(true); setFormErrors({}); }}
              className="sa-btn sa-btn--primary flex-1 md:flex-none justify-center whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={1.5}/> Add New Room
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col space-y-4">
          <div className="flex w-fit max-w-full flex-wrap items-center overflow-x-auto hide-scrollbar shrink-0">
            {['All', 'Available', 'In Use', 'Issues', 'General SPED', 'Therapy Room', 'Playschool Area'].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterType(f)}
                aria-pressed={filterType === f}
                className={clsx(
                  'itx-tab whitespace-nowrap tabular-nums',
                  filterType === f && 'is-active'
                )}
              >
                {f === 'Issues' && <AlertTriangle size={14} strokeWidth={1.5} />}
                {f}
                <span className="text-[11px]">
                  {f === 'All' ? stats.total : f === 'Available' ? stats.available : f === 'In Use' ? stats.occupied : f === 'Issues' ? stats.issues : roomData.filter(r => r.type.includes(f)).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid View (Balanced 3-column grid for 6 rooms) */}
        <motion.div 
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
      <AppModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setFormErrors({}); }}
        maxWidth="max-w-md"
        labelledBy="add-room-title"
      >
        <ModalHeader
          titleId="add-room-title"
          title="Add New Room"
          onClose={() => { setIsAddModalOpen(false); setFormErrors({}); }}
        />

        <form onSubmit={handleAddRoom} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 md:px-6">
          <div>
            <label htmlFor="room-name" className="sa-label">Room Name</label>
            <input 
              id="room-name"
              data-autofocus
              type="text" 
              placeholder="e.g. Room 101"
              aria-invalid={formErrors.name ? 'true' : undefined}
              aria-describedby={formErrors.name ? 'room-name-error' : undefined}
              className={clsx(
                fieldCls,
                fieldTone(formErrors.name)
              )}
              value={newRoom.name}
              onChange={e => {
                setNewRoom({...newRoom, name: e.target.value});
                if (formErrors.name) setFormErrors(p => ({ ...p, name: '' }));
              }}
              onBlur={() => validateField('name')}
            />
            {formErrors.name && <p id="room-name-error" className="text-[11px] sa-t-danger mt-1.5 flex items-center gap-1"><AlertCircle size={12} strokeWidth={1.5} /> {formErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="room-type" className="sa-label">Room Type</label>
            <ItxSelect
              id="room-type"
              value={newRoom.type}
              onChange={(type) => setNewRoom({...newRoom, type})}
              className={clsx(fieldCls, fieldTone(false))}
              options={['General SPED', 'Therapy Room', 'Playschool Area', 'Admin Office'].map((type) => ({ value: type, label: type }))}
            />
          </div>

          <div>
            <label htmlFor="room-capacity" className="sa-label">Max Capacity</label>
            <input 
              id="room-capacity"
              type="number" 
              min="1"
              max="50"
              aria-invalid={formErrors.maxCapacity ? 'true' : undefined}
              aria-describedby={formErrors.maxCapacity ? 'room-capacity-error' : undefined}
              className={clsx(
                fieldCls,
                'tabular-nums',
                fieldTone(formErrors.maxCapacity)
              )}
              value={newRoom.maxCapacity}
              onChange={e => {
                setNewRoom({...newRoom, maxCapacity: parseInt(e.target.value)});
                if (formErrors.maxCapacity) setFormErrors(p => ({ ...p, maxCapacity: '' }));
              }}
              onBlur={() => validateField('maxCapacity')}
            />
            {formErrors.maxCapacity && <p id="room-capacity-error" className="text-[11px] sa-t-danger mt-1.5 flex items-center gap-1"><AlertCircle size={12} strokeWidth={1.5} /> {formErrors.maxCapacity}</p>}
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => { setIsAddModalOpen(false); setFormErrors({}); }}
              className="sa-btn flex-1 justify-center"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!newRoom.name || !newRoom.maxCapacity}
              className="sa-btn sa-btn--primary flex-1 justify-center"
            >
              Create Room
            </button>
          </div>
        </form>
      </AppModal>

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
        />
        <div className="space-y-3 px-5 py-5 md:px-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} strokeWidth={1.5} className="shrink-0 sa-t-danger" />
            <p className="sa-row-title">
              Remove {roomToDelete?.name}?
            </p>
          </div>
          {roomSessionCount > 0 ? (
            <div className="sa-alert sa-alert--danger items-start">
              <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <p className="text-[11px]">
                This room still has {roomSessionCount} scheduled session{roomSessionCount === 1 ? '' : 's'}. Move or delete them before removing the room.
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--sa-text-muted)]">This permanently removes the room. This cannot be undone.</p>
          )}
        </div>
        <div className="flex shrink-0 gap-3 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={closeDeleteModal}
            disabled={isDeletingRoom}
            className="sa-btn flex-1 justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeleteRoom}
            disabled={isDeletingRoom || roomSessionCount > 0}
            className="sa-btn itx-danger flex-1 justify-center"
          >
            {isDeletingRoom ? 'Deleting…' : 'Delete Room'}
          </button>
        </div>
      </AppModal>
    </div>
  );
};

export default Rooms;

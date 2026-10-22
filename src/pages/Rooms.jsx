import React, { useState, useMemo } from 'react';
import { 
  DoorOpen, Users, User, AlertTriangle, Plus, X, 
  MapPin, Clock, Info, ArrowUpRight, Filter, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalState } from '../context/GlobalStateContext';

const Rooms = () => {
  const { rooms, sessions, staff, students, addRoom } = useGlobalState();
  const [filterType, setFilterType] = useState('All');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', type: 'General SPED', maxCapacity: 5 });
  const [formErrors, setFormErrors] = useState({});

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
      accent: "bg-ps-accent",
      dot: "bg-ps-accent",
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
              className="flex-1 md:flex-none bg-ps-accent dark:bg-indigo-600 hover:opacity-90 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
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
            {filteredRooms.map((room) => {
              const cfg = getStatusConfig(room.status);
              const isSelected = selectedRoomId === room.id;
              
              return (
                <motion.div 
                  key={room.id}
                  layoutId={`room-${room.id}`}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={clsx(
                    "bg-ps-surface rounded-xl p-5 border transition-all cursor-pointer relative overflow-hidden group",
                    isSelected 
                      ? "ring-2 ring-ps-accent shadow-sm z-10 border-transparent translate-y-[-2px]" 
                      : "border-ps-border hover:shadow-sm hover:border-ps-border/80 hover:translate-y-[-2px]"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-ps-bg border border-ps-border flex items-center justify-center text-ps-ink-2 group-hover:text-ps-accent transition-colors">
                      <DoorOpen size={20} strokeWidth={2} />
                    </div>
                    <span className={clsx("text-xs font-medium px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1.5", cfg.badge)}>
                      <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                      {room.status}
                    </span>
                  </div>
                  
                  <div className="mb-5">
                    <h3 className="font-semibold text-ps-ink-1 text-lg tracking-tight leading-none capitalize group-hover:text-ps-accent transition-colors">{room.name}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                       <MapPin size={11} className="text-ps-ink-2" />
                       <span className="text-xs text-ps-ink-2 font-medium leading-none">{room.type}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-ps-bg p-3.5 rounded-xl border border-ps-border">
                    <div className="flex justify-between items-center text-xs font-medium text-ps-ink-2">
                      <span className="flex items-center gap-1.5"><Users size={12}/> Occupancy</span>
                      <span className={clsx("font-semibold", room.currentOccupancy >= room.maxCapacity ? "text-ps-danger" : "text-ps-ink-1")}>
                        {room.currentOccupancy} / {room.maxCapacity}
                      </span>
                    </div>
                    
                    <div className="w-full h-1.5 bg-ps-border/60 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((room.currentOccupancy / room.maxCapacity) * 100, 100)}%` }}
                        className={clsx("h-full rounded-full transition-all duration-1000", room.status === 'Over Capacity' ? "bg-ps-danger" : (room.currentOccupancy / room.maxCapacity > 0.8 ? "bg-ps-warn" : "bg-ps-accent"))}
                      />
                    </div>

                    {room.status !== 'Available' ? (
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex -space-x-1.5">
                          {[1, 2, 3].slice(0, room.currentOccupancy).map(idx => (
                            <div key={idx} className="w-5 h-5 rounded-full bg-ps-surface border border-ps-border flex items-center justify-center text-ps-ink-2 shadow-xs">
                              <User size={10} />
                            </div>
                          ))}
                          {room.currentOccupancy > 3 && (
                            <div className="w-5 h-5 rounded-full bg-ps-accent-soft border border-ps-accent/20 flex items-center justify-center text-[10px] font-semibold text-ps-accent">
                              +{room.currentOccupancy - 3}
                            </div>
                          )}
                        </div>
                        {room.therapist && (
                          <div className="text-xs font-medium text-ps-ink-2 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-ps-accent " />
                             {room.therapist.split(' ')[0]}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1 text-xs text-ps-ink-2 font-medium">
                        <span className="text-ps-ink-2">No active sessions</span>
                        <span className="text-ps-success text-xs font-medium">Ready</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-ps-border flex items-center justify-between text-xs font-medium text-ps-ink-2">
                     <span className="text-ps-accent group-hover:underline flex items-center gap-1">View Details <ArrowUpRight size={12} /></span>
                     <span>ID: {room.id.toString().padStart(3, '0')}</span>
                  </div>
                </motion.div>
              );
            })}
        </motion.div>
        </div>
      </div>

      {/* Detail Sliding Panel */}
      <AnimatePresence>
        {selectedRoom && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRoomId(null)}
              className="fixed inset-0 bg-black/10 z-30"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:max-w-[440px] bg-ps-surface shadow-[-20px_0_50px_rgba(0,0,0,0.05)] z-40 flex flex-col"
            >
              {/* Panel Header */}
              <div className={clsx("p-8 relative overflow-hidden", getStatusConfig(selectedRoom.status).bg)}>
                <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => setSelectedRoomId(null)} aria-label="Close room details" className="p-2.5 bg-ps-surface hover:bg-ps-bg rounded-2xl text-ps-ink-2 transition-all shadow-sm">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="relative mt-4">
                  <div className={clsx("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium  mb-4", getStatusConfig(selectedRoom.status).badge)}>
                    <div className={clsx("w-2 h-2 rounded-full ", getStatusConfig(selectedRoom.status).accent)} />
                    {selectedRoom.status}
                  </div>
                  <h2 className="text-2xl font-semibold text-ps-ink-1 tracking-tight leading-none mb-2">{selectedRoom.name}</h2>
                  <p className="text-sm font-medium text-ps-ink-2  flex items-center gap-2">
                    <MapPin size={14} className="text-ps-accent" />
                    {selectedRoom.type}
                  </p>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-ps-bg rounded-xl border border-ps-border relative group overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Users size={32} />
                    </div>
                    <p className="text-xs font-medium text-ps-ink-2  mb-1">Student Capacity</p>
                    <p className={clsx("text-3xl font-semibold", selectedRoom.currentOccupancy >= selectedRoom.maxCapacity ? "text-ps-danger" : "text-ps-ink-1")}>
                      {selectedRoom.currentOccupancy} <span className="text-ps-ink-2 font-light">/ {selectedRoom.maxCapacity}</span>
                    </p>
                  </div>
                  <div className="p-5 bg-ps-bg rounded-xl border border-ps-border relative group overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Clock size={32} />
                    </div>
                    <p className="text-xs font-medium text-ps-ink-2  mb-1">Active Hours</p>
                    <p className="text-3xl font-semibold text-ps-ink-1">
                      {selectedRoom.activeSessionsList.length * 2} <span className="text-ps-ink-2 font-light">hrs</span>
                    </p>
                  </div>
                </div>

                {/* Live Activity Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-ps-ink-1  flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-ps-accent" />
                      Ongoing Sessions
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedRoom.activeSessionsList.length > 0 ? selectedRoom.activeSessionsList.map((s, idx) => (
                      <motion.div 
                        key={idx}
                        whileHover={{ x: 4 }}
                        className="p-5 rounded-xl border border-ps-border bg-ps-surface shadow-sm hover:shadow-md transition-all flex flex-col gap-3 group"
                      >
                         <div className="flex justify-between items-start">
                           <div>
                             <h4 className="font-semibold text-ps-ink-1 text-base group-hover:text-ps-accent transition-colors">{s.title}</h4>
                             <div className="flex items-center gap-2 mt-1">
                               <span className="text-xs font-medium text-ps-ink-2 capitalize bg-ps-bg px-2 py-0.5 rounded-md">{s.type} Session</span>
                               <span className="w-1 h-1 rounded-full bg-ps-ink-2/40" />
                               <span className="text-xs font-medium text-ps-ink-2">Therapist: {staff.find(st => st.id === s.therapistId)?.name}</span>
                             </div>
                           </div>
                           <div className="flex flex-col items-end">
                             <div className="text-xs font-medium text-ps-accent bg-ps-accent-soft px-2.5 py-1 rounded-lg border border-ps-accent/20 shadow-sm flex items-center gap-1.5">
                                <Clock size={10} /> {s.startHour}:00 – {s.startHour + s.span}:00
                             </div>
                           </div>
                         </div>
                         
                         <div className="flex flex-wrap gap-1.5 pt-2 border-t border-ps-border mt-1">
                            {s.studentIds.map(sid => {
                               const student = students.find(st => st.id === sid);
                               return (
                                 <div key={sid} className="flex items-center gap-1.5 px-3 py-1 bg-ps-bg hover:bg-ps-surface border border-ps-border rounded-full transition-colors cursor-default">
                                    <div className="w-1.5 h-1.5 bg-ps-success rounded-full" />
                                    <span className="text-xs font-medium text-ps-ink-2 ">{student?.name}</span>
                                 </div>
                               );
                            })}
                         </div>
                      </motion.div>
                    )) : (
                      <div className="p-10 border-2 border-dashed border-ps-border rounded-xl bg-ps-bg flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-ps-surface flex items-center justify-center text-ps-ink-1 mb-2">
                           <DoorOpen size={24} />
                        </div>
                        <p className="text-xs font-medium text-ps-ink-2 ">No active sessions</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
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
                    className="flex-1 py-3 bg-ps-accent dark:bg-indigo-600 text-white rounded-xl text-xs font-medium  shadow-sm hover:opacity-90 disabled:opacity-50 disabled:hover:bg-ps-accent disabled:cursor-default transition-all"
                  >
                    Create Room
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Rooms;

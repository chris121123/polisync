import React, { useState, useMemo } from 'react';
import { 
  DoorOpen, Users, AlertTriangle, Plus, LayoutGrid, List, X, 
  MapPin, CheckCircle2, Clock, Info, ArrowUpRight, Filter
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalState } from '../context/GlobalStateContext';

const Rooms = () => {
  const { rooms, sessions, staff, students, addRoom } = useGlobalState();
  const [viewMode, setViewMode] = useState('grid');
  const [filterType, setFilterType] = useState('All');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', type: 'General SPED', maxCapacity: 5 });

  const handleAddRoom = (e) => {
    e.preventDefault();
    addRoom(newRoom);
    setIsAddModalOpen(false);
    setNewRoom({ name: '', type: 'General SPED', maxCapacity: 5 });
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
      badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      accent: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50/50 dark:bg-rose-900/20"
    };
    if (status === 'In Use') return {
      badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      accent: "bg-indigo-500",
      text: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50/50 dark:bg-indigo-900/20"
    };
    return {
      badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      accent: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50/50 dark:bg-emerald-900/20"
    };
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-800/50">
      <div className="flex-1 overflow-y-auto px-8 py-8 flex flex-col space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Venue Overview</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stats.occupied} rooms active</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Room Management</h1>
            <p className="text-slate-500 font-medium mt-1">Real-time occupancy tracking for all {stats.total} facilities.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-white dark:bg-slate-900 dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => setViewMode('grid')} 
                className={clsx(
                  "p-2 rounded-lg transition-all", 
                  viewMode === 'grid' ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-400 hover:text-slate-600 dark:text-slate-300"
                )}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={clsx(
                  "p-2 rounded-lg transition-all", 
                  viewMode === 'list' ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-400 hover:text-slate-600 dark:text-slate-300"
                )}
              >
                <List size={18} />
              </button>
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Plus size={18} strokeWidth={2.5}/> Add New Room
            </button>
          </div>
        </div>

        {/* Filters & Stats Bar */}
        <div className="flex flex-col space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar shrink-0 pr-4">
            {['All', 'Available', 'In Use', 'Issues', 'General SPED', 'Therapy Room', 'Playschool Area'].map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={clsx(
                  "px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-2",
                  filterType === f 
                    ? "bg-white dark:bg-slate-900 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700 shadow-sm ring-1 ring-indigo-100" 
                    : "bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50"
                )}
              >
                {f === 'Issues' && <AlertTriangle size={14} className={filterType === f ? "text-rose-500" : "text-slate-400"} />}
                {f}
                <span className={clsx(
                  "ml-1 px-1.5 py-0.5 rounded-md text-[10px]",
                  filterType === f ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "bg-slate-50 dark:bg-slate-800/50 text-slate-400"
                )}>
                  {f === 'All' ? stats.total : f === 'Available' ? stats.available : f === 'In Use' ? stats.occupied : f === 'Issues' ? stats.issues : roomData.filter(r => r.type.includes(f)).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' ? (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredRooms.map((room, i) => {
              const cfg = getStatusConfig(room.status);
              const isSelected = selectedRoomId === room.id;
              
              return (
                <motion.div 
                  key={room.id}
                  layoutId={`room-${room.id}`}
                  onClick={() => setSelectedRoomId(room.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={clsx(
                    "bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-3xl p-6 border transition-all cursor-pointer relative overflow-hidden group",
                    isSelected 
                      ? "ring-2 ring-indigo-500 shadow-xl z-10 border-transparent translate-y-[-4px]" 
                      : "border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-transparent hover:translate-y-[-4px]"
                  )}
                >
                  {/* Status Indicator Bar */}
                  <div className={clsx("absolute top-0 left-0 right-0 h-1.5", cfg.accent)} />
                  
                  <div className="flex justify-between items-start mb-5">
                    <div className={clsx("p-3 rounded-2xl transition-all group-hover:scale-110", cfg.bg, cfg.text)}>
                      <DoorOpen size={24} strokeWidth={2.5} />
                    </div>
                    <span className={clsx("text-[10px] font-black px-3 py-1 rounded-full border shadow-sm uppercase tracking-widest", cfg.badge)}>
                      {room.status}
                    </span>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-xl tracking-tight leading-none group-hover:text-indigo-600 dark:text-indigo-400 transition-colors">{room.name}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                       <MapPin size={10} className="text-slate-400" />
                       <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">{room.type}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span className="flex items-center gap-1.5"><Users size={12}/> Occupancy</span>
                      <span className={clsx(room.currentOccupancy >= room.maxCapacity ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100")}>
                        {room.currentOccupancy} / {room.maxCapacity}
                      </span>
                    </div>
                    
                    <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((room.currentOccupancy / room.maxCapacity) * 100, 100)}%` }}
                        className={clsx("h-full rounded-full transition-all duration-1000", room.status === 'Over Capacity' ? "bg-rose-500" : (room.currentOccupancy / room.maxCapacity > 0.8 ? "bg-amber-400" : "bg-indigo-500"))}
                      />
                    </div>

                    {room.status !== 'Available' && (
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].slice(0, room.currentOccupancy).map(idx => (
                            <div key={idx} className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[8px] font-black text-slate-500">
                              S
                            </div>
                          ))}
                          {room.currentOccupancy > 3 && (
                            <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[8px] font-black text-indigo-600 dark:text-indigo-400">
                              +{room.currentOccupancy - 3}
                            </div>
                          )}
                        </div>
                        {room.therapist && (
                          <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                             {room.therapist.split(' ')[0]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">View Details <ArrowUpRight size={12} /></span>
                     <div className="text-[9px] font-bold text-slate-300">ID: {room.id.toString().padStart(3, '0')}</div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* List View fallback */
          <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
             <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 mb-4">
               <LayoutGrid size={32} />
             </div>
             <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">List view is in development</h3>
             <p className="text-slate-500 text-sm mt-1 mb-6">Our team is crafting a dense, data-rich list view for venue management.</p>
             <button onClick={() => setViewMode('grid')} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-200">
               Return to Grid View
             </button>
          </div>
        )}
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
              className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-30"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-[440px] bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-[-20px_0_50px_rgba(0,0,0,0.05)] z-40 flex flex-col"
            >
              {/* Panel Header */}
              <div className={clsx("p-8 relative overflow-hidden", getStatusConfig(selectedRoom.status).bg)}>
                <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => setSelectedRoomId(null)} className="p-2.5 bg-white dark:bg-slate-900 dark:bg-slate-900/50 hover:bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl text-slate-500 transition-all shadow-sm">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="relative mt-4">
                  <div className={clsx("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest mb-4", getStatusConfig(selectedRoom.status).badge)}>
                    <div className={clsx("w-2 h-2 rounded-full animate-pulse", getStatusConfig(selectedRoom.status).accent)} />
                    {selectedRoom.status}
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none mb-2">{selectedRoom.name}</h2>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={14} className="text-indigo-500" />
                    {selectedRoom.type}
                  </p>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 relative group overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Users size={32} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Capacity</p>
                    <p className={clsx("text-3xl font-black", selectedRoom.currentOccupancy >= selectedRoom.maxCapacity ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100")}>
                      {selectedRoom.currentOccupancy} <span className="text-slate-300 font-light">/ {selectedRoom.maxCapacity}</span>
                    </p>
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 relative group overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Clock size={32} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Hours</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
                      {selectedRoom.activeSessionsList.length * 2} <span className="text-slate-300 font-light">hrs</span>
                    </p>
                  </div>
                </div>

                {/* Live Activity Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Ongoing Sessions
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedRoom.activeSessionsList.length > 0 ? selectedRoom.activeSessionsList.map((s, idx) => (
                      <motion.div 
                        key={idx}
                        whileHover={{ x: 4 }}
                        className="p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 group"
                      >
                         <div className="flex justify-between items-start">
                           <div>
                             <h4 className="font-black text-slate-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:text-indigo-400 transition-colors uppercase tracking-tight">{s.title}</h4>
                             <div className="flex items-center gap-2 mt-1">
                               <span className="text-[10px] font-bold text-slate-400 capitalize bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">{s.type} Session</span>
                               <span className="w-1 h-1 rounded-full bg-slate-300" />
                               <span className="text-[10px] font-bold text-slate-400">Therapist: {staff.find(st => st.id === s.therapistId)?.name}</span>
                             </div>
                           </div>
                           <div className="flex flex-col items-end">
                             <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 tracking-tighter shadow-sm flex items-center gap-1.5">
                                <Clock size={10} /> {s.startHour}:00 – {s.startHour + s.span}:00
                             </div>
                           </div>
                         </div>
                         
                         <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50 mt-1">
                            {s.studentIds.map(sid => {
                               const student = students.find(st => st.id === sid);
                               return (
                                 <div key={sid} className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full transition-colors cursor-default">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                    <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">{student?.name}</span>
                                 </div>
                               );
                            })}
                         </div>
                      </motion.div>
                    )) : (
                      <div className="p-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800/30 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 dark:bg-slate-900 flex items-center justify-center text-slate-200 mb-2">
                           <DoorOpen size={24} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No active sessions</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amenities Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Venue Resources
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Sensory Lighting', active: true },
                      { name: 'Sound Isolation', active: true },
                      { name: 'Safety Flooring', active: true },
                      { name: 'Standard Desk', active: false },
                      { name: 'Weighted Gear', active: true },
                      { name: 'Observation Cam', active: false },
                    ].map(res => (
                      <div key={res.name} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all">
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">{res.name}</span>
                        {res.active ? (
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        ) : (
                          <div className="w-2 h-2 rounded-full border border-slate-300" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Action Bar */}
              <div className="p-8 pt-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-900">
                 <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-200 transition-all active:scale-98 flex items-center justify-center gap-3 group">
                    <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    Generate Utilization Report
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Add Room Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Add New Room</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleAddRoom} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Room Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Room 101"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={newRoom.name}
                    onChange={e => setNewRoom({...newRoom, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Room Type</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Max Capacity</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    max="50"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={newRoom.maxCapacity}
                    onChange={e => setNewRoom({...newRoom, maxCapacity: parseInt(e.target.value)})}
                  />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
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

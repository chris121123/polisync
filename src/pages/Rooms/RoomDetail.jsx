import { X, MapPin, Users, Clock, DoorOpen } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export const RoomDetail = ({ selectedRoom, cfg, staff, students, setSelectedRoomId }) => (
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
      <div className={clsx("p-8 relative overflow-hidden", cfg.bg)}>
        <div className="absolute top-0 right-0 p-4">
          <button onClick={() => setSelectedRoomId(null)} aria-label="Close room details" className="p-2.5 bg-ps-surface hover:bg-ps-bg rounded-2xl text-ps-ink-2 transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>
        
        <div className="relative mt-4">
          <div className={clsx("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium  mb-4", cfg.badge)}>
            <div className={clsx("w-2 h-2 rounded-full ", cfg.accent)} />
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
);

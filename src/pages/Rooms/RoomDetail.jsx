import { X, MapPin, Clock, DoorOpen } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

// House drawer motion: opacity only, 180ms (Settings' legal drawer).
const panelMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: 'easeOut' }
};

export const RoomDetail = ({ selectedRoom, cfg, staff, students, setSelectedRoomId }) => {
  const panelRef = useRef(null);
  // A modal dialog dismisses on Escape (the mounted drawer is the open state).
  useFocusTrap(panelRef, { onClose: () => setSelectedRoomId(null) });

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={() => setSelectedRoomId(null)}
        className="itx-backdrop fixed inset-0 z-40"
      />
      <div className="fixed inset-y-0 right-0 z-50 flex max-w-full p-4">
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-detail-title"
          tabIndex={-1}
          {...panelMotion}
          className="itx-menu flex w-full max-w-[440px] flex-col"
        >
          {/* Panel Header */}
          <div className="flex items-start justify-between gap-4 p-6">
            <div className="min-w-0">
              <div className={clsx("inline-flex items-center gap-2 sa-badge mb-4", cfg.badge)}>
                <div className={clsx("w-1.5 h-1.5", cfg.accent)} />
                {selectedRoom.status}
              </div>
              <h2 id="room-detail-title" className="sa-title mb-2 truncate">{selectedRoom.name}</h2>
              <p className="text-sm text-[var(--sa-text-muted)] flex items-center gap-2">
                <MapPin size={14} strokeWidth={1.5} className="sa-t-muted" />
                {selectedRoom.type}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRoomId(null)}
              aria-label="Close room details"
              className="itx-modal-close shrink-0"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6">

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="sa-panel">
                <p className="sa-micro">Student Capacity</p>
                <p className={clsx("sa-kpi-value tabular-nums", selectedRoom.currentOccupancy >= selectedRoom.maxCapacity ? "sa-t-danger" : "text-[var(--sa-text-primary)]")}>
                  {selectedRoom.currentOccupancy} <span className="text-sm text-[var(--sa-text-muted)]">/ {selectedRoom.maxCapacity}</span>
                </p>
              </div>
              <div className="sa-panel">
                <p className="sa-micro">Active Hours</p>
                <p className="sa-kpi-value tabular-nums text-[var(--sa-text-primary)]">
                  {selectedRoom.activeSessionsList.length * 2} <span className="text-sm text-[var(--sa-text-muted)]">hrs</span>
                </p>
              </div>
            </div>

            {/* Live Activity Section */}
            <div className="space-y-3">
              <h3 className="sa-micro flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--sa-bar-primary)]" />
                Ongoing Sessions
              </h3>

              <div className="space-y-2">
                {selectedRoom.activeSessionsList.length > 0 ? selectedRoom.activeSessionsList.map((s, idx) => {
                  const therapist = staff.find(st => st.id === s.therapistId)?.name;
                  return (
                  <div key={idx} className="sa-panel flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <h4 className="sa-row-title">{s.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="sa-badge">{s.type} Session</span>
                          {therapist && (
                            <span className="text-[11px] text-[var(--sa-text-muted)]">
                              Therapist: {therapist}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="sa-badge flex items-center gap-1.5 shrink-0 whitespace-nowrap tabular-nums">
                        <Clock size={10} strokeWidth={1.5} /> {s.startHour}:00 – {s.startHour + s.span}:00
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {s.studentIds.map(sid => {
                        const student = students.find(st => st.id === sid);
                        return (
                          <span key={sid} className="sa-badge flex items-center gap-1.5 cursor-default">
                            <span className="w-1.5 h-1.5 bg-[var(--success)]" />
                            <span className="text-[11px] text-[var(--sa-text-muted)]">{student?.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  );
                }) : (
                  <div className="sa-empty flex flex-col items-center justify-center">
                    <DoorOpen size={20} strokeWidth={1.5} className="mb-2 sa-t-muted" />
                    <p className="sa-empty-sub">No active sessions</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

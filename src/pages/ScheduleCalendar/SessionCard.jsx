import { useState, useEffect } from 'react';
import { Clock, Users, User, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { formatHour, TYPE_CONFIG } from './calendarMath.js';

// ─── Current-time indicator ──────────────────────────────────────────────────
export const NowIndicator = ({ rowHeight = 96 }) => {
  const [top, setTop] = useState(null);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const h = now.getHours() + now.getMinutes() / 60;
      if (h >= 8 && h <= 18) setTop((h - 8) * rowHeight);
      else setTop(null);
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [rowHeight]);

  if (top === null) return null;

  return (
    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top }}>
      <div className="flex items-center gap-0">
        <div className="w-2.5 h-2.5 rounded-full bg-ps-danger shadow-sm shrink-0 -ml-1" />
        <div className="flex-1 h-0.5 bg-ps-danger/80" />
      </div>
    </div>
  );
};

// ─── Session Card (Daily View) ───────────────────────────────────────────────
export const SessionCard = ({ session, staffList, isSelected, hasConflict, conflict, onClick, onDragEnd }) => {
  const cfg = TYPE_CONFIG[session.type] || TYPE_CONFIG.sped;
  const provider = staffList.find(s => String(s.id) === String(session.therapistId));
  const studentCount = session.studentIds?.length || 0;

  const conflictLabel = conflict?.type === 'therapist' 
    ? 'Staff Clash' 
    : (conflict?.type === 'room' ? 'Room Overlap' : 'Conflict');

  return (
    <motion.div
      layoutId={`session-${session.id}`}
      onClick={onClick}
      drag
      dragSnapToOrigin={true}
      dragMomentum={false}
      onDragEnd={(e, info) => onDragEnd && onDragEnd(session.id, e, info)}
      whileHover={{ scale: 1.01, zIndex: 30 }}
      whileDrag={{ scale: 1.03, zIndex: 50, cursor: 'grabbing', opacity: 0.95 }}
      className={clsx(
        'absolute left-1.5 right-1.5 rounded-xl cursor-grab transition-all duration-200 select-none overflow-hidden',
        'bg-ps-surface border shadow-xs hover:shadow-md',
        isSelected ? 'ring-2 ring-ps-accent ring-offset-1 z-20 border-transparent' : 'border-ps-border hover:border-ps-accent/40 z-10',
        hasConflict ? 'border-ps-danger/50 ring-1 ring-ps-danger/50 bg-ps-danger/5' : ''
      )}
      style={{
        top: `${(session.startHour - 8) * 96 + 2}px`,
        height: `${session.span * 96 - 4}px`,
      }}
    >
      {/* 3.5px solid left accent strip */}
      <div className={clsx(
        'absolute left-0 top-0 bottom-0 w-1',
        hasConflict ? 'bg-ps-danger' : cfg.gradient
      )} />

      <div className="relative z-10 p-2.5 pl-3.5 h-full flex flex-col justify-between overflow-hidden pointer-events-none">
        
        {/* Top line: Title & Badges */}
        <div>
          <div className="flex items-start justify-between gap-1.5 min-w-0">
            <p className={clsx(
              'font-semibold text-xs leading-snug line-clamp-1 truncate',
              hasConflict ? 'text-ps-danger font-bold' : 'text-ps-ink-1'
            )}>
              {session.title}
            </p>

            <div className="flex items-center gap-1 shrink-0">
              {hasConflict ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-ps-danger/15 text-ps-danger border border-ps-danger/30">
                  <AlertCircle size={10} className="shrink-0" />
                  <span>{conflictLabel}</span>
                </span>
              ) : (
                <span className={clsx('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md shrink-0', cfg.badge)}>
                  {cfg.label}
                </span>
              )}
            </div>
          </div>

          {/* Time range */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-ps-ink-2 mt-1">
            <Clock size={11} className="shrink-0 opacity-70" />
            <span>{formatHour(session.startHour)} – {formatHour(session.startHour + session.span)}</span>
          </div>
        </div>

        {/* Bottom line: Provider and Student count */}
        <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-ps-border/50 text-ps-ink-2 mt-auto">
          <div className="flex items-center gap-1 truncate font-medium text-ps-ink-1 min-w-0">
            <User size={11} className="shrink-0 text-ps-ink-2" />
            <span className="truncate">{provider ? provider.name : 'Unassigned'}</span>
          </div>
          {studentCount > 0 && (
            <div className="flex items-center gap-1 shrink-0 text-ps-ink-2 font-medium">
              <Users size={11} className="shrink-0" />
              <span>{studentCount}</span>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
};

// ─── Weekly Session Card (compact) ───────────────────────────────────────────
export const WeeklySessionCard = ({ session, staffList, isSelected, hasConflict, conflict, onClick, onDragEnd }) => {
  const cfg = TYPE_CONFIG[session.type] || TYPE_CONFIG.sped;
  const provider = staffList.find(s => String(s.id) === String(session.therapistId));

  const conflictLabel = conflict?.type === 'therapist' 
    ? 'Clash' 
    : (conflict?.type === 'room' ? 'Overlap' : 'Conflict');

  return (
    <motion.div
      onClick={onClick}
      drag
      dragSnapToOrigin={true}
      dragMomentum={false}
      onDragEnd={(e, info) => onDragEnd && onDragEnd(session.id, e, info)}
      whileHover={{ scale: 1.02, zIndex: 30 }}
      whileDrag={{ scale: 1.04, zIndex: 50, cursor: 'grabbing', opacity: 0.95 }}
      className={clsx(
        'absolute left-1 right-1 rounded-lg cursor-grab select-none overflow-hidden transition-all duration-200',
        'bg-ps-surface border shadow-xs hover:shadow-md',
        isSelected ? 'ring-2 ring-ps-accent z-20 border-transparent' : 'border-ps-border z-10',
        hasConflict ? 'border-ps-danger/60 ring-1 ring-ps-danger/60 bg-ps-danger/5' : ''
      )}
      style={{
        top: `${(session.startHour - 8) * 64 + 2}px`,
        height: `${session.span * 64 - 4}px`,
      }}
    >
      <div className={clsx(
        'absolute left-0 top-0 bottom-0 w-1',
        hasConflict ? 'bg-ps-danger' : cfg.gradient
      )} />

      <div className="relative z-10 p-1.5 pl-2.5 h-full flex flex-col justify-between overflow-hidden pointer-events-none">
        <div>
          <div className="flex items-center justify-between gap-1">
            <p className={clsx(
              'font-semibold text-xs leading-tight truncate',
              hasConflict ? 'text-ps-danger' : 'text-ps-ink-1'
            )}>
              {session.title}
            </p>
            {hasConflict ? (
              <span className="text-[9px] font-semibold px-1 rounded bg-ps-danger/15 text-ps-danger">
                {conflictLabel}
              </span>
            ) : (
              <span className={clsx('text-[9px] font-semibold uppercase px-1 rounded shrink-0', cfg.badge)}>
                {cfg.label}
              </span>
            )}
          </div>
          <p className="text-[10px] font-medium text-ps-ink-2 mt-0.5 flex items-center gap-1">
            <Clock size={9} className="opacity-70" />
            {formatHour(session.startHour).replace(':00', '')}–{formatHour(session.startHour + session.span).replace(':00', '')}
          </p>
        </div>

        {provider && (
          <p className="text-[10px] font-medium text-ps-ink-1 truncate pt-0.5 border-t border-ps-border/40 flex items-center gap-1">
            <User size={9} className="shrink-0 text-ps-ink-2" />
            <span className="truncate">{provider.name}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
};

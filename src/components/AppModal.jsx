import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useFocusTrap } from '../hooks/useFocusTrap';

// Opacity-only: the one modal motion (no rise, no scale, no spring).
const panelMotion = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15, ease: 'easeOut' } };

export const AppModal = ({ isOpen, onClose, labelledBy, describedBy, children, maxWidth = 'max-w-lg', dismissible = true }) => {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  useFocusTrap(panelRef, { active: isOpen, onClose, dismissible });

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        // The portal mounts on <body>, outside Layout's scope, so the scope must
        // travel with the wrapper or the scrim token cannot resolve.
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 md:items-center md:p-4 itx-scope itx-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          onClick={dismissible ? () => closeRef.current?.() : undefined}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            tabIndex={-1}
            {...panelMotion}
            onClick={(event) => event.stopPropagation()}
            className={clsx(
              'flex max-h-[92vh] w-full flex-col overflow-hidden md:max-h-[90vh] itx-scope itx-modal',
              maxWidth
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const ModalHeader = ({ titleId, eyebrow, title, description, onClose, className, children }) => (
  <div className={clsx('relative shrink-0 px-5 py-5 md:px-6', className)}>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="itx-eyebrow mt-1">{eyebrow}</p>}
        <h2 id={titleId} className="itx-modal-title mt-1 truncate">{title}</h2>
        {description && <p className="itx-modal-desc mt-1">{description}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="itx-modal-close shrink-0"
        >
          <X size={18} />
        </button>
      )}
    </div>
    {children}
  </div>
);

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';

// Explicit tween: Framer's default spring overshoots and makes modals feel bouncy.
const panelTransition = { type: 'tween', duration: 0.2, ease: [0.16, 1, 0.3, 1] };

// Tracks open modals so Escape only closes the topmost one.
const openModals = [];

export const AppModal = ({ isOpen, onClose, labelledBy, describedBy, children, maxWidth = 'max-w-lg', dismissible = true }) => {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  const tokenRef = useRef({});

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    dismissibleRef.current = dismissible;
  }, [dismissible]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const token = tokenRef.current;
    openModals.push(token);
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && dismissibleRef.current && openModals[openModals.length - 1] === token) closeRef.current?.();
    };
    document.addEventListener('keydown', handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector('[data-autofocus]')
        || panelRef.current?.querySelector('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])');
      target?.focus();
    }, 0);

    return () => {
      const index = openModals.indexOf(token);
      if (index !== -1) openModals.splice(index, 1);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
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
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={panelTransition}
            onClick={(event) => event.stopPropagation()}
            className={clsx(
              'flex max-h-[92vh] w-full flex-col overflow-hidden border border-ps-border/60 bg-ps-surface md:max-h-[90vh]',
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
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--sa-text-muted)]">{eyebrow}</p>
        )}
        <h2 id={titleId} className="mt-1 truncate text-lg font-semibold text-[var(--sa-text-primary)] md:text-xl">{title}</h2>
        {description && <p className="mt-1 text-xs font-medium text-[var(--sa-text-muted)]">{description}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="shrink-0 border border-[var(--sa-line-default)] p-2 text-[var(--sa-text-secondary)] transition-colors hover:border-[var(--sa-line-strong)] hover:text-[var(--sa-text-primary)]"
        >
          <X size={18} />
        </button>
      )}
    </div>
    {children}
  </div>
);

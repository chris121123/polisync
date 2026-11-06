import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Only the newest open trap owns Escape and the Tab boundary: a dialog opened
// from a dialog (Settings -> wipe modal) must not close both.
const stack = [];

const itemsIn = (panel) => Array.from(panel.querySelectorAll(FOCUSABLE))
  .filter((el) => el.tabIndex !== -1 && el.getClientRects().length > 0);

export const useFocusTrap = (panelRef, { active = true, onClose, dismissible = true, returnFocusRef } = {}) => {
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => { dismissibleRef.current = dismissible; }, [dismissible]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!active || !panel) return undefined;

    const token = {};
    stack.push(token);
    const opener = document.activeElement;
    const fallback = returnFocusRef?.current;

    (panel.querySelector('[data-autofocus]') || itemsIn(panel)[0] || panel).focus();

    const onKeyDown = (event) => {
      if (stack[stack.length - 1] !== token) return;

      if (event.key === 'Escape') {
        if (dismissibleRef.current) closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = itemsIn(panel);
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const outside = current === panel || !panel.contains(current);
      const wrap = event.shiftKey
        ? outside || current === first
        : outside || current === last;
      if (!wrap) return;
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = stack.indexOf(token);
      if (index !== -1) stack.splice(index, 1);
      // Keyboard-opened dialogs capture body as the opener; fall back to the
      // caller's trigger so focus never lands on body.
      const target = opener instanceof HTMLElement && opener !== document.body && opener.isConnected
        ? opener
        : fallback;
      if (target instanceof HTMLElement && target.isConnected) target.focus();
    };
  }, [active, panelRef, returnFocusRef]);
};

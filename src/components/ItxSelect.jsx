import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

// Shared ITX dropdown: a listbox portaled to <body> so modals and drawers cannot
// clip it. Geometry only is written inline; every surface/ink value is a token.
const MENU_MAX = 320;
const ROW_H = 40;
const GROUP_H = 24;
const GAP = 6;

const ItxSelect = ({
  id,
  value,
  onChange,
  options = [],
  groups,
  placeholder = '',
  ariaLabel,
  ariaLabelledby,
  'aria-labelledby': ariaLabelledBy,
  listboxLabel,
  ariaDescribedby,
  'aria-describedby': ariaDescribedBy,
  ariaInvalid,
  'aria-invalid': ariaInvalidAttr,
  ariaRequired,
  'aria-required': ariaRequiredAttr,
  disabled = false,
  className,
  required = false,
  autoFocus = false,
}) => {
  const reactId = useId();
  const baseId = id || `itx-select-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const invalid = ariaInvalid ?? ariaInvalidAttr;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index) => `${baseId}-option-${index}`;
  const labelledBy = ariaLabelledby || ariaLabelledBy;

  // Sections always exist: a flat list is one unnamed section.
  const sections = [];
  const flat = [];
  for (const section of groups?.length ? groups : [{ label: null, options }]) {
    const entries = [];
    for (const option of section.options || []) {
      entries.push({ option, index: flat.length });
      flat.push(option);
    }
    sections.push({ label: section.label, entries });
  }

  const selectedOption = flat.find((option) => Object.is(option.value, value));
  const selectedLabel = selectedOption?.label ?? '';
  const selectedIndex = flat.findIndex((option) => !option.disabled && Object.is(option.value, value));
  // The listbox needs its own name too; reuse the caller's labelledby if given,
  // otherwise fall back to a readable label (never a second copy of the trigger id).
  const listboxName = ariaLabel || listboxLabel || selectedOption?.label || placeholder || 'Options';

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const typed = useRef({ text: '', at: 0 });

  const firstEnabled = flat.findIndex((option) => !option.disabled);
  const lastEnabled = flat.reduce((found, option, index) => (option.disabled ? found : index), -1);

  const move = (from, direction) => {
    for (let index = from; index >= 0 && index < flat.length; index += direction) {
      if (!flat[index].disabled) return index;
    }
    return active;
  };

  const openMenu = (where) => {
    if (disabled || open) return;
    const trigger = triggerRef.current;
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      const estimated = Math.min(MENU_MAX, flat.length * ROW_H + sections.length * GROUP_H + GAP + 8);
      // Always open below: bring the trigger to the middle first, then the menu
      // gets the room it would otherwise lose at the bottom of the viewport.
      if (window.innerHeight - rect.bottom - GAP - 8 < estimated) {
        trigger.scrollIntoView({ block: 'center' });
      }
    }
    setActive(where === 'last' ? lastEnabled : selectedIndex >= 0 ? selectedIndex : firstEnabled);
    setOpen(true);
  };

  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const select = (option) => {
    if (option.disabled) return;
    // Native <select> fires no change when the same option is chosen; callers
    // such as the AI preset apply side effects, so a re-pick must be inert.
    if (Object.is(option.value, value)) {
      close(true);
      return;
    }
    close(true);
    onChange?.(option.value);
  };

  // Position after the menu mounts and keep it pinned to the trigger while the
  // page (or a modal body) scrolls. Direct DOM writes avoid a re-render per
  // scroll frame over a long model list.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return undefined;

    const place = () => {
      const rect = trigger.getBoundingClientRect();
      menu.style.top = `${rect.bottom + GAP}px`;
      menu.style.left = `${rect.left}px`;
      menu.style.width = `${rect.width}px`;
      menu.style.maxHeight = `${Math.max(0, Math.min(MENU_MAX, window.innerHeight - rect.bottom - GAP - 8))}px`;
    };
    place();

    const onPointerDown = (event) => {
      if (trigger.contains(event.target) || menu.contains(event.target)) return;
      setOpen(false);
    };

    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  // Keep the active row inside the menu's own scroll box.
  useEffect(() => {
    if (!open || active < 0) return;
    menuRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (event) => {
    const { key } = event;

    if (!open) {
      if (key === 'Enter' || key === ' ' || key === 'ArrowDown') {
        event.preventDefault();
        openMenu('selected');
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        openMenu('last');
      }
      return;
    }

    if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (key === 'Tab') {
      close();
      return;
    }
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End') {
      event.preventDefault();
      if (key === 'Home') setActive(move(0, 1));
      else if (key === 'End') setActive(move(flat.length - 1, -1));
      else setActive(move(active + (key === 'ArrowDown' ? 1 : -1), key === 'ArrowDown' ? 1 : -1));
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (flat[active]) select(flat[active]);
      return;
    }
    if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now();
      const extending = now - typed.current.at <= 500 && typed.current.text !== '';
      typed.current.text = extending ? typed.current.text + key : key;
      typed.current.at = now;
      const query = typed.current.text.toLowerCase();
      // A refined prefix may still match the active row; a fresh letter starts
      // from the next row so repeated taps cycle.
      const start = active >= 0 ? active + (extending ? 0 : 1) : 0;
      for (let step = 0; step < flat.length; step += 1) {
        const index = (start + step + flat.length) % flat.length;
        if (!flat[index].disabled && String(flat[index].label).toLowerCase().startsWith(query)) {
          setActive(index);
          break;
        }
      }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={baseId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        aria-describedby={ariaDescribedby || ariaDescribedBy}
        aria-invalid={invalid === true ? 'true' : invalid || undefined}
        aria-required={(ariaRequired ?? ariaRequiredAttr ?? required) || undefined}
        disabled={disabled}
        data-autofocus={autoFocus || undefined}
        className={clsx('itx-select-trigger', className)}
        onClick={() => (open ? close() : openMenu('selected'))}
        onKeyDown={onKeyDown}
      >
        <span className={selectedLabel ? undefined : 'itx-select-placeholder'}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={16} strokeWidth={1.5} className="itx-select-chevron" aria-hidden="true" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={labelledBy ? undefined : listboxName}
          aria-labelledby={labelledBy}
          className="itx-scope itx-select-menu"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {sections.map((section, sectionIndex) => {
            const rows = section.entries.map(({ option, index }) => {
              const isSelected = Object.is(option.value, value);
              return (
                <div
                  key={index}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  data-active={index === active ? 'true' : undefined}
                  className="itx-select-option"
                  // mousemove, not mouseenter: a scroll under a still pointer
                  // fires mouseenter and would steal the keyboard row.
                  onMouseMove={() => {
                    if (!option.disabled) setActive(index);
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(option)}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={14} strokeWidth={1.5} className="itx-select-check" aria-hidden="true" />}
                </div>
              );
            });

            if (!section.label) return <React.Fragment key={sectionIndex}>{rows}</React.Fragment>;
            const groupId = `${baseId}-group-${sectionIndex}`;
            return (
              <div key={section.label} role="group" aria-labelledby={groupId}>
                <div id={groupId} className="sa-micro px-2 pb-1 pt-2">{section.label}</div>
                {rows}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

export default ItxSelect;

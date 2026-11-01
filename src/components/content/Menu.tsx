import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  /** Draw a rule above this item */
  divider?: boolean;
}

interface Props {
  /** Accessible name of the button, e.g. "Options for Consent" */
  label: string;
  items: MenuItem[];
  /** Contents of the trigger button */
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}

/**
 * Menu button (WAI-ARIA menu pattern). Arrow keys move, Home/End jump,
 * Enter or Space chooses, Escape or Tab closes and returns focus to the button.
 */
export default function Menu({ label, items, children, className = '', align = 'end' }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const live = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
  // When every item is unavailable (say, a locked workflow), still open so people can hear why.
  const enabled = live.length ? live : items.map((_, i) => i);

  useEffect(() => {
    if (!open) return;
    (list.current?.querySelector(`[data-i="${active}"]`) as HTMLElement | null)?.focus();
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openAt = (where: 'first' | 'last') => {
    if (!enabled.length) return;
    setActive(where === 'first' ? enabled[0] : enabled[enabled.length - 1]);
    setOpen(true);
  };
  const close = (refocus = true) => { setOpen(false); if (refocus) btn.current?.focus(); };
  const step = (d: 1 | -1) => {
    const pos = enabled.indexOf(active);
    setActive(enabled[(pos + d + enabled.length) % enabled.length]);
  };

  return (
    <span className={`menu ${className}`}>
      <button
        ref={btn}
        type="button"
        className="menu__button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-m` : undefined}
        onClick={() => (open ? close() : openAt('first'))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); openAt('first'); }
          if (e.key === 'ArrowUp') { e.preventDefault(); openAt('last'); }
        }}
      >
        {children}
      </button>
      {open && (
        <ul
          ref={list}
          id={`${id}-m`}
          role="menu"
          aria-label={label}
          className={`menu__list menu__list--${align}`}
          onKeyDown={(e) => {
            switch (e.key) {
              case 'ArrowDown': e.preventDefault(); step(1); break;
              case 'ArrowUp': e.preventDefault(); step(-1); break;
              case 'Home': e.preventDefault(); setActive(enabled[0]); break;
              case 'End': e.preventDefault(); setActive(enabled[enabled.length - 1]); break;
              case 'Escape': e.preventDefault(); close(); break;
              case 'Tab': close(false); break;
            }
          }}
        >
          {items.map((it, i) => (
            <li
              key={it.label}
              role="menuitem"
              data-i={i}
              tabIndex={i === active ? 0 : -1}
              aria-disabled={it.disabled || undefined}
              className={`menu__item${it.divider ? ' has-divider' : ''}`}
              onClick={() => { if (!it.disabled) { close(); it.onSelect(); } }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !it.disabled) { e.preventDefault(); close(); it.onSelect(); }
              }}
            >
              {it.label}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';

export interface SelectOption<T extends string | number> { value: T; label: string }

interface Props<T extends string | number> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  /** id of help text that describes the field */
  describedBy?: string;
  /** Show the label beside the button instead of above it */
  inline?: boolean;
  /** Keep the label for screen readers only (the context already names the field) */
  hideLabel?: boolean;
}

/**
 * Custom dropdown in the a11y-charts style (WAI-ARIA "select-only combobox").
 * The button keeps focus; the list is announced through aria-activedescendant.
 * Keys: Enter, Space, Alt+Down or Down to open; Up/Down, Home/End and typing to move;
 * Enter or Space to choose; Escape to close without choosing; Tab chooses and moves on.
 */
export default function Select<T extends string | number>({ label, value, options, onChange, className, describedBy, inline, hideLabel }: Props<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));
  const [active, setActive] = useState(selected);
  const [above, setAbove] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });

  const openList = (at = selected) => { setActive(at); setOpen(true); };
  const choose = (i: number) => { onChange(options[i].value); setOpen(false); };

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Open upward when there isn't room below inside the scrolling area.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !listRef.current) return;
    const scroller = buttonRef.current.closest('[data-scroll], .app-main') ?? document.documentElement;
    const b = buttonRef.current.getBoundingClientRect();
    const area = scroller.getBoundingClientRect();
    const h = listRef.current.offsetHeight;
    setAbove(b.bottom + h + 8 > area.bottom && b.top - h - 8 > area.top);
  }, [open]);

  // Keep the active option in view.
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e: KeyboardEvent) => {
    const last = options.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList(e.key === 'ArrowUp' ? Math.max(0, selected - 1) : selected);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        openList(e.key === 'Home' ? 0 : last);
      } else if (e.key.length === 1) {
        typeahead(e.key, true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((a) => Math.min(last, a + 1)); break;
      case 'ArrowUp':
        e.preventDefault();
        if (e.altKey) choose(active); else setActive((a) => Math.max(0, a - 1));
        break;
      case 'Home': e.preventDefault(); setActive(0); break;
      case 'End': e.preventDefault(); setActive(last); break;
      case 'PageDown': e.preventDefault(); setActive((a) => Math.min(last, a + 10)); break;
      case 'PageUp': e.preventDefault(); setActive((a) => Math.max(0, a - 10)); break;
      case 'Enter': case ' ': e.preventDefault(); choose(active); break;
      case 'Escape': e.preventDefault(); setOpen(false); break;
      case 'Tab': choose(active); break;
      default: if (e.key.length === 1) typeahead(e.key, false);
    }
  };

  const typeahead = (ch: string, wasClosed: boolean) => {
    const now = Date.now();
    const t = typed.current;
    t.text = now - t.at > 600 ? ch.toLowerCase() : t.text + ch.toLowerCase();
    t.at = now;
    const start = wasClosed ? selected : active;
    const order = [...options.keys()].map((k) => (start + 1 + k) % options.length);
    const hit = order.find((i) => options[i].label.toLowerCase().startsWith(t.text))
      ?? (t.text.length > 1 ? options.findIndex((o) => o.label.toLowerCase().startsWith(t.text)) : -1);
    if (hit === undefined || hit < 0) return;
    if (wasClosed) onChange(options[hit].value); else setActive(hit);
  };

  return (
    <div className={`field select${inline ? ' field--inline' : ''}${className ? ` ${className}` : ''}`} ref={wrapRef}>
      <span className={hideLabel ? 'visually-hidden' : 'field__label'} id={`${id}-label`}>{label}</span>
      <div className="select__anchor">
        <button
          ref={buttonRef}
          type="button"
          role="combobox"
          className="select__button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-labelledby={`${id}-label`}
          aria-describedby={describedBy}
          aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
          onBlur={(e) => { if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
        >
          <span className="select__value">{options[selected]?.label}</span>
          <svg className="select__chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
        </button>
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          tabIndex={-1}
          className={`select__list${above ? ' is-above' : ''}`}
          hidden={!open}
        >
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              id={`${id}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === selected}
              className={`select__option${i === active ? ' is-active' : ''}`}
              onMouseMove={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()} // keep focus on the button
              onClick={() => { choose(i); buttonRef.current?.focus(); }}
            >
              <span>{o.label}</span>
              <svg className="select__check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

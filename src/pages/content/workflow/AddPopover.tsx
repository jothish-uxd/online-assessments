import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchIcon } from '../../../components/content/icons';
import type { Module, Step } from '../../../data/content/types';
import { STATUS_TEXT } from '../moduleBits';
import { IdIcon, ProctorIcon } from './icons';

export type AddChoice = { kind: 'module'; moduleId: string } | { kind: 'id-check' } | { kind: 'proctoring' };

interface Props {
  /** "at the start", "after Consent", … */
  where: string;
  modules: Module[];
  steps: Step[];
  onPick: (p: AddChoice, label: string) => void;
  onClose: () => void;
}

/**
 * Small non-modal panel next to a + point: search, then pick a checkpoint or a module.
 * Up/Down move between options, Escape closes and returns focus to the + button.
 */
export default function AddPopover({ where, modules, steps, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const used = new Set(steps.flatMap((s) => (s.kind === 'module' ? [s.moduleId] : [s.kind])));

  useEffect(() => {
    (ref.current?.querySelector('input') as HTMLInputElement | null)?.focus();
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!ref.current?.contains(t) && !t.closest('.slot__add')) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const match = (s: string) => !q || s.toLowerCase().includes(q);
  const groups = useMemo(() => {
    const sorted = [...modules].sort((a, b) => Number(b.status === 'published') - Number(a.status === 'published') || a.name.localeCompare(b.name));
    return [
      { id: 'non', label: 'Content modules', items: sorted.filter((m) => m.kind === 'non-evaluative' && match(m.name)) },
      { id: 'eval', label: 'Evaluation modules', items: sorted.filter((m) => m.kind === 'evaluative' && match(m.name)) },
    ];
  }, [modules, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkpoints = [
    { kind: 'id-check' as const, label: 'ID verification', about: 'Candidate shows a photo ID on camera', icon: <IdIcon /> },
    { kind: 'proctoring' as const, label: 'Proctoring system check', about: 'If successful, proctoring starts', icon: <ProctorIcon /> },
  ].filter((c) => match(c.label));

  const move = (d: 1 | -1) => {
    const opts = [...(ref.current?.querySelectorAll<HTMLButtonElement>('.addpop__opt:not(:disabled)') ?? [])];
    const i = opts.indexOf(document.activeElement as HTMLButtonElement);
    const next = i < 0 ? (d === 1 ? 0 : opts.length - 1) : i + d;
    if (next < 0) { (ref.current?.querySelector('input') as HTMLElement | null)?.focus(); return; }
    opts[Math.min(next, opts.length - 1)]?.focus();
  };

  const empty = !checkpoints.length && groups.every((g) => !g.items.length);

  return (
    <div ref={ref} className="addpop" role="dialog" aria-label={`Add ${where}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      }}>
      <p className="addpop__title">Add {where}</p>
      <label className="search search--full">
        <SearchIcon />
        <span className="visually-hidden">Search modules and checkpoints</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search modules" />
      </label>
      <div className="addpop__scroll">
        {checkpoints.length > 0 && (
          <div role="group" aria-labelledby="addpop-cp">
            <p className="addpop__group" id="addpop-cp">Checkpoints</p>
            {checkpoints.map((c) => {
              const taken = used.has(c.kind);
              return (
                <button key={c.kind} type="button" className={`addpop__opt addpop__opt--${c.kind}`} disabled={taken}
                  onClick={() => onPick({ kind: c.kind }, c.label)}>
                  <span className="addpop__icon">{c.icon}</span>
                  <span className="addpop__text">
                    <span className="addpop__name">{c.label}</span>
                    <span className="addpop__meta">{taken ? 'Already in this workflow' : c.about}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {groups.map((g) => g.items.length > 0 && (
          <div key={g.id} role="group" aria-labelledby={`addpop-${g.id}`}>
            <p className="addpop__group" id={`addpop-${g.id}`}>{g.label}</p>
            {g.items.map((m) => {
              const taken = used.has(m.id);
              return (
                <button key={m.id} type="button" className={`addpop__opt addpop__opt--${m.kind}`} disabled={taken}
                  onClick={() => onPick({ kind: 'module', moduleId: m.id }, m.name)}>
                  <span className="addpop__bar" aria-hidden="true" />
                  <span className="addpop__text">
                    <span className="addpop__name">{m.name}</span>
                    <span className="addpop__meta">
                      {taken ? 'Already in this workflow' : `${m.items.length} item${m.items.length === 1 ? '' : 's'} · ${STATUS_TEXT[m.status]}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
        {empty && <p className="muted small addpop__empty">Nothing matches “{query}”.</p>}
      </div>
    </div>
  );
}

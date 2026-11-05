import '../styles/stat-filter.css';

/**
 * StatFilter — a row of counts that also filters what's below it.
 *
 * Each card shows a number and what it counts. Choosing one filters the
 * content it controls. The chosen card borrows the tab marker (ink underline,
 * quiet fill, semibold label), so it reads like a tab without shouting.
 *
 * Design-system rules
 * - Use it when the counts and the filter would otherwise repeat each other.
 *   Plain KPI tiles that don't filter stay as a <dl>.
 * - Toggle buttons in a labelled group (aria-pressed), each pointing at the
 *   region it filters with aria-controls. Exactly one is pressed.
 * - Include an "All" card first when showing everything is a useful state.
 * - Never colour alone: the underline, fill and label weight carry the state.
 */
export interface StatFilterItem<T extends string> {
  value: T;
  label: string;
  count: number;
}

interface Props<T extends string> {
  /** Accessible name of the group, e.g. "Pipeline" */
  label: string;
  items: StatFilterItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** id of the region the cards filter */
  controls?: string;
  className?: string;
}

export default function StatFilter<T extends string>({ label, items, value, onChange, controls, className = '' }: Props<T>) {
  return (
    <ul className={`stat-filter ${className}`} role="group" aria-label={label}>
      {items.map((it) => (
        <li key={it.value}>
          <button type="button" className="stat-filter__btn" aria-pressed={value === it.value} aria-controls={controls} onClick={() => onChange(it.value)}>
            <span className="stat-filter__n">{it.count.toLocaleString('en-US')}</span>
            <span className="stat-filter__label">{it.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

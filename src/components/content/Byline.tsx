import type { Stamp } from '../../data/content/types';
import { person } from '../../data/content/people';
import { when } from '../../data/content/format';

/** "Leia Organa · Today, 3:14 PM", for tables and fact lists. */
export function Byline({ stamp, time = false, stacked = false }: { stamp: Stamp; time?: boolean; stacked?: boolean }) {
  const p = person(stamp.by);
  if (stacked) {
    return (
      <>
        <span className="cell-strong">{p.name}</span>
        <time className="cell-sub" dateTime={stamp.at}>{when(stamp.at, time)}</time>
      </>
    );
  }
  return (
    <span className="byline">
      {p.name} <span aria-hidden="true">·</span><span className="visually-hidden">,</span> <time dateTime={stamp.at}>{when(stamp.at, time)}</time>
    </span>
  );
}

export function Avatar({ id, size = 'sm' }: { id: Stamp['by']; size?: 'sm' | 'xs' }) {
  const p = person(id);
  return <span className={`avatar avatar--${size}`} aria-hidden="true">{p.initials}</span>;
}

/** Activity list: newest first, each with who and when. */
export function ActivityList({ items, limit = 6 }: { items: (Stamp & { action: string })[]; limit?: number }) {
  return (
    <ol className="activity">
      {items.slice(0, limit).map((a, i) => (
        <li key={`${a.at}-${i}`}>
          <Avatar id={a.by} size="xs" />
          <span className="activity__text">
            <span className="activity__action">{a.action}</span>
            <span className="activity__meta">{person(a.by).name} · <time dateTime={a.at}>{when(a.at, true)}</time></span>
          </span>
        </li>
      ))}
    </ol>
  );
}

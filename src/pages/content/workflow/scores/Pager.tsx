import { useEffect, useState } from 'react';

export function usePage<T>(rows: T[], size: number) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const [page, setPage] = useState(1);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  return { page, setPage, pages, slice: rows.slice((page - 1) * size, page * size) };
}

/** "Showing 1–10 of 13" with previous, page numbers and next. */
export default function Pager({ page, pages, total, size, onPage }: { page: number; pages: number; total: number; size: number; onPage: (p: number) => void }) {
  const from = total ? (page - 1) * size + 1 : 0;
  const to = Math.min(total, page * size);
  return (
    <div className="pager">
      <span className="pager__count" role="status">Showing {from}–{to} of {total}</span>
      {pages > 1 && (
        <nav className="pager__nav" aria-label="Pages">
          <button type="button" className="bframe__btn" aria-label="Previous page" disabled={page === 1} onClick={() => onPage(page - 1)}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button key={p} type="button" className="pager__num" aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p}`} onClick={() => onPage(p)}>{p}</button>
          ))}
          <button type="button" className="bframe__btn" aria-label="Next page" disabled={page === pages} onClick={() => onPage(page + 1)}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
          </button>
        </nav>
      )}
    </div>
  );
}

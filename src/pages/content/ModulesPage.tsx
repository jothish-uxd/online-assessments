import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../components/usePageTitle';
import Select from '../../components/Select';
import Dialog from '../../components/content/Dialog';
import { Byline } from '../../components/content/Byline';
import { AlertIcon, PlusIcon, SearchIcon } from '../../components/content/icons';
import { createModule, fmtSeconds, moduleIssues, modulePoints, moduleTime, useModules } from '../../data/content/store';
import type { ModuleKind, ModuleStatus } from '../../data/content/types';
import { contentRoutes } from './routes';
import { KIND_TEXT, StatusBadge } from './moduleBits';

type KindFilter = 'all' | ModuleKind;
type StatusFilter = 'all' | ModuleStatus;

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Any status' },
  { value: 'draft', label: 'Draft' },
  { value: 'in-review', label: 'In review' },
  { value: 'published', label: 'Published' },
];

export default function ModulesPage() {
  const h = usePageTitle('Modules');
  const navigate = useNavigate();
  const modules = useModules();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ name: string; description: string; kind: ModuleKind }>({ name: '', description: '', kind: 'evaluative' });
  const [tried, setTried] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...modules]
      .filter((m) => (kind === 'all' || m.kind === kind) && (status === 'all' || m.status === status)
        && (!q || `${m.name} ${m.description}`.toLowerCase().includes(q)))
      .sort((a, b) => b.edited.at.localeCompare(a.edited.at));
  }, [modules, query, kind, status]);

  const create = () => {
    setTried(true);
    if (!draft.name.trim()) return;
    const m = createModule({ ...draft, name: draft.name.trim(), description: draft.description.trim() });
    setCreating(false);
    navigate(contentRoutes.module(m.id), { state: { addItem: true } });
  };

  return (
    <div className="ca-page">
      <header className="ca-head">
        <div>
          <h1 ref={h} tabIndex={-1} className="ca-title">Modules</h1>
          <p className="ca-sub">Reusable banks of items. Assessments are built from them.</p>
        </div>
        <div className="ca-head__actions">
          <button type="button" className="btn btn--primary"
            onClick={() => { setDraft({ name: '', description: '', kind: 'evaluative' }); setTried(false); setCreating(true); }}>
            <PlusIcon /> New module
          </button>
        </div>
      </header>

      <div className="toolbar">
        <label className="search">
          <SearchIcon />
          <span className="visually-hidden">Search modules</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search modules" />
        </label>
        <fieldset className="seg-control">
          <legend className="visually-hidden">Kind</legend>
          {(['all', 'evaluative', 'non-evaluative'] as KindFilter[]).map((k) => (
            <label key={k} className={`seg-control__opt${kind === k ? ' is-on' : ''}`}>
              <input type="radio" name="module-kind" checked={kind === k} onChange={() => setKind(k)} />
              {k === 'all' ? 'All' : KIND_TEXT[k]}
              <span className="seg-count">{k === 'all' ? modules.length : modules.filter((m) => m.kind === k).length}</span>
            </label>
          ))}
        </fieldset>
        <div className="toolbar__end">
          <Select label="Status" hideLabel value={status} options={STATUSES} onChange={setStatus} />
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <p className="empty__title">No modules match</p>
          <p>Try another filter, or create a module.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table module-table">
            <caption className="visually-hidden">Modules, most recently edited first</caption>
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">Kind</th>
                <th scope="col" className="num">Items</th>
                <th scope="col" className="num">Points</th>
                <th scope="col">Item timer</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
                <th scope="col">Last edited</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => {
                const issues = moduleIssues(m);
                return (
                  <tr key={m.id}>
                    <th scope="row">
                      <Link to={contentRoutes.module(m.id)} className="row-link">{m.name}</Link>
                      <span className="cell-sub">{m.description || '—'}</span>
                      {issues > 0 && <span className="gap-text small"><AlertIcon /> {issues} item{issues === 1 ? '' : 's'} not ready</span>}
                    </th>
                    <td>{KIND_TEXT[m.kind]}</td>
                    <td className="num">{m.items.length}</td>
                    <td className="num">{m.kind === 'evaluative' ? modulePoints(m) : <span className="muted">—</span>}</td>
                    <td>{m.kind !== 'evaluative' || m.timing.mode === 'off' ? <span className="muted">{m.kind === 'evaluative' ? 'Off' : '—'}</span>
                      : <>{m.timing.mode === 'each' ? `${fmtSeconds(m.timing.seconds)} each` : 'Per item'}<span className="cell-sub">{fmtSeconds(moduleTime(m).seconds)} total</span></>}</td>
                    <td><StatusBadge status={m.status} /></td>
                    <td><Byline stamp={m.created} stacked /></td>
                    <td><Byline stamp={m.edited} stacked /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New module"
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" form="new-module" className="btn btn--primary">Next</button>
          </>
        }
      >
        <form id="new-module" className="form" onSubmit={(e) => { e.preventDefault(); create(); }} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="nm-name">Name</label>
            <input id="nm-name" value={draft.name} autoFocus aria-invalid={tried && !draft.name.trim()}
              aria-describedby={tried && !draft.name.trim() ? 'nm-name-err' : undefined}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="For example: Problem solving" />
            {tried && !draft.name.trim() && <span id="nm-name-err" className="field-error-text"><AlertIcon /> Give the module a name.</span>}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="nm-desc">Description <span className="muted">(optional)</span></label>
            <textarea id="nm-desc" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <fieldset className="risk-choices">
            <legend className="field__label">Kind</legend>
            <div className="choice-cards">
              {(['evaluative', 'non-evaluative'] as ModuleKind[]).map((k) => (
                <label key={k} className={`risk-card${draft.kind === k ? ' is-on' : ''}`}>
                  <input type="radio" name="nm-kind" checked={draft.kind === k} onChange={() => setDraft({ ...draft, kind: k })} />
                  <span className="risk-card__name">{KIND_TEXT[k]}</span>
                  <span className="risk-card__about">
                    {k === 'evaluative'
                      ? 'Scored items and activities, with instructions where needed.'
                      : 'Not scored: terms, privacy notices, consent and instructions.'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      </Dialog>
    </div>
  );
}

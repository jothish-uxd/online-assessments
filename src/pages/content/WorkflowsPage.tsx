import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../components/usePageTitle';
import Dialog from '../../components/content/Dialog';
import { Byline } from '../../components/content/Byline';
import { AlertIcon, CheckIcon, PlusIcon, SearchIcon } from '../../components/content/icons';
import { useModules } from '../../data/content/store';
import { STAGES, createWorkflow, stageIndex, useWorkflows, validate } from '../../data/content/workflows';
import { contentRoutes } from './routes';

export default function WorkflowsPage() {
  const h = usePageTitle('OA workflows');
  const navigate = useNavigate();
  const workflows = useWorkflows();
  const modules = useModules();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workflows.filter((w) => !q || `${w.name} ${w.code}`.toLowerCase().includes(q))
      .sort((a, b) => b.edited.at.localeCompare(a.edited.at));
  }, [workflows, query]);

  const create = () => {
    setTried(true);
    if (!name.trim()) return;
    const w = createWorkflow(name);
    setCreating(false);
    navigate(contentRoutes.workflow(w.id), { state: { addFirst: true } });
  };

  return (
    <div className="ca-page">
      <header className="ca-head">
        <div>
          <h1 ref={h} tabIndex={-1} className="ca-title">OA workflows</h1>
          <p className="ca-sub">Modules put in order, with checkpoints and settings, to make an online assessment for a role. Once live, a workflow can be attached to requisitions.</p>
        </div>
        <div className="ca-head__actions">
          <button type="button" className="btn btn--primary" onClick={() => { setName(''); setTried(false); setCreating(true); }}>
            <PlusIcon /> New OA workflow
          </button>
        </div>
      </header>

      <div className="toolbar">
        <label className="search">
          <SearchIcon />
          <span className="visually-hidden">Search workflows</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or workflow ID" />
        </label>
      </div>

      <div className="table-wrap">
        <table className="table">
          <caption className="visually-hidden">OA workflows, most recently edited first</caption>
          <thead>
            <tr>
              <th scope="col">Workflow</th>
              <th scope="col">Stage</th>
              <th scope="col" className="num">Version</th>
              <th scope="col" className="num">Modules</th>
              <th scope="col">Validation</th>
              <th scope="col">Created</th>
              <th scope="col">Last edited</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((w) => {
              const issues = validate(w, modules);
              const si = stageIndex(w.stage);
              return (
                <tr key={w.id}>
                  <th scope="row">
                    <Link to={contentRoutes.workflow(w.id)} className="row-link">{w.name}</Link>
                    <span className="cell-sub mono">{w.code}</span>
                  </th>
                  <td>
                    <span className="mini-stages" aria-hidden="true">
                      {STAGES.map((s, i) => <span key={s.id} className={i < si ? 'is-done' : i === si ? 'is-current' : ''} />)}
                    </span>
                    <span className="cell-strong">{STAGES[si].label}</span>
                    <span className="visually-hidden">, stage {si + 1} of {STAGES.length}</span>
                  </td>
                  <td className="num">v{w.version}{w.dirty && <span className="cell-sub">Unsaved</span>}</td>
                  <td className="num">{w.steps.filter((s) => s.kind === 'module').length}</td>
                  <td>
                    {issues.length
                      ? <span className="gap-text small"><AlertIcon /> {issues.length} issue{issues.length === 1 ? '' : 's'}</span>
                      : <span className="ready small"><CheckIcon /> Validated</span>}
                  </td>
                  <td><Byline stamp={w.created} stacked /></td>
                  <td><Byline stamp={w.edited} stacked /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New OA workflow"
        description={<p>Name it for the role and level it assesses. You’ll add modules next.</p>}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" form="new-workflow" className="btn btn--primary">Next</button>
          </>
        }
      >
        <form id="new-workflow" className="form" noValidate onSubmit={(e) => { e.preventDefault(); create(); }}>
          <div className="field">
            <label className="field__label" htmlFor="nw-name">Workflow name</label>
            <input id="nw-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Protocol Droid Handler L3"
              aria-invalid={tried && !name.trim()} aria-describedby={tried && !name.trim() ? 'nw-err' : undefined} />
            {tried && !name.trim() && <span id="nw-err" className="field-error-text"><AlertIcon /> Give the workflow a name.</span>}
          </div>
        </form>
      </Dialog>
    </div>
  );
}

import { useId, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../../components/usePageTitle';
import Dialog from '../../../components/content/Dialog';
import Menu from '../../../components/content/Menu';
import { ActivityList } from '../../../components/content/Byline';
import { AlertIcon, CheckIcon } from '../../../components/content/icons';
import { useModules } from '../../../data/content/store';
import {
  STAGES, deleteWorkflow, saveVersion, setStage, stageIndex, useWorkflows, validate,
} from '../../../data/content/workflows';
import type { Stage, Workflow } from '../../../data/content/types';
import { contentRoutes, type WorkflowTab } from '../routes';
import BuilderGraph from './BuilderGraph';
import CompositeScores from './scores/CompositeScores';
import Misbehavior from './Misbehavior';

const TABS: { id: WorkflowTab; label: string }[] = [
  { id: 'builder', label: 'Builder graph' },
  { id: 'scores', label: 'Composite scores' },
  { id: 'misbehavior', label: 'Misbehavior settings' },
  { id: 'test-plan', label: 'Test plan' },
  { id: 'history', label: 'History' },
];

/** What moves a workflow to its next stage, and what it's called. */
const NEXT: Partial<Record<Stage, { to: Stage; button: string; action: string }>> = {
  build: { to: 'program-review', button: 'Send to Program review', action: 'Sent to Program review' },
  'program-review': { to: 'e2e', button: 'Approve review', action: 'Program review approved' },
  e2e: { to: 'signoff', button: 'Mark testing passed', action: 'End-to-end testing passed' },
  signoff: { to: 'launch-ready', button: 'Sign off', action: 'Final sign-off' },
  'launch-ready': { to: 'live', button: 'Launch', action: 'Launched: live for requisitions' },
};

export default function WorkflowPage() {
  const { workflowId } = useParams();
  const w = useWorkflows().find((x) => x.id === workflowId);
  if (!w) return <Missing />;
  return <Editor key={w.id} w={w} />;
}

function Missing() {
  const h = usePageTitle('Workflow not found');
  return (
    <div className="ca-page">
      <h1 ref={h} tabIndex={-1} className="ca-title">This workflow doesn’t exist</h1>
      <p className="ca-sub">It may have been deleted. <Link to={contentRoutes.workflows()}>Back to OA workflows</Link></p>
    </div>
  );
}

function Editor({ w }: { w: Workflow }) {
  const { tab = 'builder' } = useParams() as { tab?: WorkflowTab };
  const h = usePageTitle(w.name);
  const id = useId();
  const navigate = useNavigate();
  const modules = useModules();
  const [showIssues, setShowIssues] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [said, setSaid] = useState('');

  const issues = validate(w, modules);
  const si = stageIndex(w.stage);
  const editable = w.stage === 'build';
  const next = NEXT[w.stage];
  const blocked = w.stage === 'build' && (w.dirty || issues.length > 0);
  const status = w.stage === 'build'
    ? `Draft · ${issues.length ? 'unvalidated' : 'validated'}`
    : STAGES[si].label;

  const advance = () => {
    if (!next || blocked) { if (blocked) setShowIssues(true); return; }
    setStage(w.id, next.to, next.action);
    setSaid(`${next.action}. Now in ${STAGES[stageIndex(next.to)].label}.`);
  };

  return (
    <div className="wf">
      <div className="wf-head">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li><Link to={contentRoutes.workflows()}>OA workflows</Link></li>
            <li><span aria-current="page">{w.name}</span></li>
          </ol>
        </nav>

        <div className="wf-head__top">
          <div className="wf-head__title">
            <h1 ref={h} tabIndex={-1} className="ca-title">{w.name}</h1>
            <div className="wf-head__meta">
              <button type="button" className={`wf-status${issues.length && w.stage === 'build' ? ' is-unvalidated' : ''}`}
                aria-expanded={showIssues} aria-controls={`${id}-issues`} onClick={() => setShowIssues((s) => !s)}>
                {w.stage === 'build' && (issues.length ? <AlertIcon /> : <CheckIcon />)}
                {status}
                {w.stage === 'build' && issues.length > 0 && <span className="wf-status__count">{issues.length}</span>}
              </button>
              <span className="muted small">Version {w.version}</span>
              {w.dirty && <span className="wf-unsaved small">Unsaved changes</span>}
            </div>
          </div>
          <div className="ca-head__actions">
            {editable && (
              <button type="button" className="btn btn--secondary" disabled={!w.dirty}
                onClick={() => { saveVersion(w.id); setSaid(`Saved version ${w.version + 1}.`); }}>
                Save{w.dirty ? ` as version ${w.version + 1}` : 'd'}
              </button>
            )}
            {next && (
              <button type="button" className="btn btn--primary" aria-disabled={blocked || undefined}
                aria-describedby={blocked ? `${id}-why` : undefined} onClick={advance}>{next.button}</button>
            )}
            <Menu label="More workflow actions" className="wf-more" items={[
              ...(w.stage !== 'build' ? [{ label: w.stage === 'live' ? 'Edit as a new draft' : 'Back to Build', onSelect: () => {
                setStage(w.id, 'build', w.stage === 'live' ? 'Reopened as a draft (live version keeps running)' : 'Moved back to Build');
                setSaid('Back in Build. You can edit the workflow.');
              } }] : []),
              { label: 'Delete workflow', onSelect: () => setDeleting(true), divider: w.stage !== 'build' },
            ]}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></svg>
            </Menu>
          </div>
        </div>
        {blocked && (
          <p id={`${id}-why`} className="visually-hidden">
            {w.dirty ? 'Save your changes first.' : `Fix ${issues.length} validation issue${issues.length === 1 ? '' : 's'} first.`}
          </p>
        )}

        {showIssues && (
          <div id={`${id}-issues`} className="wf-issues">
            {w.stage !== 'build' ? (
              <p>This workflow is in {STAGES[si].label}. It was validated before it left Build.</p>
            ) : issues.length ? (
              <>
                <p className="wf-issues__head"><AlertIcon /> Fix these before sending it for review{w.dirty ? ', then save' : ''}:</p>
                <ul>{issues.map((x, i) => <li key={i}>{x.text}</li>)}</ul>
              </>
            ) : (
              <p className="wf-issues__head"><CheckIcon /> Everything checks out.{w.dirty ? ' Save this version to send it for review.' : ''}</p>
            )}
          </div>
        )}

        <div className="wf-progress">
          <h2 className="wf-progress__label" id={`${id}-prog`}>Workflow progress</h2>
          <ol className="stepper" aria-labelledby={`${id}-prog`}>
            {STAGES.map((s, i) => (
              <li key={s.id} className={i < si ? 'is-done' : i === si ? 'is-current' : ''} aria-current={i === si ? 'step' : undefined}>
                <span className="stepper__dot" aria-hidden="true">{i < si && <CheckIcon />}</span>
                <span className="stepper__label">{s.label}<span className="visually-hidden">{i < si ? ', done' : i === si ? ', current stage' : ''}</span></span>
              </li>
            ))}
          </ol>
        </div>

        <nav className="wf-tabs" aria-label="Workflow sections">
          {TABS.map((t) => (
            <NavLink key={t.id} to={contentRoutes.workflow(w.id, t.id)} end className="ca-tab"
              aria-current={tab === t.id ? 'page' : undefined}>{t.label}</NavLink>
          ))}
        </nav>
      </div>

      {!editable && (tab === 'builder' || tab === 'scores' || tab === 'misbehavior') && (
        <p className="readonly-note wf-readonly">
          In {STAGES[si].label}, the workflow is locked so reviewers see exactly what they approve.
          Use <strong>More workflow actions</strong> to {w.stage === 'live' ? 'edit it as a new draft' : 'move it back to Build'}.
        </p>
      )}

      {tab === 'builder' && <BuilderGraph w={w} editable={editable} issues={issues} />}
      {tab === 'history' && (
        <section className="wf-section" aria-labelledby={`${id}-hist`}>
          <h2 id={`${id}-hist`} className="section-title">History</h2>
          <ActivityList items={w.history} limit={50} />
        </section>
      )}
      {tab === 'scores' && <CompositeScores w={w} editable={editable} />}
      {tab === 'misbehavior' && <Misbehavior w={w} editable={editable} />}
      {tab === 'test-plan' && (
        <section className="wf-section">
          <h2 className="section-title">{TABS.find((t) => t.id === tab)!.label}</h2>
          <div className="soon soon--inline">
            <div className="soon__body">
              <p className="page-kicker">Coming soon</p>
              <p className="page-lede">
                {tab === 'test-plan' && 'Candidate response scenarios (all correct, all wrong, mixed and boundary cases) and their expected outcomes.'}
              </p>
            </div>
          </div>
        </section>
      )}

      <span className="visually-hidden" role="status" aria-live="polite">{said}</span>

      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        alert
        title={`Delete “${w.name}”?`}
        description={<p>{w.stage === 'live' ? 'This workflow is live. Requisitions using it will stop sending invitations. ' : ''}Modules stay in the library. This can’t be undone.</p>}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setDeleting(false)} autoFocus>Cancel</button>
            <button type="button" className="btn btn--danger" onClick={() => { deleteWorkflow(w.id); navigate(contentRoutes.workflows()); }}>Delete workflow</button>
          </>
        }
      />
    </div>
  );
}

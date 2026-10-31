import { useId, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../../components/usePageTitle';
import Dialog from '../../../components/content/Dialog';
import Menu from '../../../components/content/Menu';
import { ActivityList } from '../../../components/content/Byline';
import { AlertIcon, CheckIcon, LockIcon } from '../../../components/content/icons';
import { useStored } from '../../../data/store';
import { useModules } from '../../../data/content/store';
import { PEOPLE, person, setMe, useMe } from '../../../data/content/people';
import { when } from '../../../data/content/format';
import { rollUp } from '../../../data/content/testplan';
import {
  STAGES, decideReview, deleteWorkflow, lastDecision, openRound, requestReview, saveVersion, setStage, stageIndex,
  unlockWorkflow, useWorkflows, validate, withdrawReview,
} from '../../../data/content/workflows';
import type { CommentTarget, PersonId, Stage, Workflow } from '../../../data/content/types';
import { contentRoutes, type WorkflowTab } from '../routes';
import BuilderGraph from './BuilderGraph';
import CompositeScores from './scores/CompositeScores';
import Misbehavior from './Misbehavior';
import TestPlanTab from './test/TestPlanTab';
import { CommentsCtx, CommentsPanel, keyOf } from './comments/Comments';

const TABS: { id: WorkflowTab; label: string }[] = [
  { id: 'builder', label: 'Builder graph' },
  { id: 'scores', label: 'Composite scores' },
  { id: 'misbehavior', label: 'Misbehavior settings' },
  { id: 'test-plan', label: 'Test plan' },
  { id: 'history', label: 'History' },
];

/** After Program review approves a workflow, these move it on. */
const NEXT: Partial<Record<Stage, { to: Stage; button: string; action: string }>> = {
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

const names = (ids: PersonId[]) => {
  const n = ids.map((p) => person(p).name);
  return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
};

function Editor({ w }: { w: Workflow }) {
  const { tab = 'builder' } = useParams() as { tab?: WorkflowTab };
  const h = usePageTitle(w.name);
  const id = useId();
  const navigate = useNavigate();
  const modules = useModules();
  const me = useMe();
  const [showIssues, setShowIssues] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [deciding, setDeciding] = useState<'approved' | 'changes' | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [said, setSaid] = useState('');
  const [commentsOpen, setCommentsOpen] = useStored<boolean>('content:ui:comments-open', () => false);
  const [focus, setFocus] = useState<CommentTarget | null>(null);

  const issues = validate(w, modules);
  const si = stageIndex(w.stage);
  const editable = w.stage === 'build';
  const round = openRound(w);
  const decision = lastDecision(w);
  const approved = si >= stageIndex('e2e');
  const lastRound = w.reviews[w.reviews.length - 1];
  const changesRequested = w.stage === 'build' && lastRound?.decision?.outcome === 'changes';
  const isReviewer = !!round && round.reviewers.includes(me);
  const next = NEXT[w.stage];
  const testsDone = !!w.testPlan && rollUp(w.testPlan.suites.flatMap((x) => x.cases)) === 'complete';
  const reviewBlocked = w.dirty || issues.length > 0;
  const nextBlocked = w.stage === 'e2e' && !testsDone;
  const openThreads = w.comments.filter((t) => !t.resolved).length;

  const ctx = useMemo(() => ({
    comment: (t: CommentTarget) => { setFocus(t); setCommentsOpen(true); },
    openCount: (t: Pick<CommentTarget, 'kind' | 'id'>) => w.comments.filter((x) => !x.resolved && keyOf(x.target) === keyOf(t)).length,
  }), [w.comments, setCommentsOpen]);

  const status = w.stage === 'build'
    ? `Draft · ${issues.length ? 'unvalidated' : 'validated'}`
    : w.stage === 'program-review' ? 'In Program review' : STAGES[si].label;
  const lockText = w.stage === 'program-review'
    ? `Locked while in review`
    : approved ? `Locked: approved in Program review${decision ? ` by ${person(decision.by).name}` : ''}` : '';

  const advance = () => {
    if (!next) return;
    if (nextBlocked) { setSaid(w.testPlan ? 'Every test case has to pass first. Open the Test plan tab.' : 'Create and complete a test plan first.'); return; }
    setStage(w.id, next.to, next.action);
    setSaid(`${next.action}. Now in ${STAGES[stageIndex(next.to)].label}.`);
  };

  return (
    <CommentsCtx.Provider value={ctx}>
      <div className={`wf-shell${commentsOpen ? ' has-comments' : ''}`}>
        <div className="wf" data-scroll>
          <div className="wf-head">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <ol>
                <li><Link to={contentRoutes.workflows()}>OA workflows</Link></li>
                <li><span aria-current="page">{w.name}</span></li>
              </ol>
            </nav>

            <div className="wf-head__top">
              <div className="wf-head__title">
                <h1 ref={h} tabIndex={-1} className="ca-title wf-title">
                  {w.name}
                  {lockText && <span className="wf-lock" title={lockText}><LockIcon /><span className="visually-hidden">, {lockText.toLowerCase()}</span></span>}
                </h1>
                <div className="wf-head__meta">
                  <button type="button" className={`wf-status${issues.length && w.stage === 'build' ? ' is-unvalidated' : ''}`}
                    aria-expanded={showIssues} aria-controls={`${id}-issues`} onClick={() => setShowIssues((s) => !s)}>
                    {w.stage === 'build' && (issues.length ? <AlertIcon /> : <CheckIcon />)}
                    {status}
                    {w.stage === 'build' && issues.length > 0 && <span className="wf-status__count">{issues.length}</span>}
                  </button>
                  {changesRequested && <span className="tbadge tbadge--failed">Changes requested</span>}
                  <span className="muted small">Version {w.version}</span>
                  {w.dirty && <span className="wf-unsaved small">Unsaved changes</span>}
                </div>
              </div>
              <div className="ca-head__actions">
                <button type="button" className="ctoggle" aria-pressed={commentsOpen} onClick={() => { setFocus(null); setCommentsOpen(!commentsOpen); }}>
                  Comments ({openThreads})
                  <span className="switch__track" aria-hidden="true"><span className="switch__thumb" /></span>
                </button>
                {editable && (
                  <>
                    <button type="button" className="btn btn--secondary" disabled={!w.dirty}
                      onClick={() => { saveVersion(w.id); setSaid(`Saved version ${w.version + 1}.`); }}>
                      Save{w.dirty ? ` as version ${w.version + 1}` : 'd'}
                    </button>
                    <button type="button" className="btn btn--primary" aria-disabled={reviewBlocked || undefined}
                      aria-describedby={reviewBlocked ? `${id}-why` : undefined}
                      onClick={() => (reviewBlocked ? setShowIssues(true) : setRequesting(true))}>
                      {w.reviews.length ? 'Request review again' : 'Request review'}
                    </button>
                  </>
                )}
                {approved && (
                  <button type="button" className="btn btn--secondary" onClick={() => setUnlocking(true)}>
                    <LockIcon /> Unlock for edits
                  </button>
                )}
                {next && (
                  <button type="button" className="btn btn--primary" aria-disabled={nextBlocked || undefined}
                    aria-describedby={nextBlocked ? `${id}-why` : undefined} onClick={advance}>{next.button}</button>
                )}
                <Menu label="More workflow actions" className="wf-more" items={[
                  { label: 'Delete workflow', onSelect: () => setDeleting(true) },
                ]}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></svg>
                </Menu>
              </div>
            </div>
            <p id={`${id}-why`} className="visually-hidden">
              {w.stage === 'e2e' ? (w.testPlan ? 'Every test case in the test plan has to pass first.' : 'Create a test plan and pass every case first.')
                : w.dirty ? 'Save your changes first.' : `Fix ${issues.length} validation issue${issues.length === 1 ? '' : 's'} first.`}
            </p>

            {showIssues && (
              <div id={`${id}-issues`} className="wf-issues">
                {w.stage !== 'build' ? (
                  <p>This workflow is in {STAGES[si].label}. It was validated before it was sent for review.</p>
                ) : issues.length ? (
                  <>
                    <p className="wf-issues__head"><AlertIcon /> Fix these before requesting review{w.dirty ? ', then save' : ''}:</p>
                    <ul>{issues.map((x, i) => <li key={i}>{x.text}</li>)}</ul>
                  </>
                ) : (
                  <p className="wf-issues__head"><CheckIcon /> Everything checks out.{w.dirty ? ' Save this version to request review.' : ''}</p>
                )}
              </div>
            )}

            {/* Review state */}
            {round && (
              <div className="review-bar" role="region" aria-label="Program review">
                <div className="review-bar__text">
                  <p><b>{person(round.requested.by).name}</b> requested Program review from {names(round.reviewers)}, <time dateTime={round.requested.at}>{when(round.requested.at, true)}</time>{round.n > 1 ? ` (round ${round.n})` : ''}.</p>
                  {round.message && <p className="review-bar__msg">“{round.message}”</p>}
                  {!isReviewer && (
                    <p className="muted small">
                      Waiting on {names(round.reviewers)}. In this prototype you can{' '}
                      <button type="button" className="link-button" onClick={() => { setMe(round.reviewers[0]); setSaid(`Now signed in as ${person(round.reviewers[0]).name}.`); }}>switch to {person(round.reviewers[0]).name}</button> to review it.
                    </p>
                  )}
                </div>
                <div className="review-bar__actions">
                  {isReviewer ? (
                    <>
                      <button type="button" className="btn btn--secondary" onClick={() => { setFocus(null); setCommentsOpen(true); }}>Leave comments</button>
                      <button type="button" className="btn btn--secondary" onClick={() => setDeciding('changes')}>Request changes</button>
                      <button type="button" className="btn btn--primary" onClick={() => setDeciding('approved')}>Approve</button>
                    </>
                  ) : (
                    <button type="button" className="btn btn--secondary" onClick={() => { withdrawReview(w.id); setSaid('Review request withdrawn. Back in Build.'); }}>Withdraw request</button>
                  )}
                </div>
              </div>
            )}
            {changesRequested && lastRound.decision && (
              <div className="review-bar review-bar--changes" role="region" aria-label="Review feedback">
                <div className="review-bar__text">
                  <p><b>{person(lastRound.decision.by).name}</b> requested changes, <time dateTime={lastRound.decision.at}>{when(lastRound.decision.at, true)}</time>.</p>
                  {lastRound.decision.note && <p className="review-bar__msg">“{lastRound.decision.note}”</p>}
                  <p className="muted small">Make the changes, save, and request review again.</p>
                </div>
                <div className="review-bar__actions">
                  <button type="button" className="btn btn--secondary" onClick={() => { setFocus(null); setCommentsOpen(true); }}>See comments ({openThreads})</button>
                </div>
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
              <LockIcon />
              {w.stage === 'program-review'
                ? <span>Locked while {names(round?.reviewers ?? [])} review{round && round.reviewers.length === 1 ? 's' : ''} it, so they see exactly what they approve. Comments are still open.</span>
                : <span>Approved in Program review{decision ? ` by ${person(decision.by).name}` : ''} and locked. To change modules, scores or settings, choose <strong>Unlock for edits</strong>; it will need Program review again.</span>}
            </p>
          )}

          {tab === 'builder' && <BuilderGraph w={w} editable={editable} issues={issues} />}
          {tab === 'history' && (
            <section className="wf-section" aria-labelledby={`${id}-hist`}>
              <h2 id={`${id}-hist`} className="section-title">History</h2>
              <ActivityList items={w.history} limit={60} />
            </section>
          )}
          {tab === 'scores' && <CompositeScores w={w} editable={editable} />}
          {tab === 'misbehavior' && <Misbehavior w={w} editable={editable} />}
          {tab === 'test-plan' && <TestPlanTab w={w} />}

          <span className="visually-hidden" role="status" aria-live="polite">{said}</span>
        </div>

        {commentsOpen && (
          <CommentsPanel w={w} modules={modules} focus={focus} onFocus={setFocus}
            onClose={() => { setCommentsOpen(false); setFocus(null); }} />
        )}
      </div>

      {requesting && <RequestDialog w={w} onClose={() => setRequesting(false)} onSent={(who) => { setRequesting(false); setSaid(`Review requested from ${names(who)}. The workflow is locked until they respond.`); }} />}
      {deciding && <DecideDialog w={w} outcome={deciding} onClose={() => setDeciding(null)} onDone={(t) => { setDeciding(null); setSaid(t); }} />}

      <Dialog open={unlocking} onClose={() => setUnlocking(false)} title="Unlock for edits?"
        description={<>
          <p>The workflow moves back to Build so you can change modules, scores and settings. When you’re done, it needs Program review again before testing can continue.</p>
          {w.testPlan && <p>The test plan and its results are kept. Re-run any cases your changes affect.</p>}
          {w.stage === 'live' && <p><b>The live version keeps running</b> for requisitions until the new version launches.</p>}
        </>}
        footer={<>
          <button type="button" className="btn btn--secondary" autoFocus onClick={() => setUnlocking(false)}>Cancel</button>
          <button type="button" className="btn btn--primary" onClick={() => { unlockWorkflow(w.id); setUnlocking(false); setSaid('Unlocked. Back in Build; request review again when you’re done.'); }}>Unlock for edits</button>
        </>} />

      <Dialog open={deleting} onClose={() => setDeleting(false)} alert title={`Delete “${w.name}”?`}
        description={<p>{w.stage === 'live' ? 'This workflow is live. Requisitions using it will stop sending invitations. ' : ''}Modules stay in the library. This can’t be undone.</p>}
        footer={<>
          <button type="button" className="btn btn--secondary" onClick={() => setDeleting(false)} autoFocus>Cancel</button>
          <button type="button" className="btn btn--danger" onClick={() => { deleteWorkflow(w.id); navigate(contentRoutes.workflows()); }}>Delete workflow</button>
        </>} />
    </CommentsCtx.Provider>
  );
}

function RequestDialog({ w, onClose, onSent }: { w: Workflow; onClose: () => void; onSent: (who: PersonId[]) => void }) {
  const me = useMe();
  const others = Object.values(PEOPLE).filter((p) => p.id !== me);
  const [who, setWho] = useState<PersonId[]>(() => {
    const fromSettings = (w.settings.reviewers.program ?? []).filter((p) => p !== me);
    return fromSettings.length ? fromSettings : ['mon'].filter((p) => p !== me) as PersonId[];
  });
  const [msg, setMsg] = useState('');
  const [tried, setTried] = useState(false);
  return (
    <Dialog open onClose={onClose} title="Request Program review"
      description={<p>Reviewers can comment on anything in the workflow, then approve it or request changes. It’s locked until they do. Once approved, End-to-end testing begins.</p>}
      footer={<>
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="req-form" className="btn btn--primary">Request review</button>
      </>}>
      <form id="req-form" className="form" noValidate onSubmit={(e) => {
        e.preventDefault(); setTried(true);
        if (!who.length) return;
        requestReview(w.id, who, msg); onSent(who);
      }}>
        <fieldset className="checks checks--stack" aria-invalid={tried && !who.length}>
          <legend className="field__label">Reviewers <span className="req" aria-hidden="true">*</span></legend>
          {others.map((p) => (
            <label key={p.id} className="check">
              <input type="checkbox" checked={who.includes(p.id)} onChange={(e) => setWho(e.target.checked ? [...who, p.id] : who.filter((x) => x !== p.id))} />
              {p.name} <span className="muted small">· {p.role}</span>
            </label>
          ))}
        </fieldset>
        {tried && !who.length && <span className="field-error-text"><AlertIcon /> Choose at least one reviewer.</span>}
        <div className="field">
          <label className="field__label" htmlFor="req-msg">Message <span className="muted">(optional)</span></label>
          <textarea id="req-msg" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="What should reviewers look at?" aria-describedby="req-msg-h" />
          <span id="req-msg-h" className="field-help">Posted as a comment on the whole workflow.</span>
        </div>
      </form>
    </Dialog>
  );
}

function DecideDialog({ w, outcome, onClose, onDone }: { w: Workflow; outcome: 'approved' | 'changes'; onClose: () => void; onDone: (said: string) => void }) {
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const openThreads = w.comments.filter((t) => !t.resolved).length;
  const approve = outcome === 'approved';
  return (
    <Dialog open onClose={onClose} title={approve ? 'Approve this workflow?' : 'Request changes?'}
      description={approve
        ? <><p>Approving locks the workflow and moves it to End-to-end testing, where the author builds and runs the test plan.</p>{openThreads > 0 && <p><b>{openThreads} comment thread{openThreads === 1 ? ' is' : 's are'} still open.</b> They stay visible after approval.</p>}</>
        : <p>The workflow goes back to Build for the author to change. Say what needs to change; your comments in the workflow stay attached.</p>}
      footer={<>
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="dec-form" className="btn btn--primary">{approve ? 'Approve' : 'Request changes'}</button>
      </>}>
      <form id="dec-form" className="form" noValidate onSubmit={(e) => {
        e.preventDefault(); setTried(true);
        if (!approve && !note.trim()) return;
        decideReview(w.id, outcome, note);
        onDone(approve ? 'Approved. The workflow is locked and in End-to-end testing.' : 'Changes requested. The workflow is back in Build.');
      }}>
        <div className="field">
          <label className="field__label" htmlFor="dec-note">{approve ? 'Note' : 'What needs to change'} {approve ? <span className="muted">(optional)</span> : <span className="req" aria-hidden="true">*</span>}</label>
          <textarea id="dec-note" rows={4} autoFocus value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={tried && !approve && !note.trim()} />
          {tried && !approve && !note.trim() && <span className="field-error-text"><AlertIcon /> Say what needs to change.</span>}
        </div>
      </form>
    </Dialog>
  );
}

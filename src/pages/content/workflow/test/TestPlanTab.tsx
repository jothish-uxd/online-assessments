import { useEffect, useId, useState } from 'react';
import Dialog from '../../../../components/content/Dialog';
import { AlertIcon, CheckIcon, CloseIcon, DownloadIcon, LockIcon, PlusIcon, TrashIcon } from '../../../../components/content/icons';
import { useModules, now } from '../../../../data/content/store';
import { person } from '../../../../data/content/people';
import { when } from '../../../../data/content/format';
import {
  ROLLUP_TEXT, counts, newSuiteId, rollUp, suggestPlan, toCsv,
} from '../../../../data/content/testplan';
import { addSuite, createTestPlan, deleteSuite, useWorkflows } from '../../../../data/content/workflows';
import type { TestCase, TestSuite, Workflow } from '../../../../data/content/types';
import CaseCard from './CaseCard';
import CaseDialog from './CaseDialog';
import { RollupBadge } from './badges';
import { CommentButton } from '../comments/Comments';
import { STAGES, stageIndex } from '../../../../data/content/workflows';

/** Test plan: scenarios that prove the online assessment behaves before it goes live. */
export default function TestPlanTab({ w }: { w: Workflow }) {
  const id = useId();
  const modules = useModules();
  const workflows = useWorkflows();
  const plan = w.testPlan;
  const [toast, setToast] = useState('');
  const [suiteId, setSuiteId] = useState<string | null>(plan?.suites[0]?.id ?? null);
  const [newSuite, setNewSuite] = useState(false);
  const [deleting, setDeleting] = useState<TestSuite | null>(null);
  const [adding, setAdding] = useState(false);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    if (plan && (!suiteId || !plan.suites.some((s) => s.id === suiteId))) setSuiteId(plan.suites[0]?.id ?? null);
  }, [plan, suiteId]);

  const say = (t: string) => setToast(t);
  const si = stageIndex(w.stage);
  const testing = w.stage === 'e2e';
  const readOnly = !testing;

  if (!plan) {
    return (
      <section className="wf-section wf-section--wide" aria-labelledby={`${id}-h`}>
        <h2 id={`${id}-h`} className="section-title">Test plan</h2>
        <div className="tp-empty">
          <span className="soon__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M9 4h6M10 4v5l-5 9a1.5 1.5 0 0 0 1.3 2.2h11.4A1.5 1.5 0 0 0 19 18l-5-9V4" /><path d="M7.5 14h9" /></svg>
          </span>
          <h3 className="sub-title">There is no test plan for this workflow</h3>
          <p className="muted">A test plan proves the online assessment behaves before it goes live: the right modules appear, scores land in the right band, and misbehavior is caught.</p>
          {si < stageIndex('e2e') ? (
            <p className="tp-gate"><LockIcon /> Test plans start in End-to-end testing, once Program review approves the workflow. It’s in <b>{STAGES[si].label}</b> now.</p>
          ) : !testing ? (
            <p className="tp-gate">This workflow passed End-to-end testing without a test plan in this prototype.</p>
          ) : (<>
          <p className="muted">We’ll start you with suites suggested from this workflow’s scoring, misbehavior settings, variations and equivalent workflows.</p>
          <button type="button" className="btn btn--primary" onClick={() => {
            const p = suggestPlan(w, modules, workflows);
            createTestPlan(w.id, p);
            setSuiteId(p.suites[0]?.id ?? null);
            say('Test plan created.');
          }}>Create test plan</button>
          </>)}
        </div>
      </section>
    );
  }

  const c = counts(plan);
  const status = rollUp(plan.suites.flatMap((s) => s.cases));
  const order = { failed: 0, 'in-progress': 1, 'not-started': 2, passed: 3, complete: 4 } as const;
  const sorted = plan.suites.map((s, i) => ({ s, n: i + 1, st: rollUp(s.cases) })).sort((a, b) => order[a.st] - order[b.st] || a.n - b.n);
  const current = plan.suites.find((s) => s.id === suiteId);
  const currentN = current ? plan.suites.indexOf(current) + 1 : 0;

  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(w)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${plan.name}_test_plan.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('Test plan downloaded as a CSV file.');
  };

  return (
    <section className="wf-section wf-section--wide" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="section-title">Test plan</h2>

      {toast && (
        <div className="tp-toast" role="status">
          <CheckIcon /> <span>{toast}</span>
          <button type="button" className="bframe__btn" aria-label="Dismiss" onClick={() => setToast('')}><CloseIcon /></button>
        </div>
      )}

      {readOnly && (
        <p className="readonly-note tp-readonly"><LockIcon /> {si < stageIndex('e2e')
          ? <span>Unlocked for edits, so testing is paused. Results so far are kept; the plan opens again once Program review approves the changes.</span>
          : <span>Testing finished in End-to-end testing. The plan and its results are kept as a record.</span>}</p>
      )}

      <div className="tp-card">
        <div className="tp-card__main">
          <div className="tp-card__title">
            <h3 className="mono">{plan.name}</h3>
            <RollupBadge status={status} />
          </div>
          <dl className="tp-card__meta">
            <div><dt>Creator</dt><dd>{person(plan.created.by).name}</dd></div>
            <div><dt>Date created</dt><dd><time dateTime={plan.created.at}>{when(plan.created.at)}</time></dd></div>
            <div><dt>Date modified</dt><dd>{plan.modified ? <time dateTime={plan.modified.at}>{when(plan.modified.at)}</time> : '—'}</dd></div>
          </dl>
          <h4 className="tp-card__label">Description</h4>
          <p className="tp-card__desc">{plan.description}</p>
        </div>
        <div className="tp-card__side">
          <div className="tp-card__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={download}><DownloadIcon /> Download data</button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setGuide(true)}>View guide</button>
          </div>
          <div className="tp-stats" role="group" aria-label="Case progress">
            <p className="tp-stats__total"><strong>{c.total}</strong> cases</p>
            <ul className="tp-stats__list">
              <li><span className="tstatus tstatus--not-started" aria-hidden="true" /> Not started: {c.notStarted || '—'}</li>
              <li><span className="tstatus tstatus--in-progress" aria-hidden="true" /> In progress: {c.inProgress || '—'}</li>
              <li><span className="tstatus tstatus--passed" aria-hidden="true" /> Passed: {c.passed || '—'}</li>
              <li><span className="tstatus tstatus--failed" aria-hidden="true" /> Failed: {c.failed || '—'}</li>
            </ul>
            {c.total > 0 && (
              <div className="tp-bar" aria-hidden="true">
                {(['passed', 'failed', 'inProgress', 'notStarted'] as const).map((k) => c[k] > 0 && <span key={k} className={`tp-bar__seg tp-bar__seg--${k}`} style={{ flexGrow: c[k] }} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section-head tp-suites-head">
        <h3 className="section-title">Test suites ({plan.suites.length})</h3>
        {!readOnly && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setNewSuite(true)}><PlusIcon /> Create new test suite</button>}
      </div>

      <div className="scores tp">
        <div className="scores__side">
          <p className="tp__sort">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 13V3M2 5l2-2 2 2M8 5h6M8 8h4.5M8 11h3" /></svg>
            Sorted by most relevant
          </p>
          <ul className="tp__list" aria-label="Test suites, ones needing attention first">
            {sorted.map(({ s, n, st }) => (
              <li key={s.id}>
                <button type="button" className="tp__suite" aria-current={s.id === suiteId ? 'true' : undefined} onClick={() => setSuiteId(s.id)}>
                  <span className="tp__suite-name">Test suite {n}</span>
                  <RollupBadge status={st} />
                  <span className="tp__suite-reason">{s.reason}</span>
                  <svg className="score-row__chev" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="scores__pane">
          {current ? (
            <div className="tp-suite" id={`suite-${current.id}`}>
              <div className="tp-suite__head">
                <div>
                  <h3 className="score-form__title">Test suite {currentN}</h3>
                  <p className="tp-suite__reason">{current.reason}</p>
                  <p className="muted small">{current.description}</p>
                </div>
                <span className="tp-suite__tools">
                  <CommentButton target={{ kind: 'suite', id: current.id, label: `Test suite ${currentN}: ${current.reason}`, tab: 'test-plan' }} />
                  {!readOnly && <button type="button" className="bframe__btn tp-danger" aria-label={`Delete test suite ${currentN}`} onClick={() => setDeleting(current)}><TrashIcon /></button>}
                </span>
              </div>

              <div className="section-head tp-cases-head">
                <h4 className="sub-title">Test cases</h4>
                {!readOnly && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAdding(true)}><PlusIcon /> Add new case</button>}
              </div>

              {current.cases.length ? (
                <ol className="tp-cases">
                  {current.cases.map((tc: TestCase, i) => (
                    <li key={tc.id}>
                      <CaseCard w={w} suite={current} suiteN={currentN} tc={tc} n={i + 1} onToast={say} readOnly={readOnly} />
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="tp-empty tp-empty--small">
                  <h5 className="sub-title">There are no cases for this test suite</h5>
                  {!readOnly && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAdding(true)}>Create a case</button>}
                </div>
              )}
            </div>
          ) : (
            <div className="tp-empty tp-empty--small">
              <h4 className="sub-title">No test suites yet</h4>
              {!readOnly && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setNewSuite(true)}>Create new test suite</button>}
            </div>
          )}
        </div>
      </div>

      {newSuite && <SuiteDialog onClose={() => setNewSuite(false)} onSave={(reason, description) => {
        const s: TestSuite = { id: newSuiteId(), reason, description, cases: [], created: now() };
        addSuite(w.id, s); setSuiteId(s.id); setNewSuite(false); say('Test suite created.');
      }} />}

      {deleting && (
        <Dialog open alert onClose={() => setDeleting(null)} title={`Delete test suite ${plan.suites.indexOf(deleting) + 1}`}
          description={<p className="tp-warn"><AlertIcon /> Are you sure you want to delete the test suite for: <strong>{deleting.reason}</strong>? Its {deleting.cases.length} case{deleting.cases.length === 1 ? '' : 's'} and their results go with it. It can’t be undone.</p>}
          footer={<>
            <button type="button" className="btn btn--secondary" autoFocus onClick={() => setDeleting(null)}>Cancel</button>
            <button type="button" className="btn btn--danger" onClick={() => { deleteSuite(w.id, deleting.id, deleting.reason); setDeleting(null); say('Test suite deleted.'); }}>Delete</button>
          </>} />
      )}

      {adding && current && (
        <CaseDialog w={w} suiteId={current.id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); say('Test case created.'); }} />
      )}

      {guide && (
        <Dialog open onClose={() => setGuide(false)} size="lg" title="How test plans work"
          footer={<button type="button" className="btn btn--primary" onClick={() => setGuide(false)}>Got it</button>}>
          <ol className="tp-guide">
            <li><strong>Plan.</strong> Group scenarios into test suites by what they prove, like scoring at the boundaries or misbehavior detection.</li>
            <li><strong>Describe each case.</strong> Pick a test candidate and job metadata. These decide which score variation and re-used scores apply.</li>
            <li><strong>Generate a test link.</strong> It opens this exact workflow version as that candidate. Once a link exists the case is locked; duplicate it to change the metadata.</li>
            <li><strong>Run it.</strong> Take the assessment through the link, following the instructions.</li>
            <li><strong>Check what happened.</strong> <em>View system behavior and score results</em> shows which modules were presented or skipped, and every score.</li>
            <li><strong>Record the result.</strong> Pass, fail, or failed and re-tested, with notes. When every case passes, the workflow can leave End-to-end testing.</li>
          </ol>
        </Dialog>
      )}
    </section>
  );
}

function SuiteDialog({ onClose, onSave }: { onClose: () => void; onSave: (reason: string, description: string) => void }) {
  const [reason, setReason] = useState('');
  const [desc, setDesc] = useState('');
  const [tried, setTried] = useState(false);
  return (
    <Dialog open onClose={onClose} title="Create new test suite" description={<p>Fields marked with an asterisk (*) are required.</p>}
      footer={<>
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="suite-form" className="btn btn--primary">Save</button>
      </>}>
      <form id="suite-form" className="form" noValidate onSubmit={(e) => { e.preventDefault(); setTried(true); if (reason.trim() && desc.trim()) onSave(reason.trim(), desc.trim()); }}>
        <div className="field">
          <label className="field__label" htmlFor="suite-reason">Reason <span className="req" aria-hidden="true">*</span></label>
          <input id="suite-reason" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: Rebel Intelligence security" aria-invalid={tried && !reason.trim()} required />
          {tried && !reason.trim() && <span className="field-error-text"><AlertIcon /> Give the suite a reason.</span>}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="suite-desc">Description <span className="req" aria-hidden="true">*</span></label>
          <textarea id="suite-desc" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What these cases prove" aria-invalid={tried && !desc.trim()} required />
          {tried && !desc.trim() && <span className="field-error-text"><AlertIcon /> Describe what the suite tests.</span>}
        </div>
      </form>
    </Dialog>
  );
}

export { ROLLUP_TEXT };

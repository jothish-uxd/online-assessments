import { useId, useRef, useState } from 'react';
import Dialog from '../../../../components/content/Dialog';
import { CopyIcon, LinkIcon, TrashIcon } from '../../../../components/content/icons';
import { useModules, now } from '../../../../data/content/store';
import { when } from '../../../../data/content/format';
import { candidateLabel, caseStatus, newCaseId, simulate } from '../../../../data/content/testplan';
import { addCase, deleteCase, updateCase, useWorkflows } from '../../../../data/content/workflows';
import type { TestCase, TestSuite, Workflow } from '../../../../data/content/types';
import { OutcomeBadge, StatusBadge } from './badges';
import CaseDialog from './CaseDialog';
import ResultsDialog from './ResultsDialog';
import RunDrawer from './RunDrawer';
import { CommentButton } from '../comments/Comments';

const EditIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>
);
const Chevron = ({ open }: { open: boolean }) => (
  <svg className={`tp-chev${open ? ' is-open' : ''}`} viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
);

/** One test case: its scenario and metadata, the test link, what to do and expect, and its results. */
export default function CaseCard({ w, suite, suiteN, tc, n, onToast, readOnly }: {
  w: Workflow; suite: TestSuite; suiteN: number; tc: TestCase; n: number; onToast: (t: string) => void; readOnly: boolean;
}) {
  const id = useId();
  const modules = useModules();
  const workflows = useWorkflows();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [results, setResults] = useState(false);
  const [run, setRun] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tip, setTip] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const label = `Test case ${suiteN}.${n}`;
  const locked = !!tc.link;
  const done = tc.result.outcome !== 'not-tested';
  const oa = done && locked ? simulate(w, tc, modules, workflows).oaScore : null;
  const expected = tc.expected.split('\n').map((x) => x.trim()).filter(Boolean);

  const generate = () => {
    updateCase(w.id, suite.id, { ...tc, link: `https://assess.onlineassessments.app/t/${w.code}-TC${suiteN}.${n}`, linkCreated: now() }, `Generated a test link for ${label}`);
    onToast(`Test link generated for ${label}. The case is now locked; duplicate it to change the metadata.`);
  };
  const duplicate = () => {
    const copy: TestCase = { ...structuredClone(tc), id: newCaseId(), title: `${tc.title} (copy)`, link: undefined, linkCreated: undefined, result: { tester: '', outcome: 'not-tested', notes: '' }, created: now() };
    addCase(w.id, suite.id, copy, tc.id);
    onToast(`Duplicated ${label} as test case ${suiteN}.${n + 1}.`);
  };

  return (
    <article id={`case-${tc.id}`} className={`tcase${open ? ' is-open' : ''}`} aria-labelledby={`${id}-h`}>
      <div className="tcase__head">
        <h5 className="tcase__label" id={`${id}-h`}>
          <button type="button" className="tcase__toggle" aria-expanded={open} aria-controls={`${id}-b`} onClick={() => setOpen(!open)}>
            <Chevron open={open} /> {label}
          </button>
        </h5>
        <StatusBadge status={caseStatus(tc)} />
        <div className="tcase__actions">
          <button type="button" className="btn btn--secondary btn--sm" aria-disabled={!locked || undefined}
            aria-describedby={!locked ? `${id}-runwhy` : undefined}
            onClick={() => { if (locked) setRun(true); }}>View system behavior and score results</button>
          {!locked && <span id={`${id}-runwhy`} className="visually-hidden">Generate the test link first.</span>}
          <CommentButton className="tcase__icon" target={{ kind: 'case', id: tc.id, label: `${label}: ${tc.title}`, tab: 'test-plan' }} />
          {!readOnly && <>
          <button type="button" className="bframe__btn tcase__icon" aria-label={`Duplicate ${label}`} onClick={duplicate}><CopyIcon /></button>
          <span className="tcase__tipwrap">
            <button ref={editRef} type="button" className="bframe__btn tcase__icon" aria-label={`Edit ${label}`}
              aria-disabled={locked || undefined} aria-describedby={locked && tip ? `${id}-tip` : undefined}
              onClick={() => (locked ? setTip(!tip) : setEditing(true))}
              onBlur={() => setTip(false)} onMouseEnter={() => locked && setTip(true)} onMouseLeave={() => setTip(false)}
              onKeyDown={(e) => { if (e.key === 'Escape') setTip(false); }}>
              <EditIcon />
            </button>
            {tip && (
              <span id={`${id}-tip`} role="tooltip" className="tcase__tip">
                Unable to edit this scenario, because a test link has been generated. To change its job metadata, duplicate it and generate a new link.
              </span>
            )}
          </span>
          <button type="button" className="bframe__btn tcase__icon tp-danger" aria-label={`Delete ${label}`} onClick={() => setDeleting(true)}><TrashIcon /></button>
          </>}
        </div>
      </div>

      {open && (
        <div id={`${id}-b`} className="tcase__body">
          <div>
            <p className="tcase__title">{tc.title}</p>
            {tc.summary && <p className="muted small">{tc.summary}</p>}
          </div>
          <dl className="tcase__meta">
            <div><dt>Workflow</dt><dd>{w.name} (ver {tc.version})</dd></div>
            <div className="tcase__meta-wide"><dt>Candidate</dt><dd>{candidateLabel(tc.candidateId)}</dd></div>
            <div><dt>Home system</dt><dd>{tc.country}</dd></div>
            <div><dt>Job code</dt><dd className="mono">{tc.jobCode}</dd></div>
            <div><dt>Job family</dt><dd>{tc.jobFamily}</dd></div>
            <div><dt>Job level</dt><dd>{tc.jobLevel}</dd></div>
            <div className="tcase__meta-wide"><dt>Job classification</dt><dd>{tc.jobClass}</dd></div>
          </dl>

          <div className="tcase__link">
            {tc.link ? (
              <p><LinkIcon /> <span className="tcase__linklabel">Test link</span> <a href={tc.link} onClick={(e) => e.preventDefault()} className="mono">{tc.link}</a>
                {tc.linkCreated && <span className="muted small"> · generated <time dateTime={tc.linkCreated.at}>{when(tc.linkCreated.at, true)}</time></span>}</p>
            ) : readOnly ? <p className="muted small">No test link was generated.</p> : (
              <>
                <button type="button" className="btn btn--secondary btn--sm" onClick={generate}>Generate test link</button>
                <span className="muted small">Opens version {w.version} as {candidateLabel(tc.candidateId).split(' (')[0]}. Editing locks once it exists.</span>
              </>
            )}
          </div>

          <div className="tcase__cols">
            <div>
              <h6 className="tcase__h">Instructions</h6>
              {tc.instructions.length ? <ol className="tcase__ol">{tc.instructions.map((x, i) => <li key={i}>{x}</li>)}</ol> : <p className="muted small">None</p>}
            </div>
            <div>
              <h6 className="tcase__h">Expected behavior</h6>
              <ol className="tcase__ol">{expected.map((x, i) => <li key={i}>{x}</li>)}</ol>
            </div>
          </div>

          <div className="tcase__results">
            <div className="tcase__results-head">
              <h6 className="tcase__h">Case results</h6>
              {!readOnly && <button type="button" className="bframe__btn tcase__icon" aria-label={`Edit results for ${label}`} onClick={() => setResults(true)}><EditIcon /></button>}
            </div>
            <dl className="tcase__resmeta">
              <div><dt>Tester</dt><dd>{tc.result.tester || 'Unassigned'}</dd></div>
              <div><dt>OA score</dt><dd>{oa ? <span className="tag">{oa}</span> : <span className="tag tag--muted">Not available</span>}</dd></div>
              <div><dt>Test result</dt><dd><OutcomeBadge outcome={tc.result.outcome} /></dd></div>
              <div><dt>Date entered</dt><dd>{tc.result.entered ? <time dateTime={tc.result.entered.at}>{when(tc.result.entered.at)}</time> : '—'}</dd></div>
            </dl>
            <div className="tcase__notes"><span className="tcase__notes-label">Notes</span><p>{tc.result.notes || '—'}</p></div>
          </div>
        </div>
      )}

      {editing && <CaseDialog w={w} suiteId={suite.id} existing={tc} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onToast(`${label} saved.`); }} />}
      {results && <ResultsDialog w={w} suiteId={suite.id} tc={tc} oa={oa} onClose={() => setResults(false)} onSaved={() => { setResults(false); onToast('Test case results saved.'); }} />}
      {run && <RunDrawer w={w} tc={tc} title={`Test suite ${suiteN}, case ${n}`} onClose={() => setRun(false)} />}
      {deleting && (
        <Dialog open alert onClose={() => setDeleting(false)} title={`Delete ${label.toLowerCase()}?`}
          description={<p>“{tc.title}” and its results will be removed. It can’t be undone.</p>}
          footer={<>
            <button type="button" className="btn btn--secondary" autoFocus onClick={() => setDeleting(false)}>Cancel</button>
            <button type="button" className="btn btn--danger" onClick={() => { deleteCase(w.id, suite.id, tc.id, tc.title); onToast(`${label} deleted.`); }}>Delete</button>
          </>} />
      )}
    </article>
  );
}

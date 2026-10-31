import { useEffect, useId, useState, type ReactNode } from 'react';
import Dialog from '../../../../components/content/Dialog';
import { AlertIcon, CheckIcon, CloseIcon } from '../../../../components/content/icons';
import { useModules } from '../../../../data/content/store';
import { simulate } from '../../../../data/content/testplan';
import { useWorkflows } from '../../../../data/content/workflows';
import type { TestCase, Workflow } from '../../../../data/content/types';

/** What the system did for this case, and the scores it produced. Opens as a drawer. */
export default function RunDrawer({ w, tc, title, onClose }: { w: Workflow; tc: TestCase; title: string; onClose: () => void }) {
  const modules = useModules();
  const workflows = useWorkflows();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t); }, []);
  const run = simulate(w, tc, modules, workflows);
  const complete = tc.result.outcome !== 'not-tested';

  return (
    <Dialog open onClose={onClose} size="drawer" title="System behavior and score results"
      footer={<button type="button" className="btn btn--primary" onClick={onClose}>Close</button>}>
      <div className="run">
        <div>
          <p className="run__case">{title}</p>
          <p className="muted">{tc.title}</p>
        </div>

        <Section title="System behavior">
          {loading ? (
            <p className="run__loading" role="status"><span className="spinner" aria-hidden="true" /> Loading…</p>
          ) : (
            <div className="table-wrap">
              <table className="table table--compact">
                <caption className="visually-hidden">Steps presented to the candidate</caption>
                <thead><tr><th scope="col">Step</th><th scope="col">Type</th><th scope="col">Presented</th><th scope="col">Reason</th></tr></thead>
                <tbody>
                  {run.steps.map((s, i) => (
                    <tr key={i}>
                      <th scope="row">{s.name}</th>
                      <td className="muted">{s.kind}</td>
                      <td>{s.presented
                        ? <span className="run__yes"><CheckIcon /> Yes</span>
                        : <span className="run__no"><CloseIcon /> No</span>}</td>
                      <td>{s.reason || <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Score results">
          {!complete ? (
            <p className="tp-warn"><AlertIcon /> Run the case through its test link and record a result to see these scores.</p>
          ) : (
            <div className="run__scores">
              <div className="run__variation">
                <h4 className="detail__h3">Score variation selected</h4>
                <dl className="tcase__meta">
                  <div><dt>Name</dt><dd>{run.variation?.name ?? 'Applies to everyone'}</dd></div>
                  <div><dt>Default</dt><dd>{run.variation ? (run.variation.isDefault ? 'Yes' : 'No') : '—'}</dd></div>
                  <div><dt>Home system</dt><dd>{tc.country}</dd></div>
                  <div><dt>Job code</dt><dd className="mono">{tc.jobCode}</dd></div>
                  <div><dt>Job family</dt><dd>{tc.jobFamily}</dd></div>
                  <div><dt>Job level</dt><dd>{tc.jobLevel}</dd></div>
                  <div className="tcase__meta-wide"><dt>Job classification</dt><dd>{tc.jobClass}</dd></div>
                </dl>
              </div>
              <ScoreTable title="Workflow level scores" rows={run.workflowScores} />
              <ScoreTable title="Module level scores" rows={run.moduleScores} reuse />
              <ScoreTable title="Item level scores" rows={run.itemScores} />
            </div>
          )}
        </Section>
      </div>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(true);
  return (
    <section className="run__section" aria-labelledby={`${id}-h`}>
      <h3 className="run__h" id={`${id}-h`}>
        <button type="button" className="tcase__toggle" aria-expanded={open} aria-controls={`${id}-b`} onClick={() => setOpen(!open)}>
          <svg className={`tp-chev${open ? ' is-open' : ''}`} viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg> {title}
        </button>
      </h3>
      {open && <div id={`${id}-b`} className="run__body">{children}</div>}
    </section>
  );
}

function ScoreTable({ title, rows, reuse }: { title: string; rows: { label: string; value: string; reused?: boolean }[]; reuse?: boolean }) {
  return (
    <div className="table-wrap">
      <table className="table table--compact">
        <caption className="detections__cap">{title}</caption>
        <thead><tr><th scope="col">Label</th><th scope="col">Score</th>{reuse && <th scope="col">Score re-use</th>}</tr></thead>
        <tbody>
          {rows.length ? rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="mono">{r.label}</th>
              <td className="mono">{r.value}</td>
              {reuse && <td>{r.reused ? <span className="run__yes"><CheckIcon /> Re-used</span> : <span className="muted">—</span>}</td>}
            </tr>
          )) : <tr><td colSpan={reuse ? 3 : 2} className="muted">None</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

import { useState } from 'react';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { usePageTitle } from '../../components/usePageTitle';
import { JOBS, STAGES, inPipeline, jobById, type Job } from '../../data/hiring/jobs';
import { candidatesFor, type JobCandidate } from '../../data/hiring/applicants';
import { STATUS_TEXT, sessionById } from '../../data/proctor/sessions';
import { RiskBadge, sessionPath } from '../proctor/bits';

const BASE = '/hiring-system/jobs';
const day = (d: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${d}T12:00:00`));

export default function JobsPage() {
  return (
    <Routes>
      <Route index element={<JobsList />} />
      <Route path=":reqId" element={<JobRoute />} />
      <Route path="*" element={<Navigate to={BASE} replace />} />
    </Routes>
  );
}

function JobRoute() {
  const { reqId } = useParams();
  const j = jobById(reqId);
  return j ? <JobDetail j={j} /> : <Navigate to={BASE} replace />;
}

/** Status shown with a mark as well as words. */
function JobStatus({ s }: { s: Job['status'] }) {
  return <span className={`job-status job-status--${s.toLowerCase().replace(' ', '-')}`}><span aria-hidden="true" />{s}</span>;
}

function JobsList() {
  const h = usePageTitle('Jobs · Internal ATS');
  const open = JOBS.filter((j) => j.status === 'Open');
  return (
    <div className="ca-page">
      <header className="ca-head">
        <div>
          <h1 ref={h} tabIndex={-1} className="ca-title">Jobs</h1>
          <p className="ca-sub">Requisitions and where their candidates are in the pipeline. Choose a job to see it in detail.</p>
        </div>
      </header>
      <dl className="pr-stats job-stats">
        <div><dt>Open jobs</dt><dd>{open.length}</dd></div>
        <div><dt>Openings to fill</dt><dd>{open.reduce((s, j) => s + j.openings - j.pipeline.Hired, 0)}</dd></div>
        <div><dt>In pipelines</dt><dd>{open.reduce((s, j) => s + inPipeline(j), 0)}</dd></div>
        <div><dt>Offers out</dt><dd>{open.reduce((s, j) => s + j.pipeline.Offer, 0)}</dd></div>
      </dl>
      <div className="table-wrap">
        <table className="table job-table">
          <caption className="visually-hidden">Jobs, with the number of candidates at each pipeline stage</caption>
          <thead>
            <tr>
              <th scope="col">Job</th>
              <th scope="col">Status</th>
              <th scope="col">Recruiter</th>
              {STAGES.map((s) => <th key={s} scope="col" className="num">{s}</th>)}
              <th scope="col">Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {JOBS.map((j) => (
              <tr key={j.reqId}>
                <th scope="row">
                  <Link to={`${BASE}/${j.reqId}`} className="row-link">{j.title}</Link>
                  <span className="cell-sub"><span className="mono">{j.reqId}</span> · {j.location}</span>
                </th>
                <td><JobStatus s={j.status} />{j.closes && j.status === 'Open' && <span className="cell-sub">Closes {day(j.closes)}</span>}</td>
                <td>{j.recruiter}<span className="cell-sub">HM {j.hiringManager}</span></td>
                {STAGES.map((s) => <td key={s} className="num">{j.pipeline[s] || <span className="muted">0</span>}</td>)}
                <td><Funnel j={j} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Tiny funnel: one bar per stage, scaled to the job's applicants. Decorative; the numbers are in the table. */
function Funnel({ j }: { j: Job }) {
  const max = Math.max(1, j.pipeline.Applied);
  return (
    <span className="job-funnel" aria-hidden="true">
      {STAGES.map((s) => <span key={s} style={{ height: `${Math.max(j.pipeline[s] ? 8 : 0, (j.pipeline[s] / max) * 100)}%` }} />)}
    </span>
  );
}

/** Job detail: placeholder layout for now. */
function JobDetail({ j }: { j: Job }) {
  const h = usePageTitle(`${j.title} · Internal ATS`);
  return (
    <div className="ca-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to={BASE}>Jobs</Link></li>
          <li><span aria-current="page">{j.title}</span></li>
        </ol>
      </nav>
      <header className="ca-head">
        <div>
          <p className="page-kicker"><span className="mono">{j.reqId}</span> · {j.team}</p>
          <h1 ref={h} tabIndex={-1} className="ca-title">{j.title}</h1>
          <p className="ca-sub">{j.location} · {j.openings} opening{j.openings === 1 ? '' : 's'} · Opened {day(j.opened)}{j.closes ? ` · Closes ${day(j.closes)}` : ''}</p>
        </div>
        <JobStatus s={j.status} />
      </header>

      <ol className="job-pipe" aria-label="Pipeline">
        {STAGES.map((s) => (
          <li key={s}><span className="job-pipe__n">{j.pipeline[s]}</span><span className="job-pipe__label">{s}</span></li>
        ))}
      </ol>

      <div className="job-grid">
        <Candidates j={j} />
        <aside className="job-side" aria-label="About this job">
          <dl className="kv kv--stack">
            <div><dt>Recruiter</dt><dd>{j.recruiter}</dd></div>
            <div><dt>Hiring manager</dt><dd>{j.hiringManager}</dd></div>
            <div><dt>Level</dt><dd>{j.level}</dd></div>
            <div><dt>OA workflow</dt><dd>{j.workflow ?? <span className="muted">None</span>}</dd></div>
          </dl>
          <section className="job-ph" aria-labelledby="job-desc"><h2 id="job-desc" className="detail__h3">Job description</h2><p className="pr-placeholder">Placeholder</p></section>
          <section className="job-ph" aria-labelledby="job-int"><h2 id="job-int" className="detail__h3">Interview plan</h2><p className="pr-placeholder">Placeholder</p></section>
        </aside>
      </div>
    </div>
  );
}

const short = (d: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${d}T12:00:00`));

type Filter = 'All' | (typeof STAGES)[number];
const ORDER = [...STAGES].reverse();
const PAGE = 25;
const sessionFor = (c: JobCandidate) => sessionById(c.oa.sessionId);

/** Every candidate on the job, filterable by stage, with their OA status and a way into proctoring. */
function Candidates({ j }: { j: Job }) {
  const all = candidatesFor(j.reqId);
  const [filter, setFilter] = useState<Filter>('Assessment');
  const [page, setPage] = useState(0);
  const rows = (filter === 'All' ? [...all].sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage)) : all.filter((c) => c.stage === filter));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const taken = rows.filter((c) => c.oa.state === 'completed');
  const pending = rows.filter((c) => c.oa.state === 'invited' || c.oa.state === 'started');
  const pick = (f: Filter) => { setFilter(f); setPage(0); };
  return (
    <section className="job-cands" aria-labelledby="job-cands">
      <div className="section-head">
        <h2 id="job-cands" className="section-title">Candidates <span className="muted">{all.length}</span></h2>
      </div>
      <div className="job-filter" role="group" aria-label="Show candidates by stage">
        {(['All', ...STAGES] as Filter[]).map((f) => {
          const n = f === 'All' ? all.length : all.filter((c) => c.stage === f).length;
          return (
            <button key={f} type="button" className="job-filter__btn" aria-pressed={filter === f} onClick={() => pick(f)}>
              {f} <span className="job-filter__n">{n}</span>
            </button>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <div className="empty"><p className="empty__title">No one at this stage</p><p>Candidates appear here as they move through the pipeline.</p></div>
      ) : (
        <>
          <p className="job-cands__sum" aria-live="polite">
            {rows.length} {filter === 'All' ? 'candidates' : `in ${filter}`}
            {j.workflow && <> · OA taken by {taken.length} · pending for {pending.length}{rows.length - taken.length - pending.length > 0 ? ` · not sent to ${rows.length - taken.length - pending.length}` : ''}</>}
          </p>
          <div className="table-wrap">
            <table className="table job-ctable">
              <caption className="visually-hidden">{filter === 'All' ? 'All candidates' : `Candidates in ${filter}`} on {j.title}, with their online assessment status</caption>
              <thead>
                <tr><th scope="col">Candidate</th><th scope="col">Stage</th><th scope="col">Online assessment</th><th scope="col">Proctoring</th><th scope="col"><span className="visually-hidden">Details</span></th></tr>
              </thead>
              <tbody>
                {shown.map((c) => <CandidateRow key={c.id + c.name} c={c} j={j} />)}
              </tbody>
            </table>
          </div>
          {rows.length > PAGE && (
            <nav className="job-pager" aria-label="Candidate pages">
              <button type="button" className="btn btn--secondary btn--sm" aria-disabled={page === 0 || undefined} onClick={() => page > 0 && setPage(page - 1)}>Previous</button>
              <span>{page * PAGE + 1}–{Math.min(rows.length, page * PAGE + PAGE)} of {rows.length}</span>
              <button type="button" className="btn btn--secondary btn--sm" aria-disabled={(page + 1) * PAGE >= rows.length || undefined} onClick={() => (page + 1) * PAGE < rows.length && setPage(page + 1)}>Next</button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function CandidateRow({ c, j }: { c: JobCandidate; j: Job }) {
  const s = sessionFor(c);
  const open = s && (s.status === 'needs-review' || s.status === 'in-review');
  const o = c.oa;
  return (
    <tr>
      <th scope="row">{c.name}<span className="cell-sub mono">{c.id}</span></th>
      <td><span className="tal-stage">{c.stage}</span><span className="cell-sub">Applied {short(c.applied)}</span></td>
      <td>
        {o.state === 'completed' ? (
          <>
            <span className="oa-state">Taken</span>
            <span className={`oa-result ${o.pass ? 'is-pass' : 'is-fail'}`}><span aria-hidden="true">{o.pass ? '✓' : '✕'}</span>{o.pass ? 'Passed' : 'Not passed'}</span>
            <span className="cell-sub">{o.score}/{o.outOf} · {short(o.date!)}{o.pass && open ? ' · on hold until reviewed' : ''}</span>
          </>
        ) : o.state === 'started' ? <><span className="oa-state is-pending">Pending</span>In progress<span className="cell-sub">Started {short(o.date!)}</span></>
          : o.state === 'invited' ? <><span className="oa-state is-pending">Pending</span>Invited<span className="cell-sub">Sent {short(o.date!)}, not started</span></>
          : <span className="muted">{j.workflow ? 'Not sent' : 'No OA for this job'}</span>}
      </td>
      <td>
        {s ? (
          <>{open ? <RiskBadge risk={s.risk} /> : <span className="oa-proc">{STATUS_TEXT[s.status]}</span>}<span className="cell-sub">{open ? STATUS_TEXT[s.status] : `${s.events.length} flag${s.events.length === 1 ? '' : 's'}`}</span></>
        ) : o.state === 'completed' ? <span className="muted">Not proctored</span> : <span className="muted">—</span>}
      </td>
      <td>
        {s && (
          <Link to={sessionPath(s.id)} state={{ from: { to: `${BASE}/${j.reqId}`, label: `${j.title} in Internal ATS` } }} className="btn btn--secondary btn--sm">
            Details<span className="visually-hidden"> of {c.name}’s proctored session</span>
          </Link>
        )}
      </td>
    </tr>
  );
}

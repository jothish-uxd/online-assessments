import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { usePageTitle } from '../../components/usePageTitle';
import { JOBS, STAGES, inPipeline, jobById, type Job } from '../../data/hiring/jobs';

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
        <section className="job-ph" aria-labelledby="job-cands"><h2 id="job-cands" className="section-title">Candidates</h2><p className="pr-placeholder">Placeholder · candidates by stage, with move, reject and message actions</p></section>
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

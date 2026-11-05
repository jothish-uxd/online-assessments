import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom';
import { BrowserFrame, useFrameHistory } from '@jothish-uxd/enterprise-library';
import AppBarEnd from '../../components/AppBarEnd';
import { usePageTitle } from '../../components/usePageTitle';
import { appById } from '../../data/apps';
import { resetStore } from '../../data/store';
import { JOBS, MATCH_TEXT, SESSIONS, STATUS_TEXT, byNewest, byRisk, sessionById, type Session } from '../../data/proctor/sessions';
import SessionPage from './SessionPage';
import { BASE, RiskBadge, sessionPath } from './bits';
import '../../styles/content.css';
import '../../styles/workflow.css';
import '../../styles/proctor.css';


const TABS = [
  { path: 'high-risk', label: 'High risk' },
  { path: 'closing-jobs', label: 'Closing jobs' },
  { path: 'recent', label: 'Recent' },
] as const;

/** Proctoring review: queues of sessions to check, and each session's evidence. */
export default function ProctorApp() {
  const app = appById('proctoring');
  const { pathname, nav } = useFrameHistory();
  const main = useRef<HTMLElement>(null);
  const [said, setSaid] = useState('');
  useEffect(() => { main.current?.scrollTo({ top: 0 }); }, [pathname]);
  const inSession = pathname.includes('/sessions/');

  return (
    <BrowserFrame.Stage>
      <BrowserFrame host={app.host} path={pathname.replace(BASE, '') || '/'} nav={nav}
        end={<AppBarEnd what="proctoring report" to={pathname} onSoon={setSaid}
          description="Puts back the sample sessions and clears review decisions made in this browser."
          onReset={() => resetStore((k) => k.startsWith('review:'))} />}>
        <div className="ca">
          <div className="ca-bar">
            <span className="ca-name">Proctoring review</span>
            <nav className="ca-tabs" aria-label="Proctoring review">
              {TABS.map((t) => <NavLink key={t.path} to={`${BASE}/${t.path}`} className="ca-tab">{t.label}</NavLink>)}
              {inSession && <span className="ca-tab active" aria-current="page">Session</span>}
            </nav>
          </div>
          <main id="main" className="ca-main" ref={main} data-scroll>
            <Routes>
              <Route index element={<Navigate to="high-risk" replace />} />
              <Route path="high-risk" element={<HighRisk />} />
              <Route path="closing-jobs" element={<ClosingJobs />} />
              <Route path="recent" element={<Recent />} />
              <Route path="sessions/:sessionId" element={<SessionRoute />} />
              <Route path="*" element={<Navigate to="high-risk" replace />} />
            </Routes>
          </main>
          <span className="visually-hidden" role="status">{said}</span>
        </div>
      </BrowserFrame>
    </BrowserFrame.Stage>
  );
}

function SessionRoute() {
  const { sessionId } = useParams();
  const s = sessionById(sessionId);
  return s ? <SessionPage key={s.id} s={s} /> : <Navigate to={`${BASE}/high-risk`} replace />;
}

/* ---------- Shared bits ---------- */


const fmtDate = (iso: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

function SessionTable({ rows, caption, hideJob }: { rows: Session[]; caption: string; hideJob?: boolean }) {
  if (!rows.length) return <div className="empty"><p className="empty__title">Nothing to review</p><p>New sessions land here as candidates submit.</p></div>;
  return (
    <div className="table-wrap">
      <table className="table pr-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Candidate</th>
            {!hideJob && <th scope="col">Job</th>}
            <th scope="col">Risk</th>
            <th scope="col" className="num">Flags</th>
            <th scope="col">Identity</th>
            <th scope="col">Submitted</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <th scope="row">
                <Link to={sessionPath(s.id)} className="row-link">{s.candidate}</Link>
                <span className="cell-sub mono">{s.candidateId}</span>
              </th>
              {!hideJob && <td>{s.job}<span className="cell-sub">{s.reqId}</span></td>}
              <td><RiskBadge risk={s.risk} /></td>
              <td className="num">{s.events.length}</td>
              <td>{MATCH_TEXT[s.idMatch]}</td>
              <td>{fmtDate(s.submitted)}</td>
              <td>{STATUS_TEXT[s.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Page({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const h = usePageTitle(`${title} · Proctoring review`);
  return (
    <div className="ca-page">
      <header className="ca-head">
        <div>
          <h1 ref={h} tabIndex={-1} className="ca-title">{title}</h1>
          <p className="ca-sub">{sub}</p>
        </div>
      </header>
      {children}
    </div>
  );
}

/* ---------- Queues ---------- */

function HighRisk() {
  const open = SESSIONS.filter((s) => s.status === 'needs-review' || s.status === 'in-review');
  const risky = open.filter((s) => s.risk !== 'low').sort(byRisk);
  return (
    <Page title="High risk" sub="Sessions the AI flagged most strongly, waiting for a person to decide. Highest risk first.">
      <dl className="pr-stats">
        <div><dt>Waiting for review</dt><dd>{open.length}</dd></div>
        <div><dt>High risk</dt><dd>{open.filter((s) => s.risk === 'high').length}</dd></div>
        <div><dt>Identity doesn’t match</dt><dd>{open.filter((s) => s.idMatch !== 'match').length}</dd></div>
        <div><dt>Median time to review</dt><dd className="pr-placeholder">Placeholder</dd></div>
      </dl>
      <SessionTable rows={risky} caption="High and medium risk sessions waiting for review" />
    </Page>
  );
}

function ClosingJobs() {
  const jobs = [...JOBS].sort((a, b) => a.closes.localeCompare(b.closes));
  const days = (d: string) => Math.max(0, Math.round((new Date(`${d}T23:59:00`).getTime() - Date.now()) / 86_400_000));
  return (
    <Page title="Closing jobs" sub="Jobs closing soon. Clear their flagged sessions first, so recruiters can make decisions on time.">
      {jobs.map((j) => {
        const rows = SESSIONS.filter((s) => s.reqId === j.reqId && (s.status === 'needs-review' || s.status === 'in-review')).sort(byRisk);
        const d = days(j.closes);
        return (
          <section key={j.reqId} className="pr-job" aria-labelledby={`job-${j.reqId}`}>
            <div className="pr-job__head">
              <h2 id={`job-${j.reqId}`} className="section-title">{j.title}</h2>
              <span className="pr-job__meta"><span className="mono">{j.reqId}</span> · Recruiter {j.recruiter}</span>
              <span className={`pr-due${d <= 2 ? ' is-soon' : ''}`}>Closes {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${j.closes}T12:00:00`))} · {d === 0 ? 'today' : `in ${d} day${d === 1 ? '' : 's'}`}</span>
              <span className="pr-job__count">{rows.length} to review</span>
            </div>
            <SessionTable rows={rows} hideJob caption={`Sessions to review for ${j.title}`} />
          </section>
        );
      })}
    </Page>
  );
}

function Recent() {
  return (
    <Page title="Recent" sub="Every submitted assessment, newest first, whatever its risk.">
      <SessionTable rows={[...SESSIONS].sort(byNewest)} caption="Recently submitted sessions" />
    </Page>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { BrowserFrame, useFrameHistory } from '@jothish-uxd/enterprise-library';
import AppBarEnd from '../../components/AppBarEnd';
import { usePageTitle } from '../../components/usePageTitle';
import { appById } from '../../data/apps';
import { resetStore } from '../../data/store';
import TalentPage from './TalentPage';
import JobsPage from './JobsPage';
import '../../styles/proctor.css';
import '../../styles/hiring.css';
import '../../styles/content.css';
import '../../styles/workflow.css';

const BASE = '/hiring-system';
const TABS = [
  { path: 'jobs', label: 'Jobs', about: 'Open roles and requisitions.' },
  { path: 'talent', label: 'Talent', about: 'People you’ve sourced or who’ve shown interest, before they apply.' },
  { path: 'applicants', label: 'Applicants', about: 'Everyone who has applied, by job and stage.' },
  { path: 'interviews', label: 'Interviews', about: 'Scheduled interviews, panels and feedback.' },
] as const;

/** Internal ATS: the hiring system recruiters use. */
export default function HiringApp() {
  const app = appById('hiring');
  const { pathname, nav } = useFrameHistory();
  const main = useRef<HTMLElement>(null);
  const [said, setSaid] = useState('');
  useEffect(() => { main.current?.scrollTo({ top: 0 }); }, [pathname]);

  return (
    <BrowserFrame.Stage>
      <BrowserFrame
        host={app.host}
        path={pathname.replace(BASE, '') || '/'}
        nav={nav}
        end={<AppBarEnd what="hiring system" to={pathname} onSoon={setSaid}
          description="Puts back the sample jobs, talent, applicants and interviews, and clears changes made in this browser."
          onReset={() => resetStore((k) => k.startsWith('hiring:'))} />}
      >
        <div className="ca">
          <div className="ca-bar">
            <span className="ca-name">Internal ATS</span>
            <nav className="ca-tabs" aria-label="Internal ATS">
              {TABS.map((t) => <NavLink key={t.path} to={`${BASE}/${t.path}`} className="ca-tab">{t.label}</NavLink>)}
            </nav>
          </div>
          <main id="main" className="ca-main" ref={main} data-scroll>
            <Routes>
              <Route index element={<Navigate to="jobs" replace />} />
              <Route path="talent/*" element={<TalentPage />} />
              <Route path="jobs/*" element={<JobsPage />} />
              {TABS.filter((t) => t.path !== 'talent' && t.path !== 'jobs').map((t) => <Route key={t.path} path={`${t.path}/*`} element={<Empty title={t.label} about={t.about} />} />)}
              <Route path="*" element={<Navigate to="jobs" replace />} />
            </Routes>
          </main>
          <span className="visually-hidden" role="status">{said}</span>
        </div>
      </BrowserFrame>
    </BrowserFrame.Stage>
  );
}

function Empty({ title, about }: { title: string; about: string }) {
  const h = usePageTitle(`${title} · Internal ATS`);
  return (
    <div className="ca-page">
      <header className="ca-head">
        <div>
          <h1 ref={h} tabIndex={-1} className="ca-title">{title}</h1>
          <p className="ca-sub">{about}</p>
        </div>
      </header>
      <div className="empty hire-empty">
        <p className="empty__title">Nothing here yet</p>
        <p>This page is still being designed.</p>
      </div>
    </div>
  );
}

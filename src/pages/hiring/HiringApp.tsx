import { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import BrowserFrame, { useFrameHistory } from '../../components/BrowserFrame';
import ResetButton from '../../components/ResetButton';
import Menu from '../../components/content/Menu';
import { usePageTitle } from '../../components/usePageTitle';
import { appById } from '../../data/apps';
import { PEOPLE, person, setMe, useMe } from '../../data/content/people';
import { resetStore } from '../../data/store';
import '../../styles/content.css';
import '../../styles/workflow.css';

const BASE = '/hiring-system';
const TABS = [
  { path: 'jobs', label: 'Jobs', about: 'Open roles and requisitions.' },
  { path: 'talent', label: 'Talent', about: 'People you’ve sourced or who’ve shown interest, before they apply.' },
  { path: 'applicants', label: 'Applicants', about: 'Everyone who has applied, by job and stage.' },
  { path: 'interviews', label: 'Interviews', about: 'Scheduled interviews, panels and feedback.' },
] as const;

/** Internal ATS: the hiring system recruiters use. Tabs are empty for now. */
export default function HiringApp() {
  const app = appById('hiring');
  const { pathname, nav } = useFrameHistory();
  const main = useRef<HTMLElement>(null);
  const me = person(useMe());
  const [said, setSaid] = useState('');
  useEffect(() => { main.current?.scrollTo({ top: 0 }); }, [pathname]);

  const soon = (what: string) => () => setSaid(`${what} isn’t available in this prototype yet.`);

  return (
    <BrowserFrame.Stage>
      <BrowserFrame
        host={app.host}
        path={pathname.replace(BASE, '') || '/'}
        nav={nav}
        end={
          <>
            <ResetButton
              what="hiring system"
              description="Puts back the sample jobs, talent, applicants and interviews, and clears changes made in this browser."
              done="Hiring system reset."
              to={pathname}
              onReset={() => resetStore((k) => k.startsWith('hiring:'))}
            />
            <Menu label="Help" className="menu--avatar hire-help" items={[
              { label: 'Help center', onSelect: soon('The help center') },
              { label: 'What’s new', onSelect: soon('What’s new') },
              { label: 'Keyboard shortcuts', onSelect: soon('Keyboard shortcuts') },
              { label: 'Contact your ATS admin', divider: true, onSelect: soon('Contacting your ATS admin') },
            ]}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M6.2 6.2a1.9 1.9 0 0 1 3.6.8c0 1.3-1.8 1.6-1.8 2.7M8 11.6v.1" /></svg>
            </Menu>
            <Menu label={`Signed in as ${me.name}, ${me.role}. Switch person`} className="menu--avatar" items={
              Object.values(PEOPLE).filter((p) => p.id !== me.id).map((p) => ({ label: `Switch to ${p.name} · ${p.role}`, onSelect: () => setMe(p.id) }))
            }>
              <span className="avatar avatar--sm" aria-hidden="true">{me.initials}</span>
            </Menu>
          </>
        }
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
              {TABS.map((t) => <Route key={t.path} path={`${t.path}/*`} element={<Empty title={t.label} about={t.about} />} />)}
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

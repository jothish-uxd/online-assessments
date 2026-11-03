import { Link, Navigate, Route, Routes } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import { usePageTitle } from './components/usePageTitle';
import OverviewPage from './pages/OverviewPage';
import ComingSoonApp from './pages/ComingSoonApp';
import ContentApp from './pages/content/ContentApp';
import CandidateApp from './pages/candidate/CandidateApp';
import HiringApp from './pages/hiring/HiringApp';
import ProctorApp from './pages/proctor/ProctorApp';
import { APPS } from './data/apps';

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <AppHeader />
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/assessment-content/*" element={<ContentApp />} />
        <Route path="/candidate-website/*" element={<CandidateApp />} />
        <Route path="/hiring-system/*" element={<HiringApp />} />
        <Route path="/proctoring-report/*" element={<ProctorApp />} />
        {APPS.filter((a) => a.status === 'coming-soon').map((a) => (
          // key per app so each frame starts its own Back / Forward history
          <Route key={a.id} path={`${a.path}/*`} element={<ComingSoonApp key={a.id} id={a.id} />} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function NotFound() {
  const h = usePageTitle('Page not found');
  return (
    <main id="main" className="main main--solo">
      <h1 ref={h} tabIndex={-1} className="page-title">This page doesn’t exist</h1>
      <p className="page-lede">Go back to the <Link to="/overview">overview</Link>.</p>
    </main>
  );
}

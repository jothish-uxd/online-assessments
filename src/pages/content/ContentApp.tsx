import { useEffect, useRef } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import BrowserFrame, { useFrameHistory } from '../../components/BrowserFrame';
import ResetButton from '../../components/ResetButton';
import { appById } from '../../data/apps';
import { PEOPLE, person, setMe, useMe } from '../../data/content/people';
import Menu from '../../components/content/Menu';
import { resetContent } from '../../data/content/store';
import AssetsPage from './AssetsPage';
import ModulesPage from './ModulesPage';
import ModulePage from './ModulePage';
import WorkflowsPage from './WorkflowsPage';
import WorkflowPage from './workflow/WorkflowPage';
import '../../styles/workflow.css';
import { BASE, contentRoutes } from './routes';
import '../../styles/content.css';
import '../../styles/scores.css';
import '../../styles/misbehavior.css';
import '../../styles/testplan.css';


/** Assessment content: one app in its own frame, sectioned by horizontal tabs. */
export default function ContentApp() {
  const app = appById('content');
  const { pathname, nav } = useFrameHistory();
  const mainRef = useRef<HTMLElement>(null);
  // Scroll to the top when the page changes, but not when an asset opens beside the library.
  const page = pathname.replace(/\/assets\/.+$/, '/assets');
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [page]);
  const me = person(useMe());

  return (
    <BrowserFrame.Stage>
      <BrowserFrame
        host={app.host}
        path={pathname.replace(BASE, '') || '/'}
        nav={nav}
        end={
          <>
            <ResetButton
              what="content"
              description="Puts back the sample assets and modules, and deletes files uploaded in this browser."
              done="Content reset."
              to={contentRoutes.assets()}
              onReset={resetContent}
            />
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
            <span className="ca-name">Assessment content</span>
            <nav className="ca-tabs" aria-label="Assessment content">
              <NavLink to={contentRoutes.assets()} className="ca-tab">Assets</NavLink>
              <NavLink to={contentRoutes.modules()} className="ca-tab">Modules</NavLink>
              <NavLink to={contentRoutes.workflows()} className="ca-tab">OA workflow</NavLink>
            </nav>
          </div>
          <main id="main" className="ca-main" ref={mainRef} data-scroll>
            <Routes>
              <Route index element={<Navigate to="assets" replace />} />
              <Route path="assets" element={<AssetsPage />} />
              <Route path="assets/:assetId" element={<AssetsPage />} />
              <Route path="modules" element={<ModulesPage />} />
              <Route path="modules/:moduleId" element={<ModulePage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="workflows/:workflowId" element={<WorkflowPage />} />
              <Route path="workflows/:workflowId/:tab" element={<WorkflowPage />} />
              <Route path="assessments" element={<Navigate to="../workflows" replace />} />
              <Route path="*" element={<Navigate to="assets" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserFrame>
    </BrowserFrame.Stage>
  );
}

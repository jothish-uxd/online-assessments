import { Link } from 'react-router-dom';
import BrowserFrame, { useFrameHistory } from '../components/BrowserFrame';
import { usePageTitle } from '../components/usePageTitle';
import { appById, type AppId } from '../data/apps';

/**
 * Placeholder for an app that isn't built yet. It still opens in a browser
 * frame under the app's own host, with a ghost of the app behind the note,
 * so each tab reads as a separate piece of software.
 */
export default function ComingSoonApp({ id }: { id: AppId }) {
  const app = appById(id);
  const h = usePageTitle(app.name);
  const { pathname, nav, scrollRef } = useFrameHistory();

  return (
    <BrowserFrame.Stage>
      <BrowserFrame host={app.host} path={pathname.replace(app.path, '') || '/'} nav={nav}>
        <div className="app-body">
          <div className="sidebar" aria-hidden="true">
            <div className="ghost ghost--nav"><span /><span /><span /><span /><span /><span /><span /></div>
          </div>
          <main id="main" className="app-main" ref={scrollRef}>
            <div className="soon">
              <div className="ghost ghost--bar" aria-hidden="true"><span /><span /></div>
              <div className="soon__body">
                <span className="soon__mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
                </span>
                <p className="page-kicker">Coming soon · {app.audience}</p>
                <h1 ref={h} tabIndex={-1} className="page-title">{app.name}</h1>
                <p className="page-lede">{app.summary} This app is being designed and will open here.</p>
                <div className="soon__actions">
                  <Link to="/overview" className="btn btn--secondary">Back to the overview</Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </BrowserFrame>
    </BrowserFrame.Stage>
  );
}

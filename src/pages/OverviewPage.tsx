import { Link } from 'react-router-dom';
import { usePageTitle } from '../components/usePageTitle';
import { APPS } from '../data/apps';

/**
 * Overview — placeholder copy. The headline, lede and the "about" section
 * are waiting to be rewritten from the product context.
 */
export default function OverviewPage() {
  const h = usePageTitle('Overview');

  return (
    <main id="main" className="main main--solo">
      <section className="hero" aria-labelledby="ov-title">
        <h1 ref={h} tabIndex={-1} id="ov-title" className="page-title">
          Online assessments, from first item to final report.
        </h1>
        <p className="page-lede">
          Placeholder. A short summary of Online Assessments goes here: who it is for, what problem
          it solves in hiring, and how its four apps work together.
        </p>
        <div className="hero-actions">
          {/* A button, not a #hash link: the hash belongs to the router. */}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              const target = document.getElementById('apps');
              target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
              target?.focus({ preventScroll: true });
            }}
          >
            See the apps
          </button>
        </div>
      </section>

      <div className="doc-block" style={{ marginTop: 96 }}>
        <h2 className="doc-h2" id="apps" tabIndex={-1}>Four apps, one assessment</h2>
        <p className="doc-p">
          Each app is its own product with its own users. They open in their own browser windows here,
          as they would in real life.
        </p>
        <ul className="apps">
          {APPS.map((a) => (
            <li key={a.id}>
              <Link to={a.path} className="app-card">
                <span className="app-card__host">{a.host}</span>
                <strong className="app-card__name">{a.name}</strong>
                <span className="app-card__desc">{a.summary}</span>
                <span className="tag">{a.status === 'in-progress' ? 'In progress' : 'Coming soon'}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="doc-block">
        <h2 className="doc-h2">About this product</h2>
        <p className="draft-note">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5 13.5 5.5 6 13H3v-3z" /></svg>
          <span>Placeholder. The overview copy will be written from the product context: the problem, the people who use each app, and how an assessment moves from content to candidate to report.</span>
        </p>
      </div>
    </main>
  );
}

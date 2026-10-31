import { Link } from 'react-router-dom';
import { usePageTitle } from '../../components/usePageTitle';
import { useModules } from '../../data/content/store';
import { contentRoutes } from './routes';

/** Placeholder: modules are stitched into assessments here. Designed next. */
export default function AssessmentsPage() {
  const h = usePageTitle('Assessments');
  const published = useModules().filter((m) => m.status === 'published').length;
  return (
    <div className="ca-page">
      <header className="ca-head">
        <div>
          <h1 ref={h} tabIndex={-1} className="ca-title">Assessments</h1>
          <p className="ca-sub">Where modules are put in order, scored and tested to make an assessment.</p>
        </div>
      </header>
      <div className="soon soon--inline">
        <div className="soon__body">
          <span className="soon__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
          </span>
          <p className="page-kicker">Coming soon</p>
          <h2 className="page-title">Assessment builder</h2>
          <p className="page-lede">
            {published} published module{published === 1 ? ' is' : 's are'} ready to use. <Link to={contentRoutes.modules()}>See modules</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

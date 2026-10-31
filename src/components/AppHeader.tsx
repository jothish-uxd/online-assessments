import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo';
import { useTheme } from './useTheme';
import { APPS } from '../data/apps';

export default function AppHeader() {
  const { theme, toggle } = useTheme();

  return (
    <header className="site-header">
      <Link to="/overview" className="wordmark-link" aria-label="Online Assessments overview"><Logo /></Link>
      <span className="header-sep" aria-hidden="true">/</span>
      <span className="badge">v0.1 preview</span>

      <nav className="header-tabs" aria-label="Primary">
        <NavLink to="/overview" className="header-tab">Overview</NavLink>
        {APPS.map((a) => (
          <NavLink key={a.id} to={a.path} className="header-tab">{a.name}</NavLink>
        ))}
      </nav>

      <div className="header-actions">
        <button type="button" className="icon-button" aria-pressed={theme === 'dark'} onClick={toggle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" /></svg>
          <span className="visually-hidden">Dark theme</span>
        </button>
      </div>
    </header>
  );
}

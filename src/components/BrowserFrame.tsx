import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import '../styles/browser-frame.css';

/**
 * BrowserFrame — a plain browser window that fills the space it is given.
 *
 * Use it to present an app inside a page (a product demo, a prototype, a
 * case study) so the app reads as "the product" and the page around it as
 * "the story". Everything inside stays inside: the body scrolls on its own,
 * and Back / Forward only move through pages visited in the frame.
 *
 * Design-system rules
 * - Fill the viewport: wrap it in <BrowserFrame.Stage> so the frame takes the
 *   height under the site header and the page itself never scrolls.
 * - Keep the bar quiet: dots are decoration (aria-hidden); controls are real
 *   buttons with names; the address is read-only text.
 * - One menu button, inside the bar, for small screens. The panel it opens
 *   must render inside the frame body.
 */

export interface FrameNav {
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

export interface FrameMenu {
  open: boolean;
  onToggle: () => void;
  /** id of the panel the button opens */
  controls: string;
}

export interface BrowserFrameProps {
  /** Path shown after the host in the address bar */
  path: string;
  host?: string;
  nav?: FrameNav;
  menu?: FrameMenu;
  /** Right end of the bar, e.g. a signed-in avatar */
  end?: ReactNode;
  children: ReactNode;
}

export default function BrowserFrame({ path, host = 'onlineassessments.app', nav, menu, end, children }: BrowserFrameProps) {
  return (
    <div className="bframe">
      <div className="bframe__bar">
        <span className="bframe__dots" aria-hidden="true"><span /><span /><span /></span>
        {(nav || menu) && (
          <div className="bframe__nav">
            {nav && (
              <>
                <button type="button" className="bframe__btn" onClick={nav.onBack} disabled={!nav.canBack} aria-label="Back">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
                </button>
                <button type="button" className="bframe__btn" onClick={nav.onForward} disabled={!nav.canForward} aria-label="Forward">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
                </button>
              </>
            )}
            {menu && (
              <button
                type="button"
                className="bframe__btn bframe__menu"
                aria-expanded={menu.open}
                aria-controls={menu.controls}
                onClick={menu.onToggle}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></svg>
                <span className="visually-hidden">Menu</span>
              </button>
            )}
          </div>
        )}
        <div className="bframe__address" aria-label="Current address">
          <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" /></svg>
          <span className="bframe__host">{host}</span>
          <span className="bframe__path">{path}</span>
        </div>
        {end && <div className="bframe__end">{end}</div>}
      </div>
      <div className="bframe__body">{children}</div>
    </div>
  );
}

/** Wrapper that sizes the frame to the viewport under the site header. */
BrowserFrame.Stage = function Stage({ children }: { children: ReactNode }) {
  return <div className="bframe-stage">{children}</div>;
};

/**
 * Frame-local history for apps routed with react-router.
 * Back never leaves the frame; it only revisits pages opened inside it.
 * Also closes the small-screen menu and scrolls the body to the top on navigation.
 */
export function useFrameHistory() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  const [hist, setHist] = useState({ entries: [pathname], index: 0 });
  const travelling = useRef(false);

  useEffect(() => {
    setMenuOpen(false);
    scrollRef.current?.scrollTo({ top: 0 });
    if (travelling.current) { travelling.current = false; return; }
    setHist((h) => {
      if (h.entries[h.index] === pathname) return h;
      // A redirect replaces the current page rather than adding one, so Back doesn't bounce.
      if (navType === 'REPLACE') {
        const entries = [...h.entries];
        entries[h.index] = pathname;
        return { entries, index: h.index };
      }
      const entries = [...h.entries.slice(0, h.index + 1), pathname];
      return { entries, index: entries.length - 1 };
    });
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback((delta: -1 | 1) => {
    const index = hist.index + delta;
    if (index < 0 || index >= hist.entries.length) return;
    travelling.current = true;
    setHist({ ...hist, index });
    navigate(hist.entries[index]);
  }, [hist, navigate]);

  const nav: FrameNav = {
    canBack: hist.index > 0,
    canForward: hist.index < hist.entries.length - 1,
    onBack: () => go(-1),
    onForward: () => go(1),
  };

  return { pathname, nav, menuOpen, setMenuOpen, scrollRef };
}

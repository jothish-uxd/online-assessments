import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'oa-theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function initial(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* storage blocked */ }
  return media().matches ? 'dark' : 'light';
}

/** Same behavior as a11y-charts: follows the OS until the person picks a theme. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch { /* storage blocked */ }
      return next;
    });
  }, []);
  return { theme, toggle };
}

import { useEffect, useRef } from 'react';

/** Sets the document title and moves focus to the page heading on route change,
    so screen reader users hear where they landed. */
export function usePageTitle(title: string) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} | Online Assessments`;
    headingRef.current?.focus({ preventScroll: true });
  }, [title]);
  return headingRef;
}

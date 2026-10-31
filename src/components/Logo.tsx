/** Online Assessments mark: three answer rows, two ticked, one still open.
    Monochrome, inherits ink. */
export default function Logo() {
  return (
    <span className="wordmark">
      <svg className="wordmark-glyph" viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="currentColor">
        <rect x="1" y="2.5" width="4" height="4" rx="1" />
        <rect x="7" y="3.25" width="12" height="2.5" rx="1" />
        <rect x="1" y="8" width="4" height="4" rx="1" />
        <rect x="7" y="8.75" width="9" height="2.5" rx="1" />
        <rect x="1.6" y="14.1" width="2.8" height="2.8" rx=".6" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".45" />
        <rect x="7" y="14.25" width="10.5" height="2.5" rx="1" opacity=".45" />
      </svg>
      Online Assessments
    </span>
  );
}

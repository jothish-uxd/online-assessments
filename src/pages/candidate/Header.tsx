import { useEffect, useId, useRef, useState } from 'react';
import Logo from '../../components/Logo';
import Menu from '../../components/content/Menu';
import Dialog from '../../components/content/Dialog';
import { ASSESSMENT } from '../../data/candidate/assessment';
import { SESSION_ID, logEvent, submit, useSession } from '../../data/candidate/session';

/** Ticks once a second while mounted. */
export function useNow(on = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  return now;
}

export const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(r).padStart(2, '0')}`;
};
export const spoken = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60), r = s % 60;
  return [m && `${m} minute${m === 1 ? '' : 's'}`, r && `${r} second${r === 1 ? '' : 's'}`].filter(Boolean).join(' ') || '0 seconds';
};

export default function Header({ onSignOut }: { onSignOut: () => void }) {
  const [s] = useSession();
  const [help, setHelp] = useState(false);
  const inExam = s.phase === 'exam' && !!s.deadline;
  return (
    <header className="cand-head">
      <div className="cand-head__brand">
        <Logo />
        {s.phase !== 'welcome' && s.phase !== 'signed-out' && <span className="cand-head__title"><span aria-hidden="true">/</span> {ASSESSMENT.title}</span>}
      </div>
      <div className="cand-head__end">
        {inExam && <AssessmentTimer deadline={s.deadline!} />}
        <button type="button" className="cand-help-btn" aria-haspopup="dialog" onClick={() => setHelp(true)}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M6.2 6.2a1.9 1.9 0 0 1 3.6.8c0 1.3-1.8 1.6-1.8 2.7M8 11.6v.1" /></svg>
          Help
        </button>
        {s.phase !== 'signed-out' && (
          <Menu label={`${ASSESSMENT.candidate.name}, account`} className="menu--avatar cand-account" items={[
            { label: `Signed in as ${ASSESSMENT.candidate.email}`, disabled: true, onSelect: () => {} },
            { label: 'Sign out', divider: true, onSelect: onSignOut },
          ]}>
            <span className="avatar avatar--sm" aria-hidden="true">{ASSESSMENT.candidate.initials}</span>
            <span className="cand-account__name" aria-hidden="true">{ASSESSMENT.candidate.name}</span>
          </Menu>
        )}
      </div>
      <HelpDialog open={help} onClose={() => setHelp(false)} />
    </header>
  );
}

/** Time left for the whole assessment. Can be hidden; still warns at 5 and 1 minutes. */
function AssessmentTimer({ deadline }: { deadline: number }) {
  const now = useNow();
  const left = deadline - now;
  const [hidden, setHidden] = useState(false);
  const [said, setSaid] = useState('');
  const warned = useRef<Set<number>>(new Set());

  useEffect(() => {
    for (const m of [5, 1]) {
      if (left <= m * 60_000 && left > 0 && !warned.current.has(m)) {
        warned.current.add(m);
        setSaid(`${m} minute${m === 1 ? '' : 's'} left for the whole assessment.`);
      }
    }
    if (left <= 0) submit('time');
  }, [left]);

  const low = left <= 5 * 60_000;
  return (
    <div className={`cand-timer${low ? ' is-low' : ''}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="9" r="5.5" /><path d="M8 6.5V9l1.6 1.2M6.5 2h3" /></svg>
      {hidden
        ? <span className="cand-timer__label">Time hidden</span>
        : <span className="cand-timer__label"><span className="visually-hidden">Time left for the assessment: {spoken(left)}</span><span aria-hidden="true">{clock(left)}</span><span className="cand-timer__of" aria-hidden="true"> left</span></span>}
      <button type="button" className="link-button cand-timer__toggle" aria-pressed={hidden} onClick={() => setHidden(!hidden)}>
        {hidden ? 'Show' : 'Hide'}<span className="visually-hidden"> time left</span>
      </button>
      <span className="visually-hidden" role="status">{said}</span>
    </div>
  );
}

const FIXES: { q: string; a: string[] }[] = [
  { q: 'My camera isn’t working', a: [
    'Close other apps that use the camera, like video calls.',
    'In your browser’s address bar, choose the camera icon and allow access for this site.',
    'Unplug and reconnect an external camera, then reload this page. Your answers are saved.',
  ] },
  { q: 'I lost my connection or the page reloaded', a: [
    'Your answers save as you go. Reload the page and sign back in to carry on where you left off.',
    'The assessment clock keeps running while you’re away, so come back as soon as you can.',
    'If you lost more than a few minutes, report a technical problem below. Confirmed problems can get time back.',
  ] },
  { q: 'How do the timers work?', a: [
    'The clock at the top is for the whole assessment. You can hide it; you’ll still get a warning at 5 minutes and 1 minute.',
    'Some questions also have their own timer. When it runs out, your answer so far is saved and the next question opens.',
    'Once you move on from a question, you can’t go back to it.',
  ] },
  { q: 'Accessibility and accommodations', a: [
    'Charts have a data table, and audio has a transcript.',
    'You can use a screen reader, zoom, and keyboard only.',
    'If you need extra time or another format, ask your recruiting partner before you start. Approved extra time is added to your clock.',
  ] },
  { q: 'Which browsers and devices work?', a: [
    'A laptop or desktop with a camera, using a current version of Chrome, Edge, Firefox or Safari.',
    'Phones and tablets aren’t supported for proctored assessments.',
  ] },
];

/**
 * Help that scales: self-serve fixes first, then the person who already owns
 * this candidate (their recruiting partner), with a session ID to quote.
 * No shared inbox: at millions of candidates a year, it would never be answered.
 */
function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const id = useId();
  const [reported, setReported] = useState('');
  const [what, setWhat] = useState('');
  return (
    <Dialog open={open} onClose={onClose} size="drawer" title="Help"
      description={<p>Quick fixes for common problems. We can’t help with the questions themselves.</p>}>
      <div className="cand-helpbody">
        <section aria-labelledby={`${id}-fix`}>
          <h3 id={`${id}-fix`} className="cand-h3">Quick fixes</h3>
          {FIXES.map((f) => (
            <details key={f.q} className="cand-fix">
              <summary>{f.q}</summary>
              <ul>{f.a.map((t) => <li key={t}>{t}</li>)}</ul>
            </details>
          ))}
        </section>

        <section aria-labelledby={`${id}-who`} className="cand-contact">
          <h3 id={`${id}-who`} className="cand-h3">Still stuck?</h3>
          <p>Contact your recruiting partner, <strong>{ASSESSMENT.recruiter.name}</strong> ({ASSESSMENT.recruiter.team}). Reply to your invitation email, or message them from your candidate portal.</p>
          <dl className="cand-ref">
            <div><dt>Your session ID</dt><dd className="mono">{SESSION_ID}</dd></div>
            <div><dt>Candidate ID</dt><dd className="mono">{ASSESSMENT.candidate.id}</dd></div>
          </dl>
          <p className="cand-muted">Share these so they can find your session quickly.</p>
        </section>

        <section aria-labelledby={`${id}-rep`}>
          <h3 id={`${id}-rep`} className="cand-h3">Report a technical problem</h3>
          {reported ? (
            <p role="status" className="cand-reported">Reported. Reference <span className="mono">{reported}</span>. It’s attached to your session for your recruiting partner and reviewers. If it cost you time, they can restore it.</p>
          ) : (
            <form className="field" onSubmit={(e) => {
              e.preventDefault();
              const ref = `R-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
              logEvent('tech-report', `Reported a technical problem (${ref}): ${what.trim() || 'no details'}`);
              setReported(ref);
              setWhat('');
            }}>
              <label className="field__label" htmlFor={`${id}-what`}>What happened? <span className="cand-muted">(optional)</span></label>
              <textarea id={`${id}-what`} rows={3} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="For example: the page froze on question 4 for about two minutes." />
              <div><button type="submit" className="btn btn--secondary">Send report</button></div>
            </form>
          )}
        </section>
      </div>
    </Dialog>
  );
}

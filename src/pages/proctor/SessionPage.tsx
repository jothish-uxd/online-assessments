import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../components/usePageTitle';
import { useCaptures } from '../../data/candidate/session';
import { MATCH_TEXT, STATUS_TEXT, type Session } from '../../data/proctor/sessions';
import { BASE, RiskBadge } from './bits';

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
const spokenTime = (sec: number) => `${Math.floor(sec / 60)} minutes ${Math.round(sec % 60)} seconds`;

/**
 * One session's evidence: the recording with flagged moments on its timeline,
 * the identity check, the AI's output and the list of flagged behaviours.
 * Shell and placeholders for now.
 */
export default function SessionPage({ s }: { s: Session }) {
  const h = usePageTitle(`${s.candidate} · Proctoring review`);
  const total = s.minutes * 60;
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [said, setSaid] = useState('');

  const jump = (i: number) => {
    const e = s.events[i];
    setAt(e.at); setPicked(i);
    setSaid(`Moved to ${mmss(e.at)}: ${e.type}.`);
  };

  return (
    <div className="ca-page pr-session">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to={`${BASE}/high-risk`}>Proctoring review</Link></li>
          <li><span aria-current="page">{s.candidate}</span></li>
        </ol>
      </nav>

      <header className="ca-head pr-session__head">
        <div>
          <p className="page-kicker">{s.job} · <span className="mono">{s.reqId}</span></p>
          <h1 ref={h} tabIndex={-1} className="ca-title">{s.candidate}</h1>
          <p className="ca-sub">
            <span className="mono">{s.candidateId}</span> · Submitted {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s.submitted))} · {s.minutes} min · {STATUS_TEXT[s.status]}
          </p>
        </div>
        <RiskBadge risk={s.risk} />
      </header>

      <div className="pr-grid">
        {/* Recording */}
        <section className="pr-player" aria-labelledby="pr-rec">
          <h2 id="pr-rec" className="visually-hidden">Recording</h2>
          <div className="pr-video">
            <span className="pr-video__ph">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M10 8.5v7l5.5-3.5z" fill="currentColor" stroke="none" /></svg>
              Session recording
              <span className="pr-placeholder">Placeholder · video player comes next</span>
            </span>
            <span className="pr-video__time mono" aria-hidden="true">{mmss(at)} / {mmss(total)}</span>
          </div>

          <div className="pr-timeline" role="group" aria-label={`Timeline, ${s.events.length} flagged moments`}>
            <div className="pr-track" aria-hidden="true">
              <span className="pr-track__played" style={{ width: `${(at / total) * 100}%` }} />
              <span className="pr-track__head" style={{ left: `${(at / total) * 100}%` }} />
            </div>
            {s.events.map((e, i) => (
              <button key={i} type="button" className={`pr-mark${picked === i ? ' is-on' : ''}`} style={{ left: `${(e.at / total) * 100}%` }}
                aria-label={`${e.type} at ${spokenTime(e.at)}`} onClick={() => jump(i)}>
                <span className="pr-tip" aria-hidden="true">
                  <strong>{e.type}</strong>
                  <span className="mono">{mmss(e.at)} · {Math.round(e.confidence * 100)}% confidence</span>
                </span>
              </button>
            ))}
            <div className="pr-timeline__scale mono" aria-hidden="true"><span>0:00</span><span>{mmss(total)}</span></div>
          </div>
          <p className="pr-hint">Hover or focus a mark to see what the AI caught. Choose it to jump there.</p>
        </section>

        <aside className="pr-side" aria-label="Identity and outcome">
          <Identity s={s} />
          <Outcome s={s} />
        </aside>
      </div>

      {/* Flagged behaviours */}
      <section className="pr-events" aria-labelledby="pr-ev">
        <div className="section-head">
          <h2 id="pr-ev" className="section-title">Flagged behaviours <span className="muted">{s.events.length}</span></h2>
        </div>
        {s.events.length ? (
          <div className="table-wrap">
            <table className="table pr-table">
              <caption className="visually-hidden">Behaviours the AI flagged in this session, in time order</caption>
              <thead>
                <tr><th scope="col">Time</th><th scope="col">Behaviour</th><th scope="col">Details</th><th scope="col" className="num">Confidence</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr>
              </thead>
              <tbody>
                {s.events.map((e, i) => (
                  <tr key={i} className={picked === i ? 'is-picked' : ''} aria-current={picked === i ? 'true' : undefined}>
                    <td className="mono">{mmss(e.at)}</td>
                    <th scope="row">{e.type}</th>
                    <td>{e.detail}</td>
                    <td className="num">{Math.round(e.confidence * 100)}%</td>
                    <td><button type="button" className="link-button" onClick={() => jump(i)}>Jump to<span className="visually-hidden"> {e.type} at {mmss(e.at)}</span></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty"><p className="empty__title">Nothing flagged</p><p>The AI didn’t catch any behaviour worth checking.</p></div>}
      </section>
      <span className="visually-hidden" role="status">{said}</span>
    </div>
  );
}

/** Selfie and ID photo next to a frame from the recording, to check it's the same person throughout. */
function Identity({ s }: { s: Session }) {
  const caps = useCaptures();
  // The candidate website's own captures belong to Poe Dameron's session.
  const own = s.id === 's-poe' ? caps : {};
  const Photo = ({ src, label }: { src?: string; label: string }) => (
    <figure className="pr-photo">
      {src ? <img src={src} alt={`${label}, ${s.candidate}`} /> : <span className="pr-photo__ph" role="img" aria-label={`${label}: placeholder`}><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="7" /><path d="M6 38c2-8 8-12 14-12s12 4 14 12" /></svg></span>}
      <figcaption>{label}</figcaption>
    </figure>
  );
  return (
    <section className="pr-card" aria-labelledby="pr-id">
      <h2 id="pr-id" className="pr-card__title">Identity</h2>
      <div className="pr-photos">
        <Photo src={own.selfie} label="Selfie at start" />
        <Photo src={own.idFront} label="ID photo" />
        <Photo label="From recording" />
      </div>
      <p className={`pr-match pr-match--${s.idMatch}`}><span className="pr-match__mark" aria-hidden="true" />{MATCH_TEXT[s.idMatch]}</p>
      <p className="pr-placeholder">Placeholder · face match score and frames over time</p>
    </section>
  );
}

/** What the AI concluded, and where the reviewer's decision will go. */
function Outcome({ s }: { s: Session }) {
  return (
    <section className="pr-card" aria-labelledby="pr-out">
      <h2 id="pr-out" className="pr-card__title">Outcome</h2>
      <dl className="kv kv--stack">
        <div><dt>AI assessment</dt><dd><RiskBadge risk={s.risk} /></dd></div>
        <div><dt>Flags</dt><dd>{s.events.length}</dd></div>
        <div><dt>Review status</dt><dd>{STATUS_TEXT[s.status]}</dd></div>
      </dl>
      <div className="pr-decide">
        <button type="button" className="btn btn--secondary" aria-disabled="true" aria-describedby="pr-dec-note">Clear</button>
        <button type="button" className="btn btn--secondary" aria-disabled="true" aria-describedby="pr-dec-note">Escalate</button>
        <button type="button" className="btn btn--primary" aria-disabled="true" aria-describedby="pr-dec-note">Confirm misconduct</button>
      </div>
      <p id="pr-dec-note" className="pr-placeholder">Placeholder · decisions, notes and the pass/fail result come next</p>
    </section>
  );
}

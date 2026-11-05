import { useEffect, useId, useState } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import Dialog from '../../components/content/Dialog';
import Menu from '../../components/content/Menu';
import { Select } from '@jothish-uxd/enterprise-library';
import { usePageTitle } from '../../components/usePageTitle';
import { person, useMe } from '../../data/content/people';
import { OPEN_JOBS, addToJob, inviteToApply, sendMessage, sendOa, useTalent, type Talent } from '../../data/hiring/talent';

const BASE = '/hiring-system';

type Action = { kind: 'messages' | 'add' | 'invite' | 'oa'; ids: string[] } | null;

const day = (iso: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));
const month = (ym: string) => new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(`${ym}-15T12:00:00`));
const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('');

/** Talent: people a recruiter can reach out to. Select cards to act on several at once. */
export default function TalentPage() {
  const h = usePageTitle('Talent · Internal ATS');
  return (
    <div className="ca-page">
      <header className="ca-head tal-head">
        <div>
          <h1 ref={h} tabIndex={-1} className="ca-title">Talent</h1>
          <p className="ca-sub">Everyone in the ATS you might hire: grouped into pools, or listed one by one as prospects.</p>
        </div>
      </header>
      <nav className="wf-tabs tal-tabs" aria-label="Talent">
        <NavLink to={`${BASE}/talent/pool`} className="ca-tab">Pool</NavLink>
        <NavLink to={`${BASE}/talent/prospects`} className="ca-tab">Prospects</NavLink>
      </nav>
      <Routes>
        <Route index element={<Navigate to="pool" replace />} />
        <Route path="pool" element={<Pools />} />
        <Route path="prospects" element={<Prospects />} />
        <Route path="*" element={<Navigate to="pool" replace />} />
      </Routes>
    </div>
  );
}

/** Pools: buckets of talent. Empty for now; a table of pools comes later. */
function Pools() {
  return (
    <section className="tal-section" aria-labelledby="tal-pools-h">
      <h2 id="tal-pools-h" className="visually-hidden">Pool</h2>
      <div className="empty tal-empty">
        <p className="empty__title">No pools yet</p>
        <p>Pools are buckets of talent. They’ll be listed here in a table, with how many people are in each.</p>
        <dl className="tal-pooltypes">
          <div>
            <dt>Your pools</dt>
            <dd>Any grouping that helps you, not tied to a role, level, location or title. For example: “Former Rebel Alliance pilots”, “Strong OA results, not yet interviewed”, or “Ask again in spring”.</dd>
          </div>
          <div>
            <dt>Suggested by the system</dt>
            <dd>One pool per job we’re actively hiring for, kept up to date automatically with people who qualify and aren’t already hired or interviewing. For example: Starfighter Pilot L4, Flight Instructor L5, Hangar Mechanic L3, Intelligence Analyst L5, Squadron Leader L6.</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

/** Prospects: individual people, as cards you can select and act on. */
function Prospects() {
  const talent = useTalent();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<Action>(null);
  const [said, setSaid] = useState('');
  const all = talent.length > 0 && picked.size === talent.length;
  const some = picked.size > 0 && !all;
  const ids = [...picked];
  useEffect(() => { if (!said) return; const t = setTimeout(() => setSaid(''), 5000); return () => clearTimeout(t); }, [said]);
  const toggle = (id: string, on: boolean) => setPicked((p) => { const n = new Set(p); if (on) n.add(id); else n.delete(id); return n; });

  return (
    <section className="tal-section" aria-labelledby="tal-pros-h">
      <h2 id="tal-pros-h" className="visually-hidden">Prospects</h2>
      <p className="tal-intro">People you’ve sourced or who’ve shown interest. Select people to act on several at once.</p>
      <div className="tal-bulk" role="toolbar" aria-label="Selected people">
        <label className="check">
          <input type="checkbox" checked={all} ref={(el) => { if (el) el.indeterminate = some; }}
            onChange={(e) => setPicked(e.target.checked ? new Set(talent.map((t) => t.id)) : new Set())} />
          Select all {talent.length}
        </label>
        <span className="tal-bulk__count" aria-live="polite">{picked.size ? `${picked.size} selected` : 'None selected'}</span>
        <span className="tal-bulk__actions">
          {(['add', 'invite', 'oa'] as const).map((k) => (
            <button key={k} type="button" className="btn btn--secondary btn--sm" aria-disabled={!picked.size || undefined}
              onClick={() => picked.size ? setAction({ kind: k, ids }) : setSaid('Select at least one person first.')}>
              {k === 'add' ? 'Add to job' : k === 'invite' ? 'Invite to apply' : 'Send OA'}
            </button>
          ))}
        </span>
      </div>

      <ul className="tal-list">
        {talent.map((t) => (
          <li key={t.id}><TalentCard t={t} picked={picked.has(t.id)} onPick={(on) => toggle(t.id, on)} onAction={(kind) => setAction({ kind, ids: [t.id] })} /></li>
        ))}
      </ul>

      {action?.kind === 'messages' && <MessagesDialog t={talent.find((x) => x.id === action.ids[0])!} onClose={() => setAction(null)} />}
      {(action?.kind === 'add' || action?.kind === 'invite') && (
        <JobDialog kind={action.kind} people={talent.filter((t) => action.ids.includes(t.id))} onClose={() => setAction(null)} onDone={(m) => { setAction(null); setSaid(m); }} />
      )}
      {action?.kind === 'oa' && <OaDialog people={talent.filter((t) => action.ids.includes(t.id))} onClose={() => setAction(null)} onDone={(m) => { setAction(null); setSaid(m); }} />}
      <span className="visually-hidden" role="status">{said}</span>
      {said && <p className="tal-toast" aria-hidden="true">{said}</p>}
    </section>
  );
}

/* ---------- The card ---------- */

function TalentCard({ t, picked, onPick, onAction }: { t: Talent; picked: boolean; onPick: (on: boolean) => void; onAction: (k: 'messages' | 'add' | 'invite' | 'oa') => void }) {
  const id = useId();
  const recent = t.applications.slice(0, 3);
  const oa = t.oa[0];
  const unread = t.messages.filter((m) => m.from === 'candidate').length;
  return (
    <article className={`tal-card${picked ? ' is-picked' : ''}`} aria-labelledby={`${id}-n`}>
      <header className="tal-card__head">
        <label className="tal-card__pick">
          <input type="checkbox" checked={picked} onChange={(e) => onPick(e.target.checked)} />
          <span className="visually-hidden">Select {t.name}</span>
        </label>
        <span className="tal-avatar" aria-hidden="true">{initials(t.name)}</span>
        <div className="tal-card__who">
          <h2 id={`${id}-n`} className="tal-card__name">{t.name} {t.pronouns && <span className="tal-card__pron">({t.pronouns})</span>}</h2>
          <p className="tal-card__headline">{t.headline}</p>
          <ul className="tal-card__meta">
            <li><span className="mono">{t.id}</span></li>
            <li><Pin /> {t.location}</li>
            <li><a href={`mailto:${t.email}`}>{t.email}</a></li>
            <li><a href={`tel:${t.phone.replace(/[^+\d]/g, '')}`}>{t.phone}</a></li>
            <li>Prefers {t.preferredContact.toLowerCase()}</li>
          </ul>
        </div>
        <div className="tal-card__actions">
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => onAction('messages')}>
            Messages <span className="tal-count" aria-hidden="true">{t.messages.length}</span>
            <span className="visually-hidden">, {t.messages.length} with {t.name}</span>
          </button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => onAction('oa')}>Send OA</button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => onAction('invite')}>Invite to apply</button>
          <Menu label={`More actions for ${t.name}`} className="wf-more" items={[
            { label: 'Add to job', onSelect: () => onAction('add') },
            { label: 'Add a note', disabled: true, onSelect: () => {} },
            { label: 'Add to talent pool', disabled: true, onSelect: () => {} },
            { label: 'Share profile', disabled: true, onSelect: () => {} },
            { label: 'Mark as do not contact', divider: true, disabled: true, onSelect: () => {} },
          ]}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></svg>
          </Menu>
        </div>
      </header>

      {oa && (
        <section className="tal-oa" aria-label="Online assessment result">
          <div className="tal-oa__main">
            <span className="tal-label">Online assessment</span>
            <span className="tal-oa__band"><Band band={oa.band} />{oa.band}</span>
            <span className="tal-oa__score"><strong>{oa.score}</strong>/{oa.outOf}</span>
          </div>
          <dl className="tal-oa__facts">
            <div><dt>Workflow</dt><dd>{oa.workflow} · v{oa.version}</dd></div>
            <div><dt>Taken</dt><dd>{day(oa.taken)}</dd></div>
            <div><dt>Valid until</dt><dd>{day(oa.validUntil)}</dd></div>
            <div><dt>Proctoring</dt><dd>{oa.proctoring}</dd></div>
            <div className="tal-oa__reuse"><dt>Also counts for</dt><dd>{oa.reusableFor.join(', ')}</dd></div>
          </dl>
        </section>
      )}

      <div className="tal-cols">
        <section aria-labelledby={`${id}-apps`}>
          <h3 id={`${id}-apps`} className="tal-label">Recent applications</h3>
          <ol className="tal-items">
            {recent.map((a) => (
              <li key={a.reqId}>
                <span className="tal-items__title">{a.title}</span>
                <span className="tal-items__sub"><span className="mono">{a.reqId}</span> · {day(a.date)}</span>
                <span className={`tal-stage${a.stage === 'Not selected' || a.stage === 'Withdrew' ? ' is-closed' : ''}`}>{a.stage}</span>
              </li>
            ))}
          </ol>
          {t.applications.length > 3 && <p className="tal-more">+{t.applications.length - 3} older</p>}
        </section>
        <section aria-labelledby={`${id}-exp`}>
          <h3 id={`${id}-exp`} className="tal-label">Experience</h3>
          <ol className="tal-items">
            {t.experience.slice(0, 2).map((e) => (
              <li key={e.org + e.start}>
                <span className="tal-items__title">{e.title}</span>
                <span className="tal-items__sub">{e.org}</span>
                <span className="tal-items__sub">{month(e.start)} – {e.end ? month(e.end) : <strong>Present</strong>} · {e.location}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby={`${id}-edu`}>
          <h3 id={`${id}-edu`} className="tal-label">Education</h3>
          <ol className="tal-items">
            {t.education.slice(0, 2).map((e) => (
              <li key={e.school}>
                <span className="tal-items__title">{e.credential}, {e.field}</span>
                <span className="tal-items__sub">{e.school} · {e.years}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="tal-consider" aria-labelledby={`${id}-con`}>
        <h3 id={`${id}-con`} className="tal-label">Good to know</h3>
        <dl>
          {t.considerations.map((c) => (
            <div key={c.label} className={c.flag ? 'is-flag' : ''}>
              <dt>{c.flag && <span className="tal-flag" aria-hidden="true">!</span>}{c.label}</dt>
              <dd>{c.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="tal-skills" aria-label="Skills">{t.skills.map((s) => <li key={s}>{s}</li>)}</ul>
      </section>

      <footer className="tal-card__foot">
        <span>Source: {t.source}</span>
        <span>Owner: {t.owner}</span>
        <span>Added {day(t.added)}</span>
        <span>Last activity {day(t.lastActivity)}</span>
        {unread > 0 && <span>{unread} repl{unread === 1 ? 'y' : 'ies'} from {t.name.split(' ')[0]}</span>}
      </footer>
    </article>
  );
}

const Pin = () => <svg className="tal-pin" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.5s4.5-4.2 4.5-7.7a4.5 4.5 0 0 0-9 0c0 3.5 4.5 7.7 4.5 7.7z" /><circle cx="8" cy="6.8" r="1.6" /></svg>;
/** Band drawn as a filled bar count, so it doesn't rely on colour. */
function Band({ band }: { band: string }) {
  const n = band === 'Strong' ? 4 : band === 'Recommended' ? 3 : band === 'Borderline' ? 2 : 1;
  return <span className="tal-bars" aria-hidden="true">{[1, 2, 3, 4].map((i) => <span key={i} className={i <= n ? 'is-on' : ''} />)}</span>;
}

/* ---------- Dialogs ---------- */

function MessagesDialog({ t, onClose }: { t: Talent; onClose: () => void }) {
  const id = useId();
  const me = person(useMe());
  const [draft, setDraft] = useState('');
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <Dialog open onClose={onClose} size="drawer" title={`Messages with ${t.name}`}
      description={<p>Email, SMS and portal messages, oldest first. Prefers {t.preferredContact.toLowerCase()}.</p>}>
      <ol className="tal-thread">
        {t.messages.map((m, i) => (
          <li key={i} className={`tal-msg tal-msg--${m.from}`}>
            <span className="tal-msg__meta"><strong>{m.by}</strong> · {m.channel} · {fmt.format(new Date(m.at))}</span>
            {m.subject && <span className="tal-msg__subj">{m.subject}</span>}
            <p>{m.body}</p>
          </li>
        ))}
      </ol>
      <form className="field tal-compose" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { sendMessage(t.id, me.name, draft.trim()); setDraft(''); } }}>
        <label className="field__label" htmlFor={`${id}-m`}>Reply by {t.preferredContact.toLowerCase()}</label>
        <textarea id={`${id}-m`} rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div><button type="submit" className="btn btn--primary btn--sm" aria-disabled={!draft.trim() || undefined}>Send</button></div>
      </form>
    </Dialog>
  );
}

function JobDialog({ kind, people, onClose, onDone }: { kind: 'add' | 'invite'; people: Talent[]; onClose: () => void; onDone: (m: string) => void }) {
  const id = useId();
  const me = person(useMe());
  const [req, setReq] = useState<string>('');
  const job = OPEN_JOBS.find((j) => j.reqId === req);
  const first = people.length === 1 ? people[0].name.split(' ')[0] : 'there';
  const [body, setBody] = useState('');
  const text = body || (job ? `Hi ${first}, I think you’d be a great fit for our ${job.title} role. I’d love for you to apply; the link is below. — ${me.name}` : '');
  const already = job ? people.filter((p) => p.applications.some((a) => a.reqId === job.reqId && a.stage !== 'Not selected' && a.stage !== 'Withdrew')) : [];
  const who = people.length === 1 ? people[0].name : `${people.length} people`;
  return (
    <Dialog open onClose={onClose} size="sm" title={kind === 'add' ? `Add ${who} to a job` : `Invite ${who} to apply`}
      description={<p>{kind === 'add' ? 'Puts them straight into the job’s pipeline without asking them to apply.' : 'Sends a message with a link to apply. They’re added to the job when they do.'}</p>}
      footer={<>
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn--primary" aria-disabled={!job || undefined} onClick={() => {
          if (!job) return;
          people.forEach((p) => kind === 'add' ? addToJob(p.id, job.reqId, me.name) : inviteToApply(p.id, job.reqId, me.name, text));
          onDone(kind === 'add' ? `Added ${who} to ${job.title}.` : `Invited ${who} to apply to ${job.title}.`);
        }}>{kind === 'add' ? 'Add to job' : 'Send invitation'}</button>
      </>}>
      <div className="form">
        <Select label="Job" value={req} placeholder="Choose a job" options={OPEN_JOBS.map((j) => ({ value: j.reqId, label: `${j.title} · ${j.reqId}` }))} onChange={(v) => setReq(v)} />
        {already.length > 0 && <p className="tal-warn" role="note">{already.map((p) => p.name).join(', ')} {already.length === 1 ? 'is' : 'are'} already in this job’s pipeline.</p>}
        {kind === 'invite' && job && (
          <div className="field">
            <label className="field__label" htmlFor={`${id}-b`}>Message</label>
            <textarea id={`${id}-b`} rows={5} value={text} onChange={(e) => setBody(e.target.value)} />
          </div>
        )}
      </div>
    </Dialog>
  );
}

function OaDialog({ people, onClose, onDone }: { people: Talent[]; onClose: () => void; onDone: (m: string) => void }) {
  const me = person(useMe());
  const workflows = [...new Set(OPEN_JOBS.map((j) => j.workflow))];
  const [wf, setWf] = useState('');
  // A recent, valid result for the same (or an equivalent) workflow means they don't need to retake it.
  const covered = wf ? people.filter((p) => p.oa.some((o) => new Date(o.validUntil) > new Date() && (o.workflow === wf || o.reusableFor.includes(wf)))) : [];
  const toSend = people.filter((p) => !covered.includes(p));
  const who = people.length === 1 ? people[0].name : `${people.length} people`;
  return (
    <Dialog open onClose={onClose} size="sm" title={`Send an online assessment to ${who}`}
      description={<p>They get an email with a link to the candidate website. It stays open for 180 days.</p>}
      footer={<>
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn--primary" aria-disabled={!wf || !toSend.length || undefined} onClick={() => {
          if (!wf || !toSend.length) return;
          toSend.forEach((p) => sendOa(p.id, wf, me.name));
          onDone(`Sent ${wf} to ${toSend.length === 1 ? toSend[0].name : `${toSend.length} people`}.`);
        }}>Send assessment</button>
      </>}>
      <div className="form">
        <Select label="OA workflow" value={wf} placeholder="Choose a workflow" options={workflows.map((w) => ({ value: w, label: w }))} onChange={(v) => setWf(v)} />
        {covered.length > 0 && (
          <p className="tal-warn" role="note">
            <strong>{covered.map((p) => p.name).join(', ')}</strong> already {covered.length === 1 ? 'has' : 'have'} a valid result that counts for {wf}, so {covered.length === 1 ? 'they won’t' : 'they won’t'} be sent it again.
          </p>
        )}
      </div>
    </Dialog>
  );
}

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Select } from '@jothish-uxd/enterprise-library';
import { ASSESSMENT, QUESTIONS } from '../../data/candidate/assessment';
import { SESSION_ID, answered, logEvent, patch, saveCapture, startExam, useCaptures, useSession, type IdType } from '../../data/candidate/session';
import { CameraView, captureFrame, useCamera } from './Camera';

/** Page frame for each step: a focused heading, so screen readers hear where they are. */
export function Step({ kicker, title, children, wide }: { kicker?: string; title: string; children: ReactNode; wide?: boolean }) {
  const h = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h.current?.focus({ preventScroll: true }); }, [title]);
  return (
    <div className={`cand-wrap${wide ? ' cand-wrap--wide' : ''}`}>
      {kicker && <p className="cand-kicker">{kicker}</p>}
      <h1 ref={h} tabIndex={-1} className="cand-title">{title}</h1>
      {children}
    </div>
  );
}

const SETUP = ['Agree', 'Camera', 'Selfie', 'ID', 'Start'];
function Progress({ at }: { at: number }) {
  return (
    <ol className="cand-steps" aria-label="Getting set up">
      {SETUP.map((s, i) => (
        <li key={s} className={i < at ? 'is-done' : i === at ? 'is-now' : ''} aria-current={i === at ? 'step' : undefined}>
          <span className="cand-steps__dot" aria-hidden="true">{i < at ? '✓' : i + 1}</span>
          {s}<span className="visually-hidden">{i < at ? ', done' : i === at ? ', current step' : ''}</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Welcome ---------- */

export function Welcome() {
  const timed = QUESTIONS.filter((q) => q.seconds).length;
  return (
    <Step kicker={ASSESSMENT.org} title={`Hi ${ASSESSMENT.candidate.name.split(' ')[0]}, welcome to your assessment`}>
      <p className="cand-lede">{ASSESSMENT.title} helps the hiring team understand how you think through situations a starfighter pilot faces. There are no trick questions.</p>
      <dl className="cand-facts">
        <div><dt>Questions</dt><dd>{QUESTIONS.length}, of different kinds</dd></div>
        <div><dt>Time</dt><dd>{ASSESSMENT.minutes} minutes in total. {timed} questions also have their own timer.</dd></div>
        <div><dt>Proctored</dt><dd>Your camera stays on throughout and is recorded.</dd></div>
      </dl>
      <h2 className="cand-h2">Before you start, have ready</h2>
      <ul className="cand-list">
        <li>A quiet, well-lit room where you’re alone</li>
        <li>A government-issued photo ID: driver’s licence, national ID card or passport</li>
        <li>A laptop or desktop with a camera, and a current Chrome, Edge, Firefox or Safari</li>
        <li>About {ASSESSMENT.minutes + 10} minutes without interruptions, including setup</li>
      </ul>
      <p className="cand-note">Need extra time, a screen reader–friendly format or another accommodation? Ask your recruiting partner, {ASSESSMENT.recruiter.name}, <strong>before</strong> you start. Once you begin, the clock can’t be paused.</p>
      <div className="cand-actions">
        <button type="button" className="btn btn--primary btn--lg" onClick={() => patch({ phase: 'consent' })}>Get started</button>
      </div>
    </Step>
  );
}

/* ---------- Consent ---------- */

const PLEDGES = [
  { id: 'terms', text: 'I agree to the Terms of use and the Privacy notice.' },
  { id: 'alone', text: 'I’ll take this assessment by myself, without help from anyone, and I won’t share or copy its questions.' },
  { id: 'tools', text: 'I won’t use other devices, websites, notes or AI tools unless a question says I can.' },
  { id: 'record', text: 'I understand my camera, my activity in this tab and my answers are recorded, and a selfie and photos of my ID are used to confirm who I am.' },
  { id: 'dq', text: 'I understand that if I break these rules, I may be disqualified from this and future applications.' },
];

export function Consent() {
  const id = useId();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [tried, setTried] = useState(false);
  const [declined, setDeclined] = useState(false);
  const missing = PLEDGES.filter((p) => !ticked.has(p.id));
  const toggle = (k: string, on: boolean) => setTicked((t) => { const n = new Set(t); if (on) n.add(k); else n.delete(k); return n; });

  if (declined) {
    return (
      <Step title="You can’t start without agreeing">
        <p className="cand-lede">That’s okay. This assessment is proctored, so we can only run it with your agreement. Nothing has been recorded.</p>
        <p>If you have questions about how your data is used, or want to ask about another way to be assessed, contact your recruiting partner, {ASSESSMENT.recruiter.name}.</p>
        <div className="cand-actions"><button type="button" className="btn btn--secondary" onClick={() => setDeclined(false)}>Go back to the agreement</button></div>
      </Step>
    );
  }

  return (
    <Step title="Before you begin">
      <Progress at={0} />
      <p className="cand-lede">Please read these terms and confirm each point. They keep the assessment fair for everyone.</p>
      <div className="cand-terms" tabIndex={0} role="region" aria-label="Terms of use and privacy notice">
        <h2>Terms of use</h2>
        <p>This assessment and its questions belong to the {ASSESSMENT.org}. You may use it only to apply for the role you were invited to. You may not copy, record, photograph, share or publish any part of it, during or after your session.</p>
        <p>Your results are shared with the hiring team for this role and may be reused for similar roles for up to 12 months, so you don’t have to take the same assessment twice.</p>
        <h2>Privacy notice</h2>
        <p>We collect your answers, how long you take, activity in this browser tab (such as leaving it), a video recording from your camera, one selfie, and photos of the front and back of your ID.</p>
        <p>We use the selfie and ID photos only to confirm you are the person taking the assessment. The recording is checked by automated tools and, if something is flagged, by a trained reviewer. Reviewers don’t make hiring decisions.</p>
        <p>We keep recordings and photos for up to 12 months, then delete them. We never sell them or use them to train models. You can ask to see or delete your data through your recruiting partner.</p>
        <h2>Fair play</h2>
        <p>Work alone, in a private space, on this device only. Don’t use notes, other devices, websites or AI tools unless a question says you can. Keep your face in view. If we find a breach, we may cancel your result and disqualify you from this and future applications.</p>
      </div>

      <fieldset className="cand-pledges" aria-describedby={tried && missing.length ? `${id}-err` : undefined}>
        <legend className="cand-h2">Confirm each point</legend>
        {PLEDGES.map((p) => (
          <label key={p.id} className={`cand-pledge${tried && !ticked.has(p.id) ? ' is-missing' : ''}`}>
            <input type="checkbox" checked={ticked.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} aria-invalid={tried && !ticked.has(p.id)} />
            <span>{p.text}</span>
          </label>
        ))}
      </fieldset>
      {tried && missing.length > 0 && (
        <p id={`${id}-err`} className="cand-error" role="alert">Confirm {missing.length === 1 ? 'the last point' : `the ${missing.length} remaining points`} to continue.</p>
      )}
      <div className="cand-actions">
        <button type="button" className="btn btn--primary btn--lg" onClick={() => {
          setTried(true);
          if (missing.length) return;
          patch({ phase: 'camera', consentAt: Date.now() });
          logEvent('consent', 'Agreed to the terms, privacy notice and fair-play rules');
        }}>I agree, continue</button>
        <button type="button" className="btn btn--secondary btn--lg" onClick={() => setDeclined(true)}>I don’t agree</button>
      </div>
    </Step>
  );
}

/* ---------- Camera check ---------- */

export function CameraCheck() {
  const cam = useCamera();
  const ready = cam.status === 'live' || cam.status === 'simulated';
  return (
    <Step title="Turn on your camera">
      <Progress at={1} />
      <p className="cand-lede">Your camera stays on for the whole assessment. We’ll use it next to take a selfie and photos of your ID.</p>
      <div className="cand-camgrid">
        <CameraView label={ready ? 'Your camera preview' : 'Camera is off'} />
        <div className="cand-camside">
          {cam.status === 'idle' && <p>When your browser asks, choose <strong>Allow</strong>.</p>}
          {cam.status === 'asking' && <p role="status">Waiting for you to allow the camera…</p>}
          {cam.status === 'live' && <p role="status"><strong>Your camera is on.</strong> Check your face is clear and well lit.</p>}
          {cam.status === 'simulated' && <p role="status"><strong>Using a sample camera.</strong> This prototype draws a stand-in instead of your real camera.</p>}
          {cam.status === 'blocked' && (
            <div role="alert" className="cand-problem">
              <p><strong>{cam.error}</strong> Choose the camera icon in your browser’s address bar, allow this site, then try again.</p>
            </div>
          )}
          <div className="cand-actions cand-actions--stack">
            {ready
              ? <button type="button" className="btn btn--primary btn--lg" onClick={() => { patch({ phase: 'selfie' }); logEvent('camera', cam.status === 'live' ? 'Camera turned on' : 'Sample camera used (prototype)'); }}>Continue</button>
              : <button type="button" className="btn btn--primary btn--lg" onClick={() => void cam.start()} disabled={cam.status === 'asking'}>{cam.status === 'blocked' ? 'Try again' : 'Turn on camera'}</button>}
            {!ready && (
              <button type="button" className="link-button" onClick={cam.simulate}>Use a sample camera instead <span className="cand-muted">(prototype only)</span></button>
            )}
          </div>
        </div>
      </div>
    </Step>
  );
}

/* ---------- Capture: selfie and ID ---------- */

function Capture({ label, guide, sample, tips, onUse, note }: {
  label: string; guide: 'face' | 'card'; sample: 'face' | 'card-front' | 'card-back'; tips: string[];
  onUse: (img: string) => void; note?: ReactNode;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const cam = useCamera();
  const [live, setLive] = useState(false);
  const ready = cam.status !== 'live' || live;
  const [shot, setShot] = useState<string | null>(null);
  const [said, setSaid] = useState('');
  const useRef2 = useRef<HTMLButtonElement>(null);
  const takeRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="cand-camgrid">
      <div className="cand-shot">
        {shot
          ? <img src={shot} alt={`Your photo: ${label}`} className={`cand-shot__img${guide === 'card' ? ' is-card' : ''}`} />
          : <CameraView guide={guide} sample={sample} videoRef={video} label={`Camera preview. ${label}`} onReady={() => setLive(true)} />}
      </div>
      <div className="cand-camside">
        <ul className="cand-list cand-list--tight">{tips.map((t) => <li key={t}>{t}</li>)}</ul>
        {note}
        <div className="cand-actions cand-actions--stack">
          {shot ? (
            <>
              <button ref={useRef2} type="button" className="btn btn--primary btn--lg" onClick={() => { onUse(shot); setShot(null); }}>Use this photo</button>
              <button type="button" className="btn btn--secondary" onClick={() => { setShot(null); setLive(false); setSaid('Retaking. Camera preview is back.'); requestAnimationFrame(() => takeRef.current?.focus()); }}>Retake</button>
            </>
          ) : (
            <button ref={takeRef} type="button" className="btn btn--primary btn--lg" aria-disabled={!ready} onClick={() => {
              if (!ready) return;
              setShot(captureFrame(video.current, sample));
              setSaid('Photo taken. Check it, then use it or retake.');
              requestAnimationFrame(() => useRef2.current?.focus());
            }}>
              <svg viewBox="0 0 16 16" aria-hidden="true" className="btn__icon"><path d="M2 5.5h2.5L6 3.5h4l1.5 2H14V13H2z" /><circle cx="8" cy="9" r="2.4" /></svg>
              {ready ? 'Take photo' : 'Starting camera…'}
            </button>
          )}
        </div>
        <span className="visually-hidden" role="status">{said}</span>
      </div>
    </div>
  );
}

export function Selfie() {
  return (
    <Step title="Take a selfie">
      <Progress at={2} />
      <p className="cand-lede">We compare this with the photo on your ID, and with you during the assessment.</p>
      <Capture label="Selfie" guide="face" sample="face"
        tips={['Fit your face inside the oval', 'Face a light, not a window behind you', 'Take off hats and sunglasses; glasses are fine']}
        onUse={(img) => { saveCapture('selfie', img); logEvent('selfie', 'Selfie captured'); patch({ phase: 'id' }); }} />
    </Step>
  );
}

const ID_TYPES: { value: IdType; label: string }[] = [
  { value: 'licence', label: 'Driver’s licence' },
  { value: 'national', label: 'National ID card' },
  { value: 'passport', label: 'Passport' },
];

export function IdCapture() {
  const [s] = useSession();
  const [side, setSide] = useState<'front' | 'back'>('front');
  const needsBack = s.idType !== 'passport';
  const name = ID_TYPES.find((t) => t.value === s.idType)!.label.toLowerCase();
  const done = () => { patch({ phase: 'verify' }); };
  return (
    <Step title={side === 'front' ? (s.idType === 'passport' ? 'Photograph your passport photo page' : `Photograph the front of your ${name}`) : `Now the back of your ${name}`}>
      <Progress at={3} />
      {side === 'front' && (
        <div className="cand-idtype">
          <Select label="Type of ID" value={s.idType} options={ID_TYPES} onChange={(v) => patch({ idType: v })} inline />
          <span className="cand-muted">{needsBack ? 'You’ll photograph the front, then the back.' : 'Only the photo page is needed.'}</span>
        </div>
      )}
      <Capture key={side} label={side === 'front' ? `Front of your ${name}` : `Back of your ${name}`} guide="card" sample={side === 'front' ? 'card-front' : 'card-back'}
        tips={side === 'front'
          ? ['Hold it inside the frame, close to the camera', 'Make sure your photo and name are sharp', 'Avoid glare: tilt it slightly away from lights']
          : ['Turn it over and hold it inside the frame', 'Make sure the barcode is fully in view']}
        note={<p className="cand-muted small">Photos are sent securely to the proctoring team to check, and you won’t see them again.</p>}
        onUse={(img) => {
          if (side === 'front') {
            saveCapture('idFront', img); logEvent('id', `ID captured: ${name}, front`);
            if (needsBack) setSide('back'); else done();
          } else {
            saveCapture('idBack', img); logEvent('id', `ID captured: ${name}, back`);
            done();
          }
        }} />
    </Step>
  );
}

/* ---------- Verify ---------- */

const CHECKS = ['Photos are clear', 'ID is readable and hasn’t expired', 'Your face matches your ID'];

export function Verify() {
  const [done, setDone] = useState(0);
  const caps = useCaptures();
  useEffect(() => {
    if (done >= CHECKS.length) { logEvent('verified', 'Identity verified'); return; }
    const t = setTimeout(() => setDone((d) => d + 1), 900);
    return () => clearTimeout(t);
  }, [done]);
  const finished = done >= CHECKS.length;
  return (
    <Step title={finished ? 'You’re verified' : 'Checking your photos'}>
      <Progress at={finished ? 4 : 3} />
      <ul className="cand-checks" aria-live="polite">
        {CHECKS.map((c, i) => (
          <li key={c} className={i < done ? 'is-done' : i === done ? 'is-now' : ''}>
            <span className="cand-checks__mark" aria-hidden="true">{i < done ? '✓' : ''}</span>
            {c}{i < done ? <span className="visually-hidden">: done</span> : i === done ? <span className="cand-muted">…</span> : null}
          </li>
        ))}
      </ul>
      <p className="cand-muted small">{[caps.selfie && 'selfie', caps.idFront && 'ID front', caps.idBack && 'ID back'].filter(Boolean).join(', ')} received.</p>
      {finished && (
        <div className="cand-actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={() => patch({ phase: 'ready' })}>Continue</button>
        </div>
      )}
    </Step>
  );
}

/* ---------- Ready ---------- */

export function Ready() {
  return (
    <Step title="Ready when you are">
      <Progress at={4} />
      <p className="cand-lede">Your {ASSESSMENT.minutes}-minute clock starts when you choose <strong>Start assessment</strong>.</p>
      <ul className="cand-list">
        <li><strong>One question at a time.</strong> Once you move on, you can’t go back.</li>
        <li><strong>Some questions have their own timer.</strong> When it runs out, your answer so far is saved and the next question opens.</li>
        <li><strong>Your camera stays on.</strong> You can hide your preview; recording carries on.</li>
        <li><strong>Stay in this tab.</strong> Leaving it is recorded.</li>
        <li><strong>Problems?</strong> Choose Help at the top. Your answers save as you go.</li>
      </ul>
      <div className="cand-actions">
        <button type="button" className="btn btn--primary btn--lg" onClick={startExam}>Start assessment</button>
      </div>
    </Step>
  );
}

/* ---------- Done ---------- */

export function Done() {
  const [s] = useSession();
  const cam = useCamera();
  useEffect(() => { cam.stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const when = s.submittedAt ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(s.submittedAt) : '';
  return (
    <Step kicker={ASSESSMENT.title} title={s.submitReason === 'time' ? 'Time’s up. Your answers are in.' : 'Assessment submitted'}>
      <p className="cand-lede">Thanks, {ASSESSMENT.candidate.name.split(' ')[0]}. {s.submitReason === 'time' ? 'The clock ran out, so we submitted everything you’d answered.' : 'You’re all done.'} Your camera is off.</p>
      <dl className="cand-facts">
        <div><dt>Submitted</dt><dd>{when}</dd></div>
        <div><dt>Answered</dt><dd>{answered(s)} of {QUESTIONS.length} questions</dd></div>
        <div><dt>Reference</dt><dd className="mono">{SESSION_ID}</dd></div>
      </dl>
      <h2 className="cand-h2">What happens next</h2>
      <ol className="cand-list">
        <li>Your session is reviewed to confirm it was taken fairly.</li>
        <li>Your results go to the hiring team. They aren’t shown here.</li>
        <li>{ASSESSMENT.recruiter.name}, your recruiting partner, will contact you, usually within 5 working days.</li>
      </ol>
      <p className="cand-muted">You can close this tab.</p>
    </Step>
  );
}

export function SignedOut({ onSignIn }: { onSignIn: () => void }) {
  const [s] = useSession();
  const midExam = s.resume === 'exam';
  return (
    <Step title="You’re signed out">
      <p className="cand-lede">{midExam ? 'Your answers so far are saved. The assessment clock is still running, so sign back in soon.' : 'Your progress is saved. Sign back in to carry on.'}</p>
      <div className="cand-actions">
        <button type="button" className="btn btn--primary btn--lg" onClick={onSignIn}>Sign back in</button>
      </div>
    </Step>
  );
}

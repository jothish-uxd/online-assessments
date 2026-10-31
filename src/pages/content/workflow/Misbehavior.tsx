import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Select from '../../../components/Select';
import { AlertIcon } from '../../../components/content/icons';
import { useModules } from '../../../data/content/store';
import {
  BROWSER_DETECTIONS, CAMERA_DETECTIONS, ID_DOCUMENTS, NO_VIDEO_DEVICES, type DetectionInfo,
} from '../../../data/content/misbehavior';
import { DEVICE_OPTIONS } from '../../../data/content/seedWorkflows';
import {
  dropNonVideoDevices, setCameraProctoring, setIdVerification, updateMisbehavior,
} from '../../../data/content/workflows';
import type { Detection, Misbehavior as MB, Workflow } from '../../../data/content/types';
import { contentRoutes } from '../routes';
import { IdIcon, ProctorIcon } from './icons';

/**
 * Misbehavior settings: who the candidate is, what the camera and browser watch,
 * and what happens when something is flagged. Selfie capture is the base every
 * camera check compares against, so the others switch it on.
 */
export default function Misbehavior({ w, editable }: { w: Workflow; editable: boolean }) {
  const id = useId();
  const modules = useModules();
  const mb = w.misbehavior;
  const [said, setSaid] = useState('');
  const idOn = w.steps.some((s) => s.kind === 'id-check');
  const cameraOn = mb.image.on || mb.video.on;
  const selfieNeededBy = [idOn && 'ID verification', mb.image.on && 'image proctoring', mb.video.on && 'video proctoring'].filter(Boolean) as string[];
  const badDevices = w.settings.devices.filter((d) => NO_VIDEO_DEVICES.includes(d));
  const deviceLabel = (v: string) => DEVICE_OPTIONS.find((d) => d.value === v)?.label ?? v;
  const upd = (fn: (m: MB) => MB, action: string) => updateMisbehavior(w.id, fn, action);
  const announce = (t: string) => setSaid(t);

  const turn = (what: 'id' | 'selfie' | 'image' | 'video', on: boolean) => {
    if (what === 'id') { setIdVerification(w.id, on, modules); announce(on ? 'ID validation and verification on. Added the ID verification step to the builder graph and turned on selfie capture.' : 'ID validation and verification off. Removed its step from the builder graph.'); }
    if (what === 'selfie') { upd((m) => ({ ...m, selfie: { ...m.selfie, on } }), on ? 'Turned on selfie capture' : 'Turned off selfie capture'); announce(on ? 'Selfie capture on.' : 'Selfie capture off.'); }
    if (what === 'image' || what === 'video') {
      setCameraProctoring(w.id, what, on, modules);
      const other = what === 'image' ? mb.video.on : mb.image.on;
      announce(`${what === 'image' ? 'Image' : 'Video'} proctoring ${on ? 'on' : 'off'}.${on && !cameraOn ? ' Added the proctoring system check to the builder graph and turned on selfie capture.' : ''}${!on && !other ? ' Removed the proctoring system check from the builder graph.' : ''}`);
    }
  };

  return (
    <section className="wf-section wf-section--wide" aria-labelledby={`${id}-h`}>
      <div className="section-head">
        <div>
          <h2 id={`${id}-h`} className="section-title">Misbehavior settings</h2>
          <p className="muted small mis-intro">
            How this assessment confirms who the candidate is and watches for help they shouldn’t have.
            Everything here becomes part of the candidate’s experience, so turn on only what the role needs.
          </p>
        </div>
      </div>

      <div className="mis">
        <fieldset className="mis__main plain-fieldset" disabled={!editable}>
          <legend className="visually-hidden">Misbehavior settings</legend>

          {/* ---------- Identity ---------- */}
          <h3 className="mis__group">Identity</h3>

          <Setting
            title="Selfie capture" on={mb.selfie.on} onToggle={(v) => turn('selfie', v)}
            locked={selfieNeededBy.length > 0 && mb.selfie.on ? `Needed by ${list(selfieNeededBy)}.` : undefined}
            summary="One photo of the candidate at the start, right after consent."
            body={<>
              <p>It’s the reference every other identity check compares against. On its own, without any proctoring, it can still confirm the badge photo a new hire uploads, or let site security check that the person who starts work is the person who took the assessment.</p>
              <p className="mis__meta"><b>Candidate:</b> about 20 seconds · <b>Devices:</b> any with a front camera</p>
            </>}
          >
            <fieldset className="checks checks--stack">
              <legend className="field__label">Also use the selfie to</legend>
              <label className="check"><input type="checkbox" checked={mb.selfie.badge} onChange={(e) => upd((m) => ({ ...m, selfie: { ...m.selfie, badge: e.target.checked } }), 'Changed selfie uses')} /> Verify the badge photo the candidate uploads after an offer</label>
              <label className="check"><input type="checkbox" checked={mb.selfie.onsite} onChange={(e) => upd((m) => ({ ...m, selfie: { ...m.selfie, onsite: e.target.checked } }), 'Changed selfie uses')} /> Let site security confirm identity on the first day</label>
            </fieldset>
            <NumField label="Keep the selfie for (days)" value={mb.selfie.retentionDays} min={1}
              help="Deleted after this, or 30 days after a candidate is turned down, whichever comes first."
              onChange={(v) => upd((m) => ({ ...m, selfie: { ...m.selfie, retentionDays: v } }), 'Changed selfie retention')} />
          </Setting>

          <Setting
            title="ID validation and verification" icon={<IdIcon />} on={idOn} onToggle={(v) => turn('id', v)}
            summary="The candidate holds a photo ID up to the camera before the first scored module."
            body={<>
              <p><b>Validation</b> checks the document looks genuine and is in date. <b>Verification</b> checks its photo matches the candidate’s selfie, so selfie capture turns on with it.</p>
              <p>Adds the <i>ID verification</i> step to the <Link to={contentRoutes.workflow(w.id)}>builder graph</Link>. Removing that step turns this off.</p>
              <p className="mis__meta"><b>Candidate:</b> about 2 minutes · <b>Devices:</b> any with a camera</p>
            </>}
          >
            <fieldset className="checks checks--grid">
              <legend className="field__label">Accepted documents</legend>
              {ID_DOCUMENTS.map((doc) => (
                <label key={doc.value} className="check">
                  <input type="checkbox" checked={mb.id.documents.includes(doc.value)}
                    onChange={(e) => upd((m) => ({ ...m, id: { ...m.id, documents: e.target.checked ? [...m.id.documents, doc.value] : m.id.documents.filter((x) => x !== doc.value) } }), 'Changed accepted ID documents')} />
                  {doc.label}
                </label>
              ))}
            </fieldset>
            <div className="mis__pair">
              <Select label="Attempts" value={mb.id.attempts} options={[1, 2, 3].map((n) => ({ value: n, label: `${n} attempt${n === 1 ? '' : 's'}` }))}
                onChange={(v) => upd((m) => ({ ...m, id: { ...m.id, attempts: v } }), 'Changed ID attempts')} />
              <Select label="If the ID can’t be verified" value={mb.id.onFail}
                options={[{ value: 'review', label: 'Let them continue, send to review' }, { value: 'block', label: 'Stop the assessment' }]}
                onChange={(v) => upd((m) => ({ ...m, id: { ...m.id, onFail: v } }), 'Changed what happens when ID fails')} />
            </div>
          </Setting>

          {/* ---------- Proctoring ---------- */}
          <h3 className="mis__group">Proctoring</h3>

          <Setting
            title="Image proctoring" icon={<ProctorIcon />} on={mb.image.on} onToggle={(v) => turn('image', v)}
            summary="The camera takes photos at random moments during scored modules."
            body={<>
              <p>Candidates know the camera is on, but not when a photo is taken. Each photo is compared with the starting selfie. It’s lighter than video: it works on phones and tablets, uses little data, and reviewers look through a strip of photos instead of a recording.</p>
              <p className="mis__meta"><b>Needs:</b> selfie capture · <b>Devices:</b> any with a front camera</p>
            </>}
          >
            <div className="mis__pair">
              <Select label="Photos per hour, at random" value={mb.image.perHour}
                options={[4, 6, 8, 12].map((n) => ({ value: n, label: `About ${n}` }))}
                onChange={(v) => upd((m) => ({ ...m, image: { ...m.image, perHour: v } }), 'Changed photo frequency')} />
              <label className="check mis__check"><input type="checkbox" checked={mb.image.faceMatch}
                onChange={(e) => upd((m) => ({ ...m, image: { ...m.image, faceMatch: e.target.checked } }), 'Changed face matching')} /> Compare each photo with the selfie</label>
            </div>
          </Setting>

          <Setting
            title="Video proctoring" icon={<ProctorIcon />} on={mb.video.on} onToggle={(v) => turn('video', v)}
            summary="The camera records from the proctoring check to the end of the assessment."
            body={<>
              <p>Detected events are marked on a timeline, so reviewers in the Proctoring report jump straight to them instead of watching the whole recording. Recording the microphone too lets it catch talking.</p>
              <p><b>Desktop and laptop only.</b> Phone and tablet browsers pause the camera when the screen locks or the candidate switches apps, and the on-screen keyboard covers the frame, so recordings come out incomplete.</p>
              <p className="mis__meta"><b>Needs:</b> selfie capture, a desktop or laptop with a webcam · <b>Candidate:</b> about 1 minute for the camera check</p>
            </>}
          >
            {badDevices.length > 0 && (
              <div className="mis__conflict" role="alert">
                <AlertIcon />
                <div>
                  <p>This workflow also supports {list(badDevices.map(deviceLabel))}. Candidates on {badDevices.length === 1 ? 'it' : 'those'} couldn’t be recorded.</p>
                  {editable && <button type="button" className="btn btn--secondary btn--sm" onClick={() => { dropNonVideoDevices(w.id); announce('Supported devices limited to desktop and laptop.'); }}>Limit to desktop and laptop</button>}
                </div>
              </div>
            )}
            <label className="check"><input type="checkbox" checked={mb.video.audio}
              onChange={(e) => upd((m) => ({ ...m, video: { ...m.video, audio: e.target.checked } }), 'Changed audio recording')} /> Record the microphone too</label>
          </Setting>

          {cameraOn && (
            <div className="mis__note">
              Both camera options start at the <i>Proctoring system check</i> on the <Link to={contentRoutes.workflow(w.id)}>builder graph</Link>, which tests the camera before the first scored module.
            </div>
          )}

          <Detections
            title="What the camera watches for" rows={CAMERA_DETECTIONS} values={mb.camera}
            available={(x) => x.needs === 'video' ? (mb.video.on ? null : 'Needs video proctoring')
              : cameraOn ? null : 'Needs image or video proctoring'}
            extra={(x) => (x.id === 'talking' || x.id === 'speaking') && mb.video.on && !mb.video.audio ? 'Needs the microphone' : null}
            onChange={(k, v) => upd((m) => ({ ...m, camera: { ...m.camera, [k]: v } }), 'Changed camera detections')}
          />

          {/* ---------- Browser ---------- */}
          <h3 className="mis__group">Browser activity</h3>
          <p className="muted small mis__groupnote">Watches the assessment tab itself. Works on every device and needs no camera, so it’s the lightest check to leave on.</p>
          <Detections
            title="What the browser watches for" rows={BROWSER_DETECTIONS} values={mb.browser}
            available={(x) => (!x.mobile && !w.settings.devices.some((d) => d === 'desktop')) ? 'Desktop and laptop only' : null}
            extra={(x) => (!x.mobile && w.settings.devices.some((d) => d !== 'desktop')) ? 'Desktop and laptop only' : null}
            onChange={(k, v) => upd((m) => ({ ...m, browser: { ...m.browser, [k]: v } }), 'Changed browser detections')}
          />

          {/* ---------- Review ---------- */}
          <h3 className="mis__group">Review</h3>
          <div className="mis__review">
            <NumField label="Send to proctoring review at (flags)" value={mb.review.threshold} min={1}
              help="Sessions with fewer flags are scored straight away. A different-person flag always goes to review."
              onChange={(v) => upd((m) => ({ ...m, review: { ...m.review, threshold: v } }), 'Changed the review threshold')} />
            <label className="check"><input type="checkbox" checked={mb.review.holdResults}
              onChange={(e) => upd((m) => ({ ...m, review: { ...m.review, holdResults: e.target.checked } }), 'Changed result holds')} />
              Hold results from the hiring system until the review is done</label>
            {cameraOn && (
              <NumField label="Keep photos and recordings for (days)" value={mb.video.retentionDays} min={1}
                help="Kept longer only when a review is open or a candidate disputes a result."
                onChange={(v) => upd((m) => ({ ...m, video: { ...m.video, retentionDays: v } }), 'Changed recording retention')} />
            )}
          </div>
        </fieldset>

        <Summary w={w} idOn={idOn} />
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">{said}</span>
    </section>
  );
}

const orList = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`;
const list = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

function Setting({ title, icon, on, onToggle, locked, summary, body, children }: {
  title: string; icon?: ReactNode; on: boolean; onToggle: (v: boolean) => void; locked?: string;
  summary: string; body: ReactNode; children?: ReactNode;
}) {
  const id = useId();
  return (
    <section className={`setting${on ? ' is-on' : ''}`} aria-labelledby={`${id}-t`}>
      <div className="setting__head">
        <div className="setting__text">
          <h4 id={`${id}-t`} className="setting__title">{icon}{title}</h4>
          <p className="setting__summary" id={`${id}-s`}>{summary}</p>
        </div>
        <button type="button" role="switch" aria-checked={on} aria-labelledby={`${id}-t`}
          aria-describedby={`${id}-s${locked ? ` ${id}-l` : ''}`} aria-disabled={locked ? true : undefined}
          className="switch" onClick={() => { if (!locked) onToggle(!on); }}>
          <span className="switch__track" aria-hidden="true"><span className="switch__thumb" /></span>
          <span className="switch__text" aria-hidden="true">{on ? 'On' : 'Off'}</span>
        </button>
      </div>
      {locked && <p id={`${id}-l`} className="setting__locked">{locked} Turn those off first.</p>}
      <div className="setting__body">{body}</div>
      {on && children && <div className="setting__options">{children}</div>}
    </section>
  );
}

function Detections({ title, rows, values, available, extra, onChange }: {
  title: string; rows: DetectionInfo[]; values: Record<string, Detection>;
  available: (x: DetectionInfo) => string | null; extra: (x: DetectionInfo) => string | null;
  onChange: (key: string, v: Detection) => void;
}) {
  const id = useId();
  return (
    <div className="detections">
      <div className="table-wrap">
        <table className="table table--compact">
          <caption className="detections__cap" id={`${id}-c`}>{title}</caption>
          <thead><tr><th scope="col">Behaviour</th><th scope="col">When it happens</th></tr></thead>
          <tbody>
            {rows.map((x) => {
              const v = values[x.id] ?? { on: false, action: 'flag' };
              const blocked = available(x);
              const note = blocked ?? extra(x);
              return (
                <tr key={x.id} className={blocked ? 'is-blocked' : ''}>
                  <th scope="row">
                    <label className="check detections__check">
                      <input type="checkbox" checked={v.on && !blocked} disabled={!!blocked}
                        onChange={(e) => onChange(x.id, { ...v, on: e.target.checked })} />
                      <span>
                        <span className="cell-strong">{x.label}</span>
                        <span className="cell-sub">{x.about}{note ? <> <b className="detections__need">{note}.</b></> : null}</span>
                      </span>
                    </label>
                  </th>
                  <td>
                    <Select label={`When ${x.label.toLowerCase()} happens`} hideLabel value={v.action}
                      options={[{ value: 'flag', label: 'Flag for review' }, { value: 'warn', label: 'Warn, then flag' }]}
                      onChange={(a) => onChange(x.id, { ...v, action: a })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NumField({ label, value, min, help, onChange }: { label: string; value: number; min: number; help?: string; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="field field--num">
      <label className="field__label" htmlFor={id}>{label}</label>
      <input id={id} type="number" min={min} value={value || ''} aria-describedby={help ? `${id}-h` : undefined}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))} />
      {help && <span id={`${id}-h`} className="field-help">{help}</span>}
    </div>
  );
}

/** What the candidate goes through, worked out from the settings and the graph. */
function Summary({ w, idOn }: { w: Workflow; idOn: boolean }) {
  const modules = useModules();
  const mb = w.misbehavior;
  const docs = ID_DOCUMENTS.filter((d) => mb.id.documents.includes(d.value)).map((d) => d.label);
  const after = (kind: 'id-check' | 'proctoring') => {
    const i = w.steps.findIndex((s) => s.kind === kind);
    const prev = w.steps[i - 1];
    if (i < 0) return '';
    if (!prev) return 'at the start';
    if (prev.kind === 'module') return `after ${modules.find((m) => m.id === prev.moduleId)?.name ?? 'a module'}`;
    return prev.kind === 'id-check' ? 'after ID verification' : 'after the proctoring check';
  };
  const before: string[] = [];
  const during: string[] = [];
  let minutes = 0;
  if (mb.selfie.on) { before.push('Take a selfie.'); minutes += 0.5; }
  if (idOn) { before.push(`Hold up a ${orList(docs.length ? docs : ['photo ID'])} to the camera, ${after('id-check')}. ${mb.id.attempts} attempt${mb.id.attempts === 1 ? '' : 's'}.`); minutes += 2; }
  if (mb.image.on || mb.video.on) { before.push(`Allow the camera${mb.video.on && mb.video.audio ? ' and microphone' : ''} and pass a camera check, ${after('proctoring')}.`); minutes += 1; }
  if (mb.video.on) during.push(`The camera${mb.video.audio ? ' and microphone' : ''} record until the end.`);
  if (mb.image.on) during.push(`About ${mb.image.perHour} photos an hour are taken at random.`);
  if (mb.browser['left-tab']?.on) during.push(mb.browser['left-tab'].action === 'warn' ? 'Leaving the tab shows a warning the first time.' : 'Leaving the tab is flagged.');
  if (mb.browser['fullscreen']?.on && w.settings.devices.includes('desktop')) during.push('On a computer, the assessment runs in full screen.');
  if (mb.browser['paste']?.on) during.push('Pasting into written answers is flagged.');

  const kept: string[] = [];
  if (mb.selfie.on) kept.push(`Selfie: ${mb.selfie.retentionDays} days${mb.selfie.badge || mb.selfie.onsite ? `, also for ${list([mb.selfie.badge && 'the badge photo check', mb.selfie.onsite && 'first-day identity checks'].filter(Boolean) as string[])}` : ''}.`);
  if (idOn) kept.push('ID: the result only. The document image is deleted once checked.');
  if (mb.image.on || mb.video.on) kept.push(`${mb.video.on ? 'Recording' : 'Photos'}: ${mb.video.retentionDays} days.`);

  const devices = w.settings.devices.map((d) => DEVICE_OPTIONS.find((x) => x.value === d)?.label ?? d);

  return (
    <aside className="mis__summary" aria-label="What candidates go through">
      <h3 className="detail__h3">What candidates go through</h3>
      {before.length ? (
        <>
          <p className="mis__sumhead">Before the first scored module</p>
          <ol className="mis__steps">{before.map((t) => <li key={t}>{t}</li>)}</ol>
        </>
      ) : <p className="muted small">No identity checks. Candidates go straight from the instructions to the first module.</p>}
      {during.length > 0 && (
        <>
          <p className="mis__sumhead">While they answer</p>
          <ul className="mis__steps mis__steps--dots">{during.map((t) => <li key={t}>{t}</li>)}</ul>
        </>
      )}
      <dl className="kv kv--stack mis__facts">
        <div><dt>Extra time</dt><dd>{minutes ? `About ${Math.ceil(minutes)} minute${Math.ceil(minutes) === 1 ? '' : 's'}` : 'None'}</dd></div>
        <div><dt>Supported devices</dt><dd>{devices.join(', ') || 'None chosen'}</dd></div>
        <div><dt>What’s kept</dt><dd>{kept.length ? <ul className="mis__kept">{kept.map((t) => <li key={t}>{t}</li>)}</ul> : 'Answers and browser events only.'}</dd></div>
      </dl>
      <p className="muted small">Candidates see all of this in the consent module before they start, and can ask for an accommodation instead.</p>
    </aside>
  );
}

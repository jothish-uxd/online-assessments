import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import Dialog from '../../../components/content/Dialog';
import Menu from '../../../components/content/Menu';
import { PlusIcon } from '../../../components/content/icons';
import { PEOPLE, person } from '../../../data/content/people';
import { ATS_OPTIONS, DEVICE_OPTIONS } from '../../../data/content/seedWorkflows';
import { timedTotal, updateSettings, updateWorkflow, useWorkflows } from '../../../data/content/workflows';
import { fmtSeconds, useModules } from '../../../data/content/store';
import { AlertIcon, TimerIcon } from '../../../components/content/icons';
import type { PersonId, Reviewers, Workflow } from '../../../data/content/types';
import { contentRoutes } from '../routes';

type Tab = 'overview' | 'comms';
type ReviewerKey = keyof Reviewers;

const REVIEWER_ROWS: { key: ReviewerKey; label: string; optional: boolean }[] = [
  { key: 'ops', label: 'Ops reviewers', optional: false },
  { key: 'program', label: 'Program reviewers', optional: false },
  { key: 'e2e', label: 'End-to-end testing', optional: true },
  { key: 'signoff', label: 'Final sign-off', optional: false },
  { key: 'launch', label: 'Launch ready', optional: true },
];

/** Workflow settings beside the builder graph: Overview and Communications. */
export default function SettingsPanel({ w, editable }: { w: Workflow; editable: boolean }) {
  const id = useId();
  const [tab, setTab] = useState<Tab>('overview');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const workflows = useWorkflows();
  const [editing, setEditing] = useState<ReviewerKey | null>(null);
  const s = w.settings;

  const onTabKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = i === 0 ? 1 : 0;
    setTab(next === 0 ? 'overview' : 'comms');
    tabRefs.current[next]?.focus();
  };

  const toggle = (list: string[], v: string, on: boolean) => (on ? [...list, v] : list.filter((x) => x !== v));
  const others = workflows.filter((x) => x.id !== w.id && !s.equivalent.includes(x.id));

  return (
    <aside className="wf-settings" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="wf-settings__title">Workflow settings</h2>
      <div className="wf-settings__tabs" role="tablist" aria-label="Workflow settings">
        {(['overview', 'comms'] as Tab[]).map((t, i) => (
          <button key={t} ref={(el) => { tabRefs.current[i] = el; }} type="button" role="tab" id={`${id}-t-${t}`}
            aria-selected={tab === t} aria-controls={`${id}-p-${t}`} tabIndex={tab === t ? 0 : -1}
            className="tab" onClick={() => setTab(t)} onKeyDown={(e) => onTabKey(e, i)}>
            {t === 'overview' ? 'Overview' : 'Communications'}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${id}-p-overview`} aria-labelledby={`${id}-t-overview`} hidden={tab !== 'overview'} className="wf-settings__panel">
        <fieldset disabled={!editable} className="plain-fieldset wf-fields">
          <legend className="visually-hidden">Overview</legend>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-name`}>Workflow name <Req /></label>
            <input id={`${id}-name`} value={w.name} required aria-invalid={!w.name.trim()}
              onChange={(e) => updateWorkflow(w.id, { name: e.target.value })} />
          </div>
          <div className="kv kv--stack">
            <div><dt>Workflow ID</dt><dd className="mono">{w.code}</dd></div>
            <div><dt>Workflow type</dt><dd>{w.type}</dd></div>
          </div>
          <div className="wf-fields__pair">
            <div className="field field--num">
              <label className="field__label" htmlFor={`${id}-link`}>Link validity (days) <Req /></label>
              <input id={`${id}-link`} type="number" min={1} value={s.linkDays || ''} aria-describedby={`${id}-link-h`}
                onChange={(e) => updateSettings(w.id, { linkDays: Number(e.target.value) })} />
              <span id={`${id}-link-h`} className="field-help">How long the invitation link stays open.</span>
            </div>
            <div className="field field--num">
              <label className="field__label" htmlFor={`${id}-score`}>Score validity (days) <Req /></label>
              <input id={`${id}-score`} type="number" min={1} value={s.scoreDays || ''} aria-describedby={`${id}-score-h`}
                onChange={(e) => updateSettings(w.id, { scoreDays: Number(e.target.value) })} />
              <span id={`${id}-score-h`} className="field-help">How long a result can be reused.</span>
            </div>
          </div>

          <TimeLimit w={w} />

          <fieldset className="checks checks--grid">
            <legend className="field__label">Supported ATSs <Req /></legend>
            {ATS_OPTIONS.map((o) => (
              <label key={o.value} className="check">
                <input type="checkbox" checked={s.ats.includes(o.value)}
                  onChange={(e) => updateSettings(w.id, { ats: toggle(s.ats, o.value, e.target.checked) })} />
                {o.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="checks checks--grid">
            <legend className="field__label">Supported devices <Req /></legend>
            {DEVICE_OPTIONS.map((o) => (
              <label key={o.value} className="check">
                <input type="checkbox" checked={s.devices.includes(o.value)}
                  onChange={(e) => updateSettings(w.id, { devices: toggle(s.devices, o.value, e.target.checked) })} />
                {o.label}
              </label>
            ))}
          </fieldset>

          <div className="field">
            <span className="field__label" id={`${id}-eq`}>Equivalent workflows</span>
            <span className="field-help">Candidates who passed one of these within score validity don’t retake this one.</span>
            {s.equivalent.length > 0 && (
              <ul className="chips" aria-labelledby={`${id}-eq`}>
                {s.equivalent.map((eid) => {
                  const other = workflows.find((x) => x.id === eid);
                  if (!other) return null;
                  return (
                    <li key={eid} className="chip">
                      <Link to={contentRoutes.workflow(eid)}>{other.name}</Link>
                      {editable && (
                        <button type="button" className="chip__x" aria-label={`Remove ${other.name}`}
                          onClick={() => updateSettings(w.id, { equivalent: s.equivalent.filter((x) => x !== eid) }, `Removed equivalent ${other.name}`)}>
                          <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2 2 8" /></svg>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {editable && others.length > 0 && (
              <Menu label="Add an equivalent workflow" className="menu--link" align="start"
                items={others.map((o) => ({ label: o.name, onSelect: () => updateSettings(w.id, { equivalent: [...s.equivalent, o.id] }, `Added equivalent ${o.name}`) }))}>
                <PlusIcon /> Add an equivalent workflow
              </Menu>
            )}
          </div>
        </fieldset>

        <section className="wf-reviewers" aria-labelledby={`${id}-rev`}>
          <h3 id={`${id}-rev`} className="detail__h3">Reviewers</h3>
          <dl className="kv kv--stack">
            {REVIEWER_ROWS.map((r) => {
              const list = s.reviewers[r.key];
              return (
                <div key={r.key} className="reviewer-row">
                  <dt>{r.label}</dt>
                  <dd>
                    {list === null ? <em className="muted">No reviewers required</em>
                      : list.length ? list.map((p) => person(p).name).join(', ')
                      : <em className="muted">Not selected</em>}
                    {editable && (
                      <button type="button" className="link-button reviewer-row__edit" aria-label={`Edit ${r.label}`}
                        onClick={() => setEditing(r.key)}>Edit</button>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      </div>

      <div role="tabpanel" id={`${id}-p-comms`} aria-labelledby={`${id}-t-comms`} hidden={tab !== 'comms'} className="wf-settings__panel">
        <fieldset disabled={!editable} className="plain-fieldset wf-fields">
          <legend className="visually-hidden">Communications</legend>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-subj`}>Invitation subject</label>
            <input id={`${id}-subj`} value={s.inviteSubject} onChange={(e) => updateSettings(w.id, { inviteSubject: e.target.value }, 'Edited the invitation')} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-body`}>Invitation message</label>
            <textarea id={`${id}-body`} rows={7} value={s.inviteBody} aria-describedby={`${id}-body-h`}
              onChange={(e) => updateSettings(w.id, { inviteBody: e.target.value }, 'Edited the invitation')} />
            <span id={`${id}-body-h`} className="field-help">Sent when a candidate applies to a requisition using this workflow. <code>{'{link_days}'}</code> becomes the link validity.</span>
          </div>
          <div className="field field--num">
            <label className="field__label" htmlFor={`${id}-rem`}>Reminder after (days)</label>
            <input id={`${id}-rem`} type="number" min={1} value={s.reminderDays || ''}
              onChange={(e) => updateSettings(w.id, { reminderDays: Number(e.target.value) }, 'Edited reminders')} />
          </div>
        </fieldset>
      </div>

      {editing && (
        <ReviewerDialog
          label={REVIEWER_ROWS.find((r) => r.key === editing)!.label}
          optional={REVIEWER_ROWS.find((r) => r.key === editing)!.optional}
          value={s.reviewers[editing]}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            updateSettings(w.id, { reviewers: { ...s.reviewers, [editing]: v } }, `Changed ${REVIEWER_ROWS.find((r) => r.key === editing)!.label.toLowerCase()}`);
            setEditing(null);
          }}
        />
      )}
    </aside>
  );
}

const EXTRA = [1.25, 1.5, 2];

/** How long candidates have for the whole assessment. */
function TimeLimit({ w }: { w: Workflow }) {
  const id = useId();
  const modules = useModules();
  const tl = w.settings.timeLimit;
  const set = (p: Partial<typeof tl>, action = 'Edited the time limit') => updateSettings(w.id, { timeLimit: { ...tl, ...p } }, action);
  const t = timedTotal(w, modules);
  const over = tl.on && tl.minutes > 0 && t.seconds > tl.minutes * 60;
  return (
    <fieldset className="timelimit">
      <legend className="field__label"><TimerIcon /> Assessment time limit</legend>
      <label className="check">
        <input type="checkbox" checked={tl.on} onChange={(e) => set({ on: e.target.checked }, e.target.checked ? 'Turned on the time limit' : 'Turned off the time limit')} />
        Limit how long candidates have for the whole assessment
      </label>
      {tl.on && (
        <div className="timelimit__body">
          <div className="field field--num">
            <label className="field__label" htmlFor={`${id}-min`}>Minutes</label>
            <input id={`${id}-min`} type="number" min={5} step={5} value={tl.minutes || ''} aria-invalid={!(tl.minutes > 0) || over}
              aria-describedby={`${id}-sum`} onChange={(e) => set({ minutes: Number(e.target.value) })} />
          </div>
          <p id={`${id}-sum`} className={`field-help${over ? ' field-error-text' : ''}`}>
            {over && <AlertIcon />}
            Timed items add up to {fmtSeconds(t.seconds)}{t.untimed ? `, plus ${t.untimed} untimed item${t.untimed === 1 ? '' : 's'}` : ''}.
            {over ? ' The limit is shorter than that.' : ' The clock starts after the system check and pauses during ID verification.'}
          </p>
          <fieldset className="checks checks--stack">
            <legend className="field__label">When time runs out</legend>
            <label className="check">
              <input type="radio" name={`${id}-exp`} checked={tl.onExpire === 'submit'} onChange={() => set({ onExpire: 'submit' })} />
              <span>Submit right away <span className="muted small">· answers so far are scored</span></span>
            </label>
            <label className="check">
              <input type="radio" name={`${id}-exp`} checked={tl.onExpire === 'finish-item'} onChange={() => set({ onExpire: 'finish-item' })} />
              <span>Let them finish the item they’re on <span className="muted small">· then submit</span></span>
            </label>
          </fieldset>
          <fieldset className="checks checks--row">
            <legend className="field__label">Extra time for approved accommodations</legend>
            {EXTRA.map((x) => (
              <label key={x} className="check">
                <input type="checkbox" checked={tl.extraTime.includes(x)}
                  onChange={(e) => set({ extraTime: e.target.checked ? [...tl.extraTime, x].sort() : tl.extraTime.filter((y) => y !== x) })} />
                <span>{x}× <span className="muted small">({Math.round(tl.minutes * x)} min)</span></span>
              </label>
            ))}
          </fieldset>
          <span className="field-help">Extra time also stretches item timers by the same amount.</span>
        </div>
      )}
    </fieldset>
  );
}

const Req = () => <span aria-hidden="true" className="req">*</span>;

function ReviewerDialog({ label, optional, value, onClose, onSave }: {
  label: string; optional: boolean; value: PersonId[] | null; onClose: () => void; onSave: (v: PersonId[] | null) => void;
}) {
  const [none, setNone] = useState(value === null);
  const [picked, setPicked] = useState<PersonId[]>(value ?? []);
  return (
    <Dialog open onClose={onClose} title={label}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" onClick={() => onSave(none ? null : picked)}>Save reviewers</button>
        </>
      }>
      <div className="form">
        {optional && (
          <label className="check">
            <input type="checkbox" checked={none} onChange={(e) => setNone(e.target.checked)} />
            No reviewers required for this stage
          </label>
        )}
        <fieldset className="checks checks--stack" disabled={none}>
          <legend className="field__label">Reviewers</legend>
          {Object.values(PEOPLE).map((p) => (
            <label key={p.id} className="check">
              <input type="checkbox" checked={picked.includes(p.id)}
                onChange={(e) => setPicked(e.target.checked ? [...picked, p.id] : picked.filter((x) => x !== p.id))} />
              {p.name} <span className="muted small">· {p.role}</span>
            </label>
          ))}
        </fieldset>
      </div>
    </Dialog>
  );
}

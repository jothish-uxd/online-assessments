import { useEffect, useId, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../components/usePageTitle';
import Dialog from '../../components/content/Dialog';
import Thumb from '../../components/content/Thumb';
import { ActivityList, Byline } from '../../components/content/Byline';
import { AlertIcon, CheckIcon, CopyIcon, DownIcon, PlusIcon, TrashIcon, TypeIcon, UpIcon } from '../../components/content/icons';
import {
  addItem, deleteItem, deleteModule, duplicateItem, duplicateModule, itemIssues, modulePoints,
  moveItem, newItem, updateModule, useAssets, useModules, fmtSeconds,
  draftChanged, discardDraft, editAsDraft, publishModule, saveDraft, itemSeconds, moduleTime, setModuleTiming,
} from '../../data/content/store';
import { TimerIcon } from '../../components/content/icons';
import { ITEM_TYPES, allowedIn, purposeLabel, typeInfo } from '../../data/content/itemTypes';
import type { Item, ItemType, Module, ModuleTiming } from '../../data/content/types';
import ItemEditor from './ItemEditor';
import { KIND_TEXT, StatusBadge } from './moduleBits';
import { useWorkflows, workflowsUsing } from '../../data/content/workflows';
import { contentRoutes } from './routes';

export default function ModulePage() {
  const { moduleId } = useParams();
  const modules = useModules();
  const m = modules.find((x) => x.id === moduleId);
  if (!m) return <Missing />;
  return <ModuleView key={m.id} m={m} />;
}

function Missing() {
  const h = usePageTitle('Module not found');
  return (
    <div className="ca-page">
      <h1 ref={h} tabIndex={-1} className="ca-title">This module doesn’t exist</h1>
      <p className="ca-sub">It may have been deleted. <Link to={contentRoutes.modules()}>Back to modules</Link></p>
    </div>
  );
}

function ModuleView({ m }: { m: Module }) {
  const h = usePageTitle(m.name);
  const id = useId();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { addItem?: boolean; openItem?: string } };
  const assets = useAssets();
  const usedIn = workflowsUsing(m.id, useWorkflows());

  const [openId, setOpenId] = useState<string | null>(location.state?.openItem ?? null);
  const [adding, setAdding] = useState(!!location.state?.addItem);
  const [newType, setNewType] = useState<ItemType>(m.kind === 'evaluative' ? 'single' : 'content');
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [deletingModule, setDeletingModule] = useState(false);
  const [said, setSaid] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [discarding, setDiscarding] = useState(false);

  const readOnly = m.status === 'published';
  const notReady = m.items.filter((i) => itemIssues(i).length);
  const canSubmit = m.items.length > 0 && notReady.length === 0;

  // Opening an item from elsewhere scrolls it into view.
  useEffect(() => {
    if (location.state?.openItem) document.getElementById(`item-${location.state.openItem}`)?.scrollIntoView({ block: 'start' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const focusLater = (sel: string) => requestAnimationFrame(() => requestAnimationFrame(() =>
    (document.querySelector(sel) as HTMLElement | null)?.focus()));

  const add = () => {
    const item = newItem(newType);
    addItem(m.id, item);
    setAdding(false);
    setOpenId(item.id);
    setSaid(`Added ${typeInfo(newType).label.toLowerCase()} as item ${m.items.length + 1}.`);
    focusLater(`#item-${item.id} [data-autofocus]`);
  };

  const move = (item: Item, d: -1 | 1, index: number) => {
    moveItem(m.id, item.id, d);
    setSaid(`Moved to position ${index + 1 + d} of ${m.items.length}.`);
    focusLater(`#item-${item.id} [data-move="${d}"]:not(:disabled), #item-${item.id} [data-toggle]`);
  };

  const setStatus = (status: Module['status'], action: string, note: string) => {
    updateModule(m.id, { status }, action);
    setSaid(note);
  };
  const changed = draftChanged(m);
  const doDiscard = () => {
    discardDraft(m.id);
    setDiscarding(false);
    setSavedNote('');
    setSaid(changed ? 'Draft discarded. Back to the published version.' : 'Stopped editing. Back to the published version.');
  };
  const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="ca-page module">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to={contentRoutes.modules()}>Modules</Link></li>
          <li><span aria-current="page">{m.name}</span></li>
        </ol>
      </nav>

      <header className="ca-head ca-head--module">
        <div>
          <p className="page-kicker">{KIND_TEXT[m.kind]} module</p>
          <h1 ref={h} tabIndex={-1} className="ca-title">{m.name}</h1>
          {m.description && <p className="ca-sub">{m.description}</p>}
        </div>
        <div className="ca-head__actions">
          <StatusBadge status={m.status} />
          {m.status === 'draft' && (
            <>
              {savedNote && <span className="save-state">{savedNote}</span>}
              {m.live && (
                <button type="button" className="btn btn--secondary" onClick={() => changed ? setDiscarding(true) : doDiscard()}>
                  {changed ? 'Discard draft' : 'Cancel editing'}
                </button>
              )}
              <button type="button" className="btn btn--secondary"
                onClick={() => { saveDraft(m.id); const t = `Draft saved ${timeFmt.format(new Date())}`; setSavedNote(t); setSaid(`${t}.`); }}>Save draft</button>
              <button type="button" className="btn btn--primary" aria-disabled={!canSubmit || (!!m.live && !changed)} aria-describedby={!canSubmit ? `${id}-why` : m.live && !changed ? `${id}-same` : undefined}
                onClick={() => canSubmit && (!m.live || changed) && setStatus('in-review', 'Sent for review', 'Sent for review.')}>Send for review</button>
            </>
          )}
          {m.status === 'in-review' && (
            <>
              <button type="button" className="btn btn--secondary" onClick={() => setStatus('draft', 'Moved back to draft', 'Moved back to draft.')}>Back to draft</button>
              <button type="button" className="btn btn--primary" aria-disabled={!canSubmit} aria-describedby={!canSubmit ? `${id}-why` : undefined}
                onClick={() => { if (canSubmit) { publishModule(m.id); setSaid('Published. Assessments can now use this module.'); } }}>Publish</button>
            </>
          )}
          {m.status === 'published' && (
            <button type="button" className="btn btn--secondary" onClick={() => { editAsDraft(m.id); setSavedNote(''); setSaid('Editing a draft. Candidates still get the published version.'); }}>Edit as draft</button>
          )}
        </div>
      </header>
      {m.live && m.status !== 'published' && (
        <div className="draft-bar" role="note">
          <strong>{m.status === 'in-review' ? 'Draft in review.' : 'Editing a draft of a published module.'}</strong>{' '}
          Candidates still get the version published <Byline stamp={m.live.edited} time /> until this one is published.
          {m.status === 'draft' && (changed
            ? <> Changes save as you type; <em>Discard draft</em> goes back to the published version.</>
            : <span id={`${id}-same`}> No changes yet. Make one before sending for review, or choose <em>Cancel editing</em>.</span>)}
        </div>
      )}
      {!canSubmit && m.status !== 'published' && (
        <p id={`${id}-why`} className="gap-text small module__why">
          <AlertIcon /> {m.items.length === 0 ? 'Add at least one item first.' : notReady.length === 1 ? `Item ${m.items.indexOf(notReady[0]) + 1} isn’t ready yet.` : `Items ${notReady.map((i) => m.items.indexOf(i) + 1).join(', ')} aren’t ready yet.`}
        </p>
      )}
      {readOnly && <p className="readonly-note">Published modules can’t be changed. Choose <strong>Edit as draft</strong> to make changes. Candidates keep getting this version until the draft is reviewed and published.</p>}

      <div className="module__grid">
        <section aria-labelledby={`${id}-items`}>
          <div className="section-head">
            <h2 id={`${id}-items`} className="section-title">Items <span className="muted">{m.items.length}</span></h2>
            {m.kind === 'evaluative' && <span className="muted small">{modulePoints(m)} points in total{timeLine(m)}</span>}
          </div>

          {m.items.length === 0 ? (
            <div className="empty">
              <p className="empty__title">No items yet</p>
              <p>{m.kind === 'evaluative' ? 'Add scored items, activities and any instructions candidates need.' : 'Add terms, privacy notices, consent or instructions.'}</p>
            </div>
          ) : (
            <ol className="items">
              {m.items.map((item, i) => {
                const info = typeInfo(item.type);
                const issues = itemIssues(item);
                const open = openId === item.id;
                const media = assets.find((a) => a.id === item.assetId);
                const correct = item.choices?.filter((c) => c.correct).length ?? 0;
                const secs = itemSeconds(m, item);
                return (
                  <li key={item.id} id={`item-${item.id}`} className={`item${open ? ' is-open' : ''}`}>
                    <div className="item__row">
                      <span className="item__num" aria-hidden="true">{i + 1}</span>
                      <div className="item__main">
                        <span className="item__type"><TypeIcon type={item.type} /> {item.type === 'content' ? purposeLabel(item.settings.purpose) : info.short}</span>
                        <h3 className="item__title">
                          <button type="button" className="item__toggle" data-toggle aria-expanded={open} aria-controls={`${id}-ed-${item.id}`}
                            onClick={() => setOpenId(open ? null : item.id)}>
                            <span className="visually-hidden">Item {i + 1}: </span>
                            {(item.type === 'content' ? item.title : item.prompt)?.trim() || <span className="muted">Untitled {info.short.toLowerCase()}</span>}
                          </button>
                        </h3>
                        <span className="item__meta">
                          {info.scored && <span>{item.points} pt{item.points === 1 ? '' : 's'}</span>}
                          {item.choices && <span>{item.choices.length} choices · {correct} correct</span>}
                          {item.questions && <span>{item.questions.length} question{item.questions.length === 1 ? '' : 's'}</span>}
                          {secs !== null && <span className="item__timer"><TimerIcon /> {fmtSeconds(secs)}</span>}
                          {secs === null && m.timing.mode === 'per-item' && info.scored && <span className="muted">Not timed</span>}
                          {item.type === 'content' && item.settings.requireAck && <span>Needs agreement</span>}
                          {media && <span className="item__media"><Thumb asset={media} size="sm" /> {media.title}</span>}
                          <span>Edited by <Byline stamp={item.edited} /></span>
                        </span>
                        {issues.length > 0
                          ? <span className="gap-text small"><AlertIcon /> {issues[0]}{issues.length > 1 ? ` (+${issues.length - 1} more)` : ''}</span>
                          : <span className="ready small"><CheckIcon /> Ready</span>}
                      </div>
                      {!readOnly && (
                        <div className="item__actions" role="group" aria-label={`Item ${i + 1} actions`}>
                          <button type="button" className="bframe__btn" data-move="-1" aria-label={`Move item ${i + 1} up`} disabled={i === 0} onClick={() => move(item, -1, i)}><UpIcon /></button>
                          <button type="button" className="bframe__btn" data-move="1" aria-label={`Move item ${i + 1} down`} disabled={i === m.items.length - 1} onClick={() => move(item, 1, i)}><DownIcon /></button>
                          <button type="button" className="bframe__btn" aria-label={`Duplicate item ${i + 1}`}
                            onClick={() => { const c = duplicateItem(m.id, item.id); if (c) { setOpenId(c.id); setSaid(`Duplicated as item ${i + 2}.`); } }}><CopyIcon /></button>
                          <button type="button" className="bframe__btn" aria-label={`Delete item ${i + 1}`} onClick={() => setDeleting(item)}><TrashIcon /></button>
                        </div>
                      )}
                    </div>
                    {open && (
                      <div id={`${id}-ed-${item.id}`} className="item__editor">
                        <ItemEditor moduleId={m.id} item={item} readOnly={readOnly} timing={m.timing} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {!readOnly && (
            <button type="button" className="btn btn--secondary add-item" onClick={() => setAdding(true)}><PlusIcon /> Add item</button>
          )}
        </section>

        <aside className="module__side" aria-label="About this module">
          <Details m={m} readOnly={readOnly} />
          {m.kind === 'evaluative' && <Timing m={m} readOnly={readOnly} />}
          <dl className="kv">
            <div><dt>Kind</dt><dd>{KIND_TEXT[m.kind]}</dd></div>
            <div><dt>Items</dt><dd>{m.items.length}{m.kind === 'evaluative' && <span className="muted"> · {modulePoints(m)} points</span>}</dd></div>
            <div><dt>Created</dt><dd><Byline stamp={m.created} time /></dd></div>
            <div><dt>Last edited</dt><dd><Byline stamp={m.edited} time /></dd></div>
            <div><dt>Used in</dt><dd>
              {usedIn.length
                ? <ul className="uses">{usedIn.map((x) => <li key={x.id}><Link to={contentRoutes.workflow(x.id)} className="row-link">{x.name}</Link></li>)}</ul>
                : <span className="muted">No OA workflows yet</span>}
            </dd></div>
          </dl>
          <h3 className="detail__h3">Activity</h3>
          <ActivityList items={m.history} limit={8} />
          <div className="module__danger">
            <button type="button" className="btn btn--secondary btn--sm"
              onClick={() => { const c = duplicateModule(m.id); if (c) navigate(contentRoutes.module(c.id)); }}><CopyIcon /> Duplicate module</button>
            <button type="button" className="btn btn--secondary btn--sm btn--danger-text" onClick={() => setDeletingModule(true)}><TrashIcon /> Delete module</button>
          </div>
        </aside>
      </div>

      <span className="visually-hidden" role="status" aria-live="polite">{said}</span>

      <Dialog
        open={discarding}
        onClose={() => setDiscarding(false)}
        alert
        title="Discard this draft?"
        description={<p>Your changes since {m.live ? <Byline stamp={m.live.edited} time /> : 'publishing'} are thrown away and the module goes back to the published version. This can’t be undone.</p>}
        footer={<>
          <button type="button" className="btn btn--secondary" onClick={() => setDiscarding(false)} autoFocus>Keep editing</button>
          <button type="button" className="btn btn--danger" onClick={doDiscard}>Discard draft</button>
        </>}
      />

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        size="lg"
        title={m.items.length ? 'Add an item' : 'Choose the first item’s type'}
        description={m.kind === 'non-evaluative'
          ? <p>This module isn’t scored, so it holds content blocks only.</p>
          : m.items.length ? undefined : <p>You can add more items of any type afterwards.</p>}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" form="add-item" className="btn btn--primary">Add {typeInfo(newType).label.toLowerCase()}</button>
          </>
        }
      >
        <form id="add-item" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <fieldset className="risk-choices">
            <legend className="visually-hidden">Item type</legend>
            <div className="type-grid">
              {ITEM_TYPES.map((t) => {
                const blocked = t.later || !allowedIn(t, m.kind);
                return (
                  <label key={t.type} className={`risk-card type-card${newType === t.type ? ' is-on' : ''}${blocked ? ' is-blocked' : ''}`}>
                    <input type="radio" name="item-type" value={t.type} checked={newType === t.type} disabled={blocked}
                      onChange={() => setNewType(t.type)} />
                    <span className="risk-card__name"><span className="type-card__icon"><TypeIcon type={t.type} /></span>{t.label}</span>
                    <span className="risk-card__about">{t.about}</span>
                    {t.later ? <span className="tag">Coming later</span> : blocked && <span className="tag">Evaluative modules only</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </form>
      </Dialog>

      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        alert
        title={`Delete item ${deleting ? m.items.indexOf(deleting) + 1 : ''}?`}
        description={<p>“{(deleting?.title || deleting?.prompt || 'Untitled').slice(0, 90)}” will be removed from this module. This can’t be undone.</p>}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setDeleting(null)} autoFocus>Cancel</button>
            <button type="button" className="btn btn--danger" onClick={() => {
              if (deleting) { deleteItem(m.id, deleting.id); setSaid('Item deleted.'); }
              setDeleting(null);
            }}>Delete item</button>
          </>
        }
      />

      <Dialog
        open={deletingModule}
        onClose={() => setDeletingModule(false)}
        alert
        title={`Delete “${m.name}”?`}
        description={<p>Its {m.items.length} item{m.items.length === 1 ? '' : 's'} will be deleted too. Assets stay in the library. This can’t be undone.</p>}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setDeletingModule(false)} autoFocus>Cancel</button>
            <button type="button" className="btn btn--danger" onClick={() => { deleteModule(m.id); navigate(contentRoutes.modules()); }}>Delete module</button>
          </>
        }
      />
    </div>
  );
}

function timeLine(m: Module) {
  if (m.timing.mode === 'off') return '';
  const t = moduleTime(m);
  return ` · ${fmtSeconds(t.seconds)} timed${t.untimed ? `, ${t.untimed} untimed` : ''}`;
}

/** Whether items are timed: not at all, the same for every item, or item by item. */
function Timing({ m, readOnly }: { m: Module; readOnly: boolean }) {
  const id = useId();
  const [secs, setSecs] = useState(String(m.timing.seconds));
  useEffect(() => setSecs(String(m.timing.seconds)), [m.timing.seconds]);
  const set = (t: ModuleTiming) => setModuleTiming(m.id, t);
  const t = moduleTime(m);
  const n = Number(secs);
  const bad = m.timing.mode === 'each' && (!secs || Number.isNaN(n) || n < 10);
  const OPTS: { v: ModuleTiming['mode']; label: string; help: string }[] = [
    { v: 'off', label: 'No item timer', help: 'Candidates move at their own pace. The whole assessment can still have a time limit.' },
    { v: 'each', label: 'Same time for every item', help: 'Each scored item counts down from the same time, then moves on.' },
    { v: 'per-item', label: 'Set time item by item', help: 'Give longer items, like charts, more time. Leave an item blank to not time it.' },
  ];
  return (
    <fieldset className="plain-fieldset timing" disabled={readOnly}>
      <legend className="detail__h3"><TimerIcon /> Item timer</legend>
      <div className="radio-cards">
        {OPTS.map((o) => (
          <label key={o.v} className={`radio-card${m.timing.mode === o.v ? ' is-on' : ''}`}>
            <input type="radio" name={`${id}-mode`} checked={m.timing.mode === o.v} onChange={() => set({ ...m.timing, mode: o.v })} aria-describedby={`${id}-${o.v}`} />
            <span>
              <span className="radio-card__label">{o.label}</span>
              <span id={`${id}-${o.v}`} className="field-help">{o.help}</span>
            </span>
          </label>
        ))}
      </div>
      {m.timing.mode === 'each' && (
        <div className="field field--num">
          <label className="field__label" htmlFor={`${id}-s`}>Seconds per item</label>
          <input id={`${id}-s`} type="number" min={10} step={5} value={secs} aria-invalid={bad}
            aria-describedby={`${id}-sh`}
            onChange={(e) => setSecs(e.target.value)}
            onBlur={() => { if (!bad && n !== m.timing.seconds) set({ ...m.timing, seconds: n }); }} />
          <span id={`${id}-sh`} className={bad ? 'field-help field-error-text' : 'field-help'}>{bad ? 'Use 10 seconds or more.' : fmtSeconds(m.timing.seconds)}</span>
        </div>
      )}
      {m.timing.mode !== 'off' && (
        <p className="timing__sum small">
          <strong>{fmtSeconds(t.seconds)}</strong> across {t.scored - t.untimed} timed item{t.scored - t.untimed === 1 ? '' : 's'}
          {t.untimed > 0 && <>; {t.untimed} not timed</>}. Content blocks are never timed.
        </p>
      )}
    </fieldset>
  );
}

/** Name and description, saved together. */
function Details({ m, readOnly }: { m: Module; readOnly: boolean }) {
  const id = useId();
  const [name, setName] = useState(m.name);
  const [desc, setDesc] = useState(m.description);
  const [saved, setSaved] = useState('');
  const dirty = name !== m.name || desc !== m.description;
  return (
    <form className="form module__details" onSubmit={(e) => {
      e.preventDefault();
      if (!name.trim()) return;
      updateModule(m.id, { name: name.trim(), description: desc.trim() }, 'Edited details');
      setSaved('Saved.');
    }}>
      <fieldset disabled={readOnly} className="plain-fieldset">
        <legend className="detail__h3">Details</legend>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-n`}>Name</label>
          <input id={`${id}-n`} value={name} onChange={(e) => { setName(e.target.value); setSaved(''); }} aria-invalid={!name.trim()} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-d`}>Description</label>
          <textarea id={`${id}-d`} rows={3} value={desc} onChange={(e) => { setDesc(e.target.value); setSaved(''); }} />
        </div>
        {!readOnly && (
          <div className="form-actions">
            <button type="submit" className="btn btn--secondary btn--sm" disabled={!dirty || !name.trim()}>Save details</button>
            <span className="save-state" role="status">{saved}</span>
          </div>
        )}
      </fieldset>
    </form>
  );
}

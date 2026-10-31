import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from '../../../../components/Select';
import { Avatar } from '../../../../components/content/Byline';
import { CheckIcon, CloseIcon } from '../../../../components/content/icons';
import { person, useMe } from '../../../../data/content/people';
import { when } from '../../../../data/content/format';
import { outputsOf } from '../../../../data/content/scoring';
import { addThread, deleteComment, replyThread, resolveThread } from '../../../../data/content/workflows';
import type { CommentTarget, Module, Thread, Workflow } from '../../../../data/content/types';
import { contentRoutes } from '../../routes';

/* ---------- Targets ---------- */

export const keyOf = (t: Pick<CommentTarget, 'kind' | 'id'>) => `${t.kind}:${t.id ?? ''}`;
const anchorOf = (t: CommentTarget) =>
  t.kind === 'step' ? `step-${t.id}` : t.kind === 'score' ? `score-${t.id}` : t.kind === 'setting' ? `setting-${t.id}`
  : t.kind === 'case' ? `case-${t.id}` : t.kind === 'suite' ? `suite-${t.id}` : null;

const SETTINGS = [
  { id: 'selfie', label: 'Selfie capture' }, { id: 'id', label: 'ID validation and verification' },
  { id: 'image', label: 'Image proctoring' }, { id: 'video', label: 'Video proctoring' },
  { id: 'browser', label: 'Browser activity' }, { id: 'review', label: 'Proctoring review' },
];
export const settingTarget = (id: string): CommentTarget => ({ kind: 'setting', id, label: SETTINGS.find((s) => s.id === id)?.label ?? id, tab: 'misbehavior' });

/** Everything in a workflow someone can comment on. */
export function targetsFor(w: Workflow, modules: Module[]): CommentTarget[] {
  const out: CommentTarget[] = [{ kind: 'workflow', label: 'Whole workflow', tab: 'builder' }];
  w.steps.forEach((s) => out.push({
    kind: 'step', id: s.id, tab: 'builder',
    label: s.kind === 'id-check' ? 'ID verification' : s.kind === 'proctoring' ? 'Proctoring system check' : modules.find((m) => m.id === s.moduleId)?.name ?? 'Deleted module',
  }));
  w.scoring.scores.forEach((s) => out.push({ kind: 'score', id: s.id, label: s.kind === 'r' ? `${s.name} (${outputsOf(s).length} outputs)` : s.name, tab: 'scores' }));
  SETTINGS.forEach((s) => out.push(settingTarget(s.id)));
  w.testPlan?.suites.forEach((s, si) => {
    out.push({ kind: 'suite', id: s.id, label: `Test suite ${si + 1}: ${s.reason}`, tab: 'test-plan' });
    s.cases.forEach((c, ci) => out.push({ kind: 'case', id: c.id, label: `Test case ${si + 1}.${ci + 1}: ${c.title}`, tab: 'test-plan' }));
  });
  return out;
}

const GROUP: Record<CommentTarget['kind'], string> = {
  workflow: 'Workflow', step: 'Builder graph', score: 'Composite scores', setting: 'Misbehavior settings', suite: 'Test plan', case: 'Test plan',
};

/* ---------- Context: any part of the workflow can open the panel on itself ---------- */

interface Ctx { comment: (t: CommentTarget) => void; openCount: (t: Pick<CommentTarget, 'kind' | 'id'>) => number }
export const CommentsCtx = createContext<Ctx>({ comment: () => {}, openCount: () => 0 });
export const useComments = () => useContext(CommentsCtx);

const BubbleIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5h16v11H11l-4 3.5V16H4z" />
  </svg>
);

/** Small button that opens comments on one thing; shows how many open threads it has. */
export function CommentButton({ target, className = '' }: { target: CommentTarget; className?: string }) {
  const { comment, openCount } = useComments();
  const n = openCount(target);
  return (
    <button type="button" className={`cbtn${n ? ' has-count' : ''} ${className}`} onClick={() => comment(target)}
      aria-label={n ? `${n} open comment thread${n === 1 ? '' : 's'} on ${target.label}` : `Comment on ${target.label}`}>
      <BubbleIcon />{n > 0 && <span aria-hidden="true">{n}</span>}
    </button>
  );
}

/* ---------- Panel ---------- */

type Show = 'open' | 'resolved' | 'all';

export function CommentsPanel({ w, modules, focus, onFocus, onClose }: {
  w: Workflow; modules: Module[]; focus: CommentTarget | null; onFocus: (t: CommentTarget | null) => void; onClose: () => void;
}) {
  const id = useId();
  const me = useMe();
  const navigate = useNavigate();
  const [show, setShow] = useState<Show>('open');
  const [draft, setDraft] = useState('');
  const [on, setOn] = useState<string>(focus ? keyOf(focus) : 'workflow:');
  const [said, setSaid] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  const targets = useMemo(() => targetsFor(w, modules), [w, modules]);

  // Opening the panel on something sets the composer to it and puts focus there.
  useEffect(() => {
    if (focus) setOn(keyOf(focus));
    requestAnimationFrame(() => box.current?.focus());
  }, [focus]);

  const counts = { open: w.comments.filter((t) => !t.resolved).length, resolved: w.comments.filter((t) => t.resolved).length };
  const list = w.comments
    .filter((t) => (show === 'all' ? true : show === 'open' ? !t.resolved : !!t.resolved))
    .filter((t) => !focus || keyOf(t.target) === keyOf(focus))
    .sort((a, b) => b.comments[b.comments.length - 1].at.localeCompare(a.comments[a.comments.length - 1].at));

  const options = targets.map((t) => ({ value: keyOf(t), label: t.kind === 'workflow' ? t.label : `${GROUP[t.kind]} · ${t.label}` }));
  const post = () => {
    const body = draft.trim();
    if (!body) return;
    const t = targets.find((x) => keyOf(x) === on) ?? targets[0];
    addThread(w.id, t, body);
    setDraft(''); setShow('open');
    setSaid(`Comment posted on ${t.label}.`);
  };

  const goTo = (t: CommentTarget) => {
    navigate(contentRoutes.workflow(w.id, t.tab));
    const a = anchorOf(t);
    if (!a) return;
    setTimeout(() => {
      const el = document.getElementById(a);
      if (!el) return;
      el.scrollIntoView({ block: 'center' });
      el.classList.add('is-pinged');
      setTimeout(() => el.classList.remove('is-pinged'), 1600);
    }, 120);
  };

  return (
    <aside className="cpanel" aria-labelledby={`${id}-h`} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="cpanel__head">
        <h2 id={`${id}-h`} className="cpanel__title">Comments</h2>
        <button type="button" className="bframe__btn" aria-label="Close comments" onClick={onClose}><CloseIcon /></button>
      </div>

      <form className="cpanel__compose" onSubmit={(e) => { e.preventDefault(); post(); }}>
        <Select label="Comment on" value={on} options={options} onChange={setOn} />
        <label className="visually-hidden" htmlFor={`${id}-body`}>Comment</label>
        <textarea ref={box} id={`${id}-body`} rows={3} value={draft} onChange={(e) => setDraft(e.target.value)}
          placeholder={`Comment as ${person(me).name}`}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); } }} />
        <div className="cpanel__compose-foot">
          <span className="muted small">⌘ Return to post</span>
          <button type="submit" className="btn btn--primary btn--sm" disabled={!draft.trim()}>Comment</button>
        </div>
      </form>

      <div className="cpanel__filters">
        <fieldset className="seg-control seg-control--sm">
          <legend className="visually-hidden">Show</legend>
          {(['open', 'resolved', 'all'] as Show[]).map((s) => (
            <label key={s} className={`seg-control__opt${show === s ? ' is-on' : ''}`}>
              <input type="radio" name={`${id}-show`} checked={show === s} onChange={() => setShow(s)} />
              {s === 'open' ? 'Open' : s === 'resolved' ? 'Resolved' : 'All'}
              {s !== 'all' && <span className="seg-count">{counts[s]}</span>}
            </label>
          ))}
        </fieldset>
        {focus && (
          <span className="chip cpanel__focus">
            On: {focus.label}
            <button type="button" className="chip__x" aria-label="Show comments on everything" onClick={() => onFocus(null)}>
              <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2 2 8" /></svg>
            </button>
          </span>
        )}
      </div>

      <div className="cpanel__list">
        {list.length ? (
          <ol className="threads">
            {list.map((t) => <ThreadView key={t.id} w={w} t={t} onGo={() => goTo(t.target)} onSay={setSaid} />)}
          </ol>
        ) : (
          <p className="muted small cpanel__empty">
            {show === 'resolved' ? 'No resolved comments.' : focus ? `No ${show === 'open' ? 'open ' : ''}comments on ${focus.label} yet.` : 'No open comments. Start one above.'}
          </p>
        )}
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">{said}</span>
    </aside>
  );
}

function ThreadView({ w, t, onGo, onSay }: { w: Workflow; t: Thread; onGo: () => void; onSay: (s: string) => void }) {
  const id = useId();
  const me = useMe();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const send = () => {
    if (!text.trim()) return;
    replyThread(w.id, t.id, text.trim());
    setText(''); setReplying(false);
    onSay(t.resolved ? 'Reply posted. The thread is open again.' : 'Reply posted.');
  };

  return (
    <li className={`thread${t.resolved ? ' is-resolved' : ''}`} aria-labelledby={`${id}-on`}>
      <div className="thread__on">
        <span className="thread__group">{GROUP[t.target.kind]}</span>
        <button type="button" id={`${id}-on`} className="link-button" onClick={onGo}>{t.target.label}</button>
      </div>
      <ol className="thread__msgs">
        {t.comments.map((c, i) => (
          <li key={c.id} className="cmsg">
            <Avatar id={c.by} size="xs" />
            <div className="cmsg__main">
              <p className="cmsg__meta"><b>{person(c.by).name}</b> <time dateTime={c.at}>{when(c.at, true)}</time>{i > 0 && <span className="visually-hidden">, reply</span>}</p>
              <p className="cmsg__body">{c.body}</p>
              {c.by === me && (
                <button type="button" className="link-button cmsg__del" onClick={() => { deleteComment(w.id, t.id, c.id); onSay('Comment deleted.'); }}>
                  Delete<span className="visually-hidden"> your comment</span>
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {t.resolved && (
        <p className="thread__resolved"><CheckIcon /> Resolved by {person(t.resolved.by).name}, <time dateTime={t.resolved.at}>{when(t.resolved.at, true)}</time></p>
      )}
      {replying ? (
        <form className="thread__reply" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label className="visually-hidden" htmlFor={`${id}-r`}>Reply</label>
          <textarea id={`${id}-r`} rows={2} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
              if (e.key === 'Escape') { e.stopPropagation(); setReplying(false); }
            }} />
          <div className="thread__actions">
            <button type="button" className="link-button" onClick={() => setReplying(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={!text.trim()}>Reply</button>
          </div>
        </form>
      ) : (
        <div className="thread__actions">
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setReplying(true)}>Reply</button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => {
            resolveThread(w.id, t.id, !t.resolved);
            onSay(t.resolved ? 'Thread reopened.' : 'Thread resolved.');
          }}>{t.resolved ? 'Reopen' : <><CheckIcon /> Resolve</>}</button>
        </div>
      )}
    </li>
  );
}

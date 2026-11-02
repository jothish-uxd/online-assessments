import { useEffect, useId, useRef, useState } from 'react';
import Chart from '../../components/content/Chart';
import Dialog from '../../components/content/Dialog';
import { QUESTIONS, SPATIAL, type Choice, type MultiQ, type NumericQ, type OrderQ, type Question, type SingleQ, type WrittenQ } from '../../data/candidate/assessment';
import { advance, answered, logEvent, patch, submit, useSession, type Answer } from '../../data/candidate/session';
import { clock, spoken, useNow } from './Header';

const isAnswered = (a?: Answer) => (Array.isArray(a) ? a.length > 0 : !!a?.toString().trim());

/** One question at a time. No going back; timed questions move on by themselves. */
export default function Exam() {
  const [s] = useSession();
  const q = QUESTIONS[s.index];
  const h = useRef<HTMLHeadingElement>(null);
  const [warnEmpty, setWarnEmpty] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [toast, setToast] = useState('');
  const last = s.index === QUESTIONS.length - 1;
  const answer = s.answers[q.id];

  useEffect(() => { setWarnEmpty(false); h.current?.focus({ preventScroll: true }); }, [s.index]);

  // Leaving the tab is recorded and the candidate is told.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') logEvent('tab-hidden', `Left the assessment tab on question ${s.index + 1}`);
      else { logEvent('tab-visible', 'Came back to the assessment tab'); setToast('You left this tab. That’s been recorded for the proctoring review.'); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [s.index]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 6000); return () => clearTimeout(t); }, [toast]);

  const set = (a: Answer) => { patch((cur) => ({ answers: { ...cur.answers, [q.id]: a } })); setWarnEmpty(false); };

  const next = () => {
    if (!isAnswered(answer) && !warnEmpty) { setWarnEmpty(true); return; }
    if (last) { setConfirmSubmit(true); return; }
    advance();
  };

  return (
    <div className="cand-wrap cand-wrap--exam">
      <div className="cand-qbar">
        <span className="cand-qbar__count">Question {s.index + 1} of {QUESTIONS.length}</span>
        <span className="cand-qbar__section">{q.section}</span>
        <span className="cand-qbar__track" aria-hidden="true"><span style={{ width: `${(s.index / QUESTIONS.length) * 100}%` }} /></span>
      </div>

      {q.seconds && s.itemDeadline
        ? <ItemTimer key={q.id} total={q.seconds} deadline={s.itemDeadline} n={s.index + 1} onEnd={() => { setToast(`Time ran out on question ${s.index + 1}. ${isAnswered(answer) ? 'Your answer was saved.' : 'It was left unanswered.'}`); advance(true); }} />
        : <p className="cand-untimed">No timer on this question. The assessment clock is still running.</p>}

      <section className="cand-q" aria-labelledby="cand-q-h">
        <h1 id="cand-q-h" ref={h} tabIndex={-1} className="visually-hidden">Question {s.index + 1} of {QUESTIONS.length}: {q.section}</h1>
        {q.context && <p className="cand-q__context">{q.context}</p>}
        <Body q={q} value={answer} onChange={set} />
      </section>

      {warnEmpty && (
        <p className="cand-error" role="alert">
          You haven’t answered this question. You can’t come back to it. {last ? 'Choose Submit again to finish anyway.' : 'Choose Next again to move on without answering.'}
        </p>
      )}
      <div className="cand-actions cand-actions--exam">
        <button type="button" className="btn btn--primary btn--lg" onClick={next}>
          {last ? 'Submit assessment' : warnEmpty ? 'Move on without answering' : 'Next question'}
        </button>
        <span className="cand-muted small">Answers save as you go.</span>
      </div>

      {toast && <div className="cand-toast" role="status">{toast}</div>}

      <Dialog open={confirmSubmit} onClose={() => setConfirmSubmit(false)} title="Submit your assessment?"
        description={<p>You’ve answered {answered(s)} of {QUESTIONS.length} questions. Once you submit, you can’t change anything.</p>}
        footer={<>
          <button type="button" className="btn btn--secondary" onClick={() => setConfirmSubmit(false)} autoFocus>Not yet</button>
          <button type="button" className="btn btn--primary" onClick={() => { setConfirmSubmit(false); submit('candidate'); }}>Submit</button>
        </>} />
    </div>
  );
}

/** Countdown for one question. Announces at 30 and 10 seconds; moves on at zero. */
function ItemTimer({ total, deadline, n, onEnd }: { total: number; deadline: number; n: number; onEnd: () => void }) {
  const now = useNow();
  const left = deadline - now;
  const [said, setSaid] = useState('');
  const fired = useRef(false);
  const warned = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const t of [30, 10]) if (total > t && left <= t * 1000 && left > 0 && !warned.current.has(t)) { warned.current.add(t); setSaid(`${t} seconds left on this question.`); }
    if (left <= 0 && !fired.current) { fired.current = true; onEnd(); }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  const pct = Math.max(0, Math.min(100, (left / (total * 1000)) * 100));
  return (
    <div className={`cand-itimer${left <= 10_000 ? ' is-low' : ''}`}>
      <span className="cand-itimer__label">
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="9" r="5.5" /><path d="M8 6.5V9l1.6 1.2M6.5 2h3" /></svg>
        Timed question · {total < 60 || total % 60 ? `${total} seconds` : `${total / 60} minute${total === 60 ? '' : 's'}`}
      </span>
      <span className="cand-itimer__left"><span aria-hidden="true">{clock(left)}</span><span className="visually-hidden">{spoken(left)} left on question {n}</span></span>
      <span className="cand-itimer__bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
      <span className="visually-hidden" role="status">{said}</span>
    </div>
  );
}

/* ---------- Question bodies ---------- */

function Body({ q, value, onChange }: { q: Question; value?: Answer; onChange: (a: Answer) => void }) {
  switch (q.kind) {
    case 'multi': return <Multi q={q} value={(value as string[]) ?? []} onChange={onChange} />;
    case 'written': return <Written q={q} value={(value as string) ?? ''} onChange={onChange} />;
    case 'numeric': return <Numeric q={q} value={(value as string) ?? ''} onChange={onChange} />;
    case 'order': return <Order q={q} value={value as string[] | undefined} onChange={onChange} />;
    default: return <Single q={q} value={value as string | undefined} onChange={onChange} />;
  }
}

function Options({ name, choices, value, onChange, render }: { name: string; choices: Choice[]; value?: string; onChange: (v: string) => void; render?: (c: Choice) => React.ReactNode }) {
  return (
    <div className={`cand-opts${render ? ' cand-opts--grid' : ''}`}>
      {choices.map((c, i) => (
        <label key={c.id} className={`cand-opt${value === c.id ? ' is-on' : ''}`}>
          <input type="radio" name={name} value={c.id} checked={value === c.id} onChange={() => onChange(c.id)} />
          <span className="cand-opt__key" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
          {render ? render(c) : <span className="cand-opt__text">{c.text}</span>}
        </label>
      ))}
    </div>
  );
}

function Single({ q, value, onChange }: { q: SingleQ; value?: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="cand-stim">
    {q.chart && <div className="cand-chart"><Chart spec={q.chart.spec} title={q.chart.title} /></div>}
    {q.clip && <Clip id={q.id} title={q.clip.title} script={q.clip.script} />}
    {q.kind === 'spatial' && <SpatialSource />}
    <fieldset className="cand-fs">
      <legend className="cand-q__prompt">{q.prompt}</legend>
      <p className="cand-q__how">Choose one.</p>
      <Options name={`${id}-${q.id}`} choices={q.choices} value={value} onChange={onChange}
        render={q.kind === 'spatial' ? (c) => <Shape cells={SPATIAL.options[c.id.charCodeAt(0) - 97]} label={c.text} /> : undefined} />
    </fieldset>
    </div>
  );
}

function Multi({ q, value, onChange }: { q: MultiQ; value: string[]; onChange: (v: string[]) => void }) {
  const full = value.length >= q.pick;
  return (
    <fieldset className="cand-fs">
      <legend className="cand-q__prompt">{q.prompt}</legend>
      <p className="cand-q__how" aria-live="polite">Choose {q.pick}. <span className="cand-muted">{value.length} of {q.pick} chosen.</span></p>
      <div className="cand-opts">
        {q.choices.map((c, i) => {
          const on = value.includes(c.id);
          return (
            <label key={c.id} className={`cand-opt cand-opt--check${on ? ' is-on' : ''}${full && !on ? ' is-off' : ''}`}>
              <input type="checkbox" checked={on} disabled={full && !on}
                onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((x) => x !== c.id))} />
              <span className="cand-opt__key" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
              <span className="cand-opt__text">{c.text}</span>
            </label>
          );
        })}
      </div>
      {full && <p className="cand-muted small">To pick a different one, untick one of your choices first.</p>}
    </fieldset>
  );
}

function Numeric({ q, value, onChange }: { q: NumericQ; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const bad = value.trim() !== '' && Number.isNaN(Number(value));
  return (
    <div className="cand-fs">
      <label className="cand-q__prompt" htmlFor={id}>{q.prompt}</label>
      <div className="cand-num">
        <input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)}
          aria-invalid={bad} aria-describedby={`${id}-u ${bad ? `${id}-e` : ''}`} />
        <span id={`${id}-u`} className="cand-num__unit">{q.unit}</span>
      </div>
      {bad && <p id={`${id}-e`} className="cand-error">Enter a number, like 8 or 7.5.</p>}
      <p className="cand-muted small">You can use the calculator on your own computer for this question.</p>
    </div>
  );
}

function Written({ q, value, onChange }: { q: WrittenQ; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const [pasted, setPasted] = useState(false);
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="cand-fs">
      <label className="cand-q__prompt" htmlFor={id}>{q.prompt}</label>
      <p className="cand-q__how" id={`${id}-h`}>{q.minWords}–{q.maxWords} words. Write in your own words; pasting is turned off.</p>
      <textarea id={id} className="cand-text" rows={9} value={value} aria-describedby={`${id}-h ${id}-c`}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => { e.preventDefault(); setPasted(true); logEvent('paste-blocked', `Tried to paste into question ${QUESTIONS.findIndex((x) => x.id === q.id) + 1}`); }} />
      <p id={`${id}-c`} className={`cand-count${words > q.maxWords ? ' is-over' : ''}`}>
        {words} word{words === 1 ? '' : 's'}{words < q.minWords ? ` · ${q.minWords - words} more to reach the minimum` : words > q.maxWords ? ` · ${words - q.maxWords} over the limit` : ''}
      </p>
      {pasted && <p className="cand-error" role="alert">Pasting isn’t allowed on this question. Please type your answer.</p>}
    </div>
  );
}

/** Put steps in order with buttons, so it works by keyboard and screen reader as well as by eye. */
function Order({ q, value, onChange }: { q: OrderQ; value?: string[]; onChange: (v: string[]) => void }) {
  const start = [2, 0, 3, 1].map((i) => q.steps[i].id);
  const order = value ?? start;
  const [said, setSaid] = useState('');
  const move = (i: number, d: -1 | 1) => {
    const n = [...order];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
    const text = q.steps.find((x) => x.id === n[i + d])!.text;
    setSaid(`${text} moved to position ${i + d + 1} of ${n.length}.`);
    requestAnimationFrame(() => (document.querySelector(`[data-order="${n[i + d]}"][data-d="${d}"]:not(:disabled)`) as HTMLElement | null ?? document.querySelector(`[data-order="${n[i + d]}"]:not(:disabled)`) as HTMLElement | null)?.focus());
  };
  return (
    <div className="cand-fs">
      <p className="cand-q__prompt" id={`${q.id}-p`}>{q.prompt}</p>
      <p className="cand-q__how">Use the arrows to move a step up or down. {value ? '' : 'Your answer is this order once you move anything, or choose Keep this order.'}</p>
      <ol className="cand-order" aria-labelledby={`${q.id}-p`}>
        {order.map((sid, i) => {
          const st = q.steps.find((x) => x.id === sid)!;
          return (
            <li key={sid} className="cand-order__item">
              <span className="cand-order__n" aria-hidden="true">{i + 1}</span>
              <span className="cand-order__text">{st.text}</span>
              <span className="cand-order__btns">
                <button type="button" className="bframe__btn" data-order={sid} data-d={-1} disabled={i === 0} aria-label={`Move up: ${st.text}`} onClick={() => move(i, -1)}>
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 10l4-4 4 4" /></svg>
                </button>
                <button type="button" className="bframe__btn" data-order={sid} data-d={1} disabled={i === order.length - 1} aria-label={`Move down: ${st.text}`} onClick={() => move(i, 1)}>
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      {!value && <button type="button" className="btn btn--secondary" onClick={() => { onChange(order); setSaid('Order kept as your answer.'); }}>Keep this order</button>}
      <span className="visually-hidden" role="status">{said}</span>
    </div>
  );
}

/** Audio played with the browser's speech voice, at most twice, with a transcript for anyone who needs it. */
function Clip({ id, title, script }: { id: string; title: string; script: string }) {
  const MAX = 2;
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const can = typeof window !== 'undefined' && 'speechSynthesis' in window;
  useEffect(() => () => { if (can) window.speechSynthesis.cancel(); }, [can]);
  const play = () => {
    if (!can || plays >= MAX) return;
    const u = new SpeechSynthesisUtterance(script);
    u.rate = 0.95;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setPlaying(true);
    setPlays((p) => p + 1);
    logEvent('audio', `Played the clip on ${id} (${plays + 1} of ${MAX})`);
  };
  return (
    <div className="cand-clip">
      <div className="cand-clip__row">
        <button type="button" className="btn btn--secondary" onClick={play} disabled={!can || plays >= MAX || playing}>
          <svg viewBox="0 0 16 16" aria-hidden="true" className="btn__icon"><path d="M5 3.5v9l7-4.5z" fill="currentColor" stroke="none" /></svg>
          {playing ? 'Playing…' : plays ? 'Play again' : 'Play transmission'}
        </button>
        <span className="cand-clip__title">{title}</span>
        <span className="cand-muted small" aria-live="polite">{plays >= MAX ? 'No plays left' : `${MAX - plays} play${MAX - plays === 1 ? '' : 's'} left`}</span>
      </div>
      {!can && <p className="cand-muted small">Audio isn’t available in this browser. Use the transcript.</p>}
      <button type="button" className="link-button" aria-expanded={transcript} onClick={() => setTranscript(!transcript)}>{transcript ? 'Hide' : 'Show'} transcript</button>
      {transcript && <blockquote className="cand-transcript">{script}</blockquote>}
    </div>
  );
}

const describe = (cells: [number, number][]) => {
  const key = cells.map(([x, y]) => `${x},${y}`).sort().join(' ');
  const map: Record<string, string> = {
    '0,0 0,1 0,2 1,2': 'three squares in a column, with one more square to the right of the bottom square',
    '0,0 0,1 1,0 2,0': 'three squares in a row, with one more square under the left square',
    '0,1 1,1 2,0 2,1': 'three squares in a row, with one more square above the right square',
    '0,0 1,0 1,1 1,2': 'three squares in a column, with one more square to the left of the top square',
    '0,2 1,0 1,1 1,2': 'three squares in a column, with one more square to the left of the bottom square',
  };
  return map[key] ?? `${cells.length} squares`;
};

function Shape({ cells, label }: { cells: [number, number][]; label?: string }) {
  const S = 22;
  return (
    <span className="cand-shape">
      <svg viewBox={`-4 -4 ${3 * S + 8} ${3 * S + 8}`} role="img" aria-label={`${label ? `${label}: ` : ''}${describe(cells)}`}>
        {cells.map(([x, y]) => <rect key={`${x}${y}`} x={x * S} y={y * S} width={S} height={S} className="cand-shape__cell" />)}
      </svg>
      {label && <span className="cand-opt__text">{label}</span>}
    </span>
  );
}

function SpatialSource() {
  return (
    <figure className="cand-spatial">
      <Shape cells={SPATIAL.source} label="Shape" />
      <span className="cand-spatial__turn" aria-hidden="true">↻ ¼ turn</span>
      <figcaption className="visually-hidden">The shape to turn.</figcaption>
    </figure>
  );
}

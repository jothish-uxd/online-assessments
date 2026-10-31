import { useId, useMemo, useRef, useState } from 'react';
import { AlertIcon, CheckIcon, CloseIcon } from '../../../../components/content/icons';
import { now } from '../../../../data/content/store';
import { checkR, type RResult } from '../../../../data/content/scoring';
import { addScore, knownScores, newId, replaceScore } from '../../../../data/content/workflows';
import type { Module, RScore, Workflow } from '../../../../data/content/types';

interface Props { w: Workflow; modules: Module[]; replacing?: RScore; onDone: (id?: string) => void }

/** A sample formula built from this workflow's own input scores, and a copy with typical mistakes. */
function samples(inputs: string[], taken: string[]) {
  const scaled = inputs.filter((n) => n.endsWith('_scaled'));
  if (!scaled.length) return null;
  const [a, b = a] = scaled;
  const base = (taken.includes('sample_comp') ? 'sample_comp_2' : 'sample_comp');
  const good = [
    '# Sample composite: weights two module scores, standardises, then recommends',
    `${base} <- 0.6 * ${a} +`,
    `    0.4 * ${b};`,
    '',
    `z_${base} <- (${base} - 0.5) / 0.2;`,
    '',
    `${base}_result <- if (z_${base} < -1) {`,
    '  "Not recommended"',
    `} else if (z_${base} < 1) {`,
    '  "Recommended"',
    '} else {',
    '  "Strongly recommended"',
    '};',
    '',
  ].join('\n');
  const bad = good
    .replace(`0.6 * ${a}`, `(0.6 ** ${a}d`)
    .replace(`0.4 * ${b};`, `0.4 * ${b}`)
    .replace(`(${base} - 0.5)`, `(${base} - 0.5]`);
  return { good, bad };
}

/** Paste or replace an R formula: check it, preview what it creates, then add it. */
export default function REditor({ w, modules, replacing, onDone }: Props) {
  const id = useId();
  const [text, setText] = useState(replacing?.formula ?? '');
  const [result, setResult] = useState<(RResult & { for: string }) | null>(null);
  const [preview, setPreview] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const hl = useRef<HTMLDivElement>(null);
  const known = knownScores(w, modules, replacing?.id);
  const sample = samples(known.inputs, known.outputs);
  // Names another score already produces can't be produced again.
  const clashes = (r: RResult) => r.outputs.filter((o) => known.outputs.includes(o.name)).map((o) => o.name);

  const run = () => {
    const r = checkR(text, known.all);
    const clash = clashes(r);
    const errors = [...r.errors, ...clash.map((n) => {
      const at = text.indexOf(n);
      return { start: at, end: at + n.length, token: n, message: 'Another workflow score already has this name' };
    })].sort((a, b) => a.start - b.start);
    const out = { ...r, errors, for: text };
    setResult(out);
    return out;
  };
  const stale = result && result.for !== text;
  const clean = result && !stale && result.errors.length === 0;

  const jump = (start: number, end: number) => {
    const el = ta.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(start, Math.max(end, start + 1));
  };

  // Highlight layer: the same text, with each error range marked.
  const marks = useMemo(() => {
    if (!result || stale || !result.errors.length) return null;
    const parts: (string | JSX.Element)[] = [];
    let at = 0;
    result.errors.forEach((e, i) => {
      const s = Math.max(e.start, at);
      const end = Math.min(Math.max(e.end, e.start + 1), text.length + 1);
      if (s > at) parts.push(text.slice(at, s));
      parts.push(<mark key={i}>{text.slice(s, end) || ' '}</mark>);
      at = Math.max(at, end);
    });
    parts.push(text.slice(at) + '\n');
    return parts;
  }, [result, stale, text]);

  const add = () => {
    const r = clean ? result! : run();
    if (r.errors.length) return;
    const stamp = now();
    const keep = (name: string) => replacing?.outputs.find((o) => o.name === name);
    const outputs = r.outputs.map((o) => ({ ...o, pc: keep(o.name)?.pc ?? false, sendToAts: keep(o.name)?.sendToAts ?? true }));
    if (replacing) {
      replaceScore(w.id, { ...replacing, formula: text, outputs, edited: stamp }, 'Replaced the R formula');
      onDone(replacing.id);
    } else {
      const count = w.scoring.scores.filter((s) => s.kind === 'r').length;
      const score: RScore = { id: newId('sc'), kind: 'r', name: count ? `R formula ${count + 1}` : 'R formula', formula: text, outputs, variationId: null, created: stamp, edited: stamp };
      addScore(w.id, score, 'Added an R formula');
      onDone(score.id);
    }
  };

  return (
    <div className="score-form">
      <div className="score-form__head">
        <h3 className="score-form__title" tabIndex={-1} data-pane-heading>{replacing ? 'Replace R formula' : 'R formula'}</h3>
        {!replacing && !preview && (sample ? (
          <p className="muted small">
            For a quick look: <button type="button" className="link-button" onClick={() => { setText(sample.good); setResult(null); setPreview(false); }}>use a sample formula</button>
            {' '}or <button type="button" className="link-button" onClick={() => { setText(sample.bad); setResult(null); setPreview(false); }}>one with errors</button>. Both use this workflow’s input scores.
          </p>
        ) : (
          <p className="muted small">Add an evaluation module on the Builder graph first; formulas are built from module scores.</p>
        ))}
      </div>

      {!preview ? (
        <>
          <div className="field">
            <div className="code-label">
              <label className="field__label" htmlFor={`${id}-f`}>R formula <span aria-hidden="true" className="req">*</span></label>
              <span className="field-help" id={`${id}-rules`}>Statements end with ; · round brackets only · spell operators out (*, not **)</span>
            </div>
            <div className={`code${result && !stale && result.errors.length ? ' is-invalid' : ''}`}>
              <div ref={hl} className="code__hl" aria-hidden="true">{marks}</div>
              <textarea
                ref={ta} id={`${id}-f`} className="code__ta" spellCheck={false} rows={18} value={text}
                aria-invalid={!!(result && !stale && result.errors.length)}
                aria-describedby={`${id}-rules ${result && !stale ? `${id}-result` : ''}`}
                placeholder={'score_name <- 0.5 * module_scaled + 0.5 * other_scaled;'}
                onChange={(e) => { setText(e.target.value); }}
                onScroll={(e) => { if (hl.current) { hl.current.scrollTop = e.currentTarget.scrollTop; hl.current.scrollLeft = e.currentTarget.scrollLeft; } }}
              />
            </div>
          </div>

          {result && !stale && (
            result.errors.length ? (
              <div id={`${id}-result`} className="check-result check-result--bad" role="alert">
                <div className="check-result__bar">
                  <p className="check-result__head"><AlertIcon /> {result.errors.length} error{result.errors.length === 1 ? '' : 's'} found in the R formula.</p>
                  <button type="button" className="bframe__btn" aria-label="Dismiss" onClick={() => setResult(null)}><CloseIcon /></button>
                </div>
                <ul>
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      <button type="button" className="link-button" onClick={() => jump(e.start, e.end)}>
                        <code>{e.token || '(empty)'}</code> — {e.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div id={`${id}-result`} className="check-result check-result--ok" role="status">
                <div className="check-result__bar">
                  <p className="check-result__head"><CheckIcon /> No errors found. It creates {result.outputs.length} output score{result.outputs.length === 1 ? '' : 's'} from {result.inputsUsed.length} input score{result.inputsUsed.length === 1 ? '' : 's'}.</p>
                  <button type="button" className="bframe__btn" aria-label="Dismiss" onClick={() => setResult(null)}><CloseIcon /></button>
                </div>
              </div>
            )
          )}

          <div className="score-form__foot">
            <button type="button" className="link-button" onClick={() => onDone(replacing?.id)}>Cancel</button>
            <button type="button" className="btn btn--secondary" onClick={run}>Check for errors</button>
            <button type="button" className="btn btn--primary" aria-disabled={!clean || undefined}
              aria-describedby={!clean ? `${id}-why` : undefined}
              onClick={() => { const r = clean ? result! : run(); if (!r.errors.length) setPreview(true); }}>Preview</button>
            {!clean && <span id={`${id}-why`} className="visually-hidden">Check the formula for errors first.</span>}
          </div>
        </>
      ) : (
        <>
          <p className="muted">Here’s what the formula will do. Nothing is saved until you {replacing ? 'replace it' : 'add it'}.</p>
          <div className="preview-grid">
            <section aria-labelledby={`${id}-out`}>
              <h4 id={`${id}-out`} className="detail__h3">Creates {result!.outputs.length} output score{result!.outputs.length === 1 ? '' : 's'}</h4>
              <ol className="preview-list">
                {result!.outputs.map((o) => (
                  <li key={o.name}><code>{o.name}</code> <span className="tag">{o.type}</span>
                    {replacing && !replacing.outputs.some((x) => x.name === o.name) && <span className="tag tag--gap">New</span>}</li>
                ))}
              </ol>
              {replacing && replacing.outputs.filter((o) => !result!.outputs.some((x) => x.name === o.name)).length > 0 && (
                <p className="gap-text small"><AlertIcon /> No longer created: {replacing.outputs.filter((o) => !result!.outputs.some((x) => x.name === o.name)).map((o) => o.name).join(', ')}</p>
              )}
            </section>
            <section aria-labelledby={`${id}-in`}>
              <h4 id={`${id}-in`} className="detail__h3">From {result!.inputsUsed.length} input score{result!.inputsUsed.length === 1 ? '' : 's'}</h4>
              <ul className="preview-list">{result!.inputsUsed.map((n) => <li key={n}><code>{n}</code></li>)}</ul>
            </section>
          </div>
          <div className="score-form__foot">
            <button type="button" className="link-button" onClick={() => setPreview(false)}>Back to the formula</button>
            <button type="button" className="btn btn--primary" onClick={add}>{replacing ? 'Replace formula' : 'Add R formula'}</button>
          </div>
        </>
      )}
    </div>
  );
}

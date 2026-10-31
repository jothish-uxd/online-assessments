import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

const BackIcon = () => <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>;
import { useModules } from '../../../../data/content/store';
import { checkR, inputsFor } from '../../../../data/content/scoring';
import { knownScores, removeScore, replaceScore } from '../../../../data/content/workflows';
import { person } from '../../../../data/content/people';
import { when } from '../../../../data/content/format';
import type { ROutput, RScore, Workflow } from '../../../../data/content/types';
import Pager, { usePage } from './Pager';

type View = 'formula' | 'inputs' | 'outputs';
const VIEWS: { id: View; label: string }[] = [
  { id: 'formula', label: 'Formula' }, { id: 'inputs', label: 'Input scores' }, { id: 'outputs', label: 'Output scores' },
];

/** A saved R formula: the formula, the input scores it reads, and the output scores it creates. */
export default function RView({ w, score, editable, onReplace }: { w: Workflow; score: RScore; editable: boolean; onReplace: () => void }) {
  const id = useId();
  const modules = useModules();
  const [view, setView] = useState<View>('formula');
  const [openOutput, setOpenOutput] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const inputs = inputsFor(w.steps, modules);
  const check = checkR(score.formula, knownScores(w, modules, score.id).all);
  const used = check.inputsUsed.map((n) => inputs.find((x) => x.name === n)!).filter(Boolean);

  const onKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === 'ArrowRight' ? (i + 1) % 3 : e.key === 'ArrowLeft' ? (i + 2) % 3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : -1;
    if (next < 0) return;
    e.preventDefault();
    setView(VIEWS[next].id);
    tabs.current[next]?.focus();
  };

  if (openOutput) {
    const o = score.outputs.find((x) => x.name === openOutput);
    if (o) return <OutputDetail w={w} score={score} output={o} editable={editable} onBack={() => setOpenOutput(null)} />;
  }

  return (
    <div className="score-form">
      <div className="score-form__head score-form__head--row">
        <div>
          <h3 className="score-form__title" tabIndex={-1} data-pane-heading>{score.name}</h3>
          <p className="muted small">
            Formula entered by {person(score.created.by).name} on <time dateTime={score.created.at}>{when(score.created.at, true)}</time>
            {score.edited.at !== score.created.at && <> · replaced by {person(score.edited.by).name}, <time dateTime={score.edited.at}>{when(score.edited.at, true)}</time></>}
          </p>
        </div>
        {editable && <button type="button" className="btn btn--secondary btn--sm" onClick={onReplace}>Replace R formula</button>}
      </div>

      {check.errors.length > 0 && (
        <p className="gap-text small">
          {check.errors.length} error{check.errors.length === 1 ? '' : 's'} since the workflow changed, for example {check.errors[0].token}: {check.errors[0].message}. Replace the formula to fix {check.errors.length === 1 ? 'it' : 'them'}.
        </p>
      )}

      <div className="seg-tabs" role="tablist" aria-label="R formula views">
        {VIEWS.map((v, i) => (
          <button key={v.id} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab" id={`${id}-t-${v.id}`}
            aria-selected={view === v.id} aria-controls={`${id}-p`} tabIndex={view === v.id ? 0 : -1}
            className="seg-tabs__tab" onClick={() => setView(v.id)} onKeyDown={(e) => onKey(e, i)}>{v.label}</button>
        ))}
      </div>

      <div role="tabpanel" id={`${id}-p`} aria-labelledby={`${id}-t-${view}`} className="seg-panel">
        {view === 'formula' && (
          <>
            <h4 className="detail__h3">Formula</h4>
            <pre className="code-view" tabIndex={0} aria-label="R formula"><code>{score.formula}</code></pre>
          </>
        )}
        {view === 'inputs' && <Inputs rows={used} />}
        {view === 'outputs' && <Outputs w={w} score={score} editable={editable} onOpen={setOpenOutput} />}
      </div>

      {editable && (
        <div className="score-form__foot score-form__foot--start">
          <button type="button" className="link-button" onClick={() => setConfirmDelete(true)}>Delete R formula</button>
        </div>
      )}
      {confirmDelete && (
        <div className="inline-confirm" role="alert">
          <p><strong>Delete this R formula?</strong> Its {score.outputs.length} output scores go with it.</p>
          <div className="form-actions">
            <button type="button" className="btn btn--danger btn--sm" onClick={() => removeScore(w.id, score.id, 'Deleted the R formula')}>Delete</button>
            <button type="button" className="btn btn--secondary btn--sm" autoFocus onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Inputs({ rows }: { rows: { name: string; source: string; type: string }[] }) {
  const [asc, setAsc] = useState(true);
  const sorted = [...rows].sort((a, b) => (asc ? 1 : -1) * a.name.localeCompare(b.name));
  const { page, setPage, pages, slice } = usePage(sorted, 10);
  return (
    <>
      <h4 className="detail__h3">Input scores</h4>
      <div className="table-wrap">
        <table className="table table--compact">
          <caption className="visually-hidden">Input scores the formula reads</caption>
          <thead>
            <tr>
              <th scope="col" aria-sort={asc ? 'ascending' : 'descending'}>
                <button type="button" className="sort-btn" onClick={() => setAsc((a) => !a)}>
                  Score <span aria-hidden="true">{asc ? '↑' : '↓'}</span><span className="visually-hidden">, sorted {asc ? 'A to Z' : 'Z to A'}. Change order</span>
                </button>
              </th>
              <th scope="col">Source</th>
              <th scope="col">Type</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => <tr key={r.name}><th scope="row" className="mono">{r.name}</th><td>{r.source}</td><td><span className="tag">{r.type}</span></td></tr>)}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} total={rows.length} size={10} onPage={setPage} />
    </>
  );
}

function Outputs({ w, score, editable, onOpen }: { w: Workflow; score: RScore; editable: boolean; onOpen: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ROutput[]>(score.outputs);
  const { page, setPage, pages, slice } = usePage(editing ? draft : score.outputs, 10);
  const set = (name: string, p: Partial<ROutput>) => setDraft((d) => d.map((o) => (o.name === name ? { ...o, ...p } : o)));
  const save = () => { replaceScore(w.id, { ...score, outputs: draft }, 'Changed output score settings'); setEditing(false); };

  return (
    <>
      <div className="section-head">
        <h4 className="detail__h3">Output scores</h4>
        {editable && !editing && <button type="button" className="link-button" onClick={() => { setDraft(score.outputs); setEditing(true); }}>Edit</button>}
      </div>
      <div className="table-wrap">
        <table className="table table--compact out-table">
          <caption className="visually-hidden">Output scores the formula creates</caption>
          <thead><tr><th scope="col">Score</th><th scope="col" className="center">PC score</th><th scope="col" className="center">Send to ATS</th></tr></thead>
          <tbody>
            {slice.map((o) => (
              <tr key={o.name}>
                <th scope="row">
                  <button type="button" className="row-link link-button--plain mono" onClick={() => onOpen(o.name)}>{o.name}</button>
                  <span className="cell-sub">{o.type}</span>
                </th>
                <td className="center"><input type="checkbox" checked={o.pc} disabled={!editing} aria-label={`${o.name} is a PC score`} onChange={(e) => set(o.name, { pc: e.target.checked })} /></td>
                <td className="center"><input type="checkbox" checked={o.sendToAts} disabled={!editing} aria-label={`Send ${o.name} to the ATS`} onChange={(e) => set(o.name, { sendToAts: e.target.checked })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} total={score.outputs.length} size={10} onPage={setPage} />
      {editing && (
        <div className="score-form__foot">
          <button type="button" className="link-button" onClick={() => setEditing(false)}>Cancel</button>
          <button type="button" className="btn btn--primary" onClick={save}>Save</button>
        </div>
      )}
    </>
  );
}

function OutputDetail({ w, score, output, editable, onBack }: { w: Workflow; score: RScore; output: ROutput; editable: boolean; onBack: () => void }) {
  const id = useId();
  const [pc, setPc] = useState(output.pc);
  const [ats, setAts] = useState(output.sendToAts);
  const [said, setSaid] = useState('');
  const dirty = pc !== output.pc || ats !== output.sendToAts;
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { head.current?.focus(); }, []);
  const definition = (() => {
    const lines = score.formula.split('\n');
    const start = lines.findIndex((l) => l.trimStart().startsWith(`${output.name} <-`));
    if (start < 0) return '';
    const out: string[] = [];
    for (let i = start; i < lines.length; i++) {
      out.push(lines[i]);
      if (/;\s*$/.test(lines[i])) break;
    }
    return out.join('\n');
  })();

  return (
    <div className="score-form">
      <button type="button" className="back-link link-button--plain" onClick={onBack}><BackIcon /> {score.name}: output scores</button>
      <h3 className="score-form__title mono" tabIndex={-1} data-pane-heading ref={head}>{output.name}</h3>
      <fieldset disabled={!editable} className="plain-fieldset score-form__body">
        <legend className="visually-hidden">Output score settings</legend>
        <div className="score-form__row">
          <div className="field field--grow">
            <span className="field__label">Workflow score name</span>
            <span className="field__static mono">{output.name}</span>
            <span className="field-help">Set by the R formula. Replace the formula to rename it.</span>
          </div>
          <label className="check score-form__check"><input type="checkbox" checked={pc} onChange={(e) => setPc(e.target.checked)} /> Personal Competency (PC)</label>
        </div>
        <div className="score-form__row">
          <div className="field">
            <span className="field__label">Score type</span>
            <span className="field__static field__static--off">{output.type}</span>
          </div>
          <label className="check score-form__check"><input type="checkbox" checked={ats} onChange={(e) => setAts(e.target.checked)} /> Send to ATS</label>
        </div>
        {definition && (
          <div className="field">
            <span className="field__label" id={`${id}-def`}>Defined as</span>
            <pre className="code-view code-view--short" aria-labelledby={`${id}-def`} tabIndex={0}><code>{definition}</code></pre>
          </div>
        )}
      </fieldset>
      {editable && (
        <div className="score-form__foot">
          <span className="save-state" role="status">{said}</span>
          <button type="button" className="link-button" onClick={onBack}>Cancel</button>
          <button type="button" className="btn btn--primary" disabled={!dirty} onClick={() => {
            replaceScore(w.id, { ...score, outputs: score.outputs.map((o) => (o.name === output.name ? { ...o, pc, sendToAts: ats } : o)) }, `Changed ${output.name}`);
            setSaid('Saved.');
          }}>Save</button>
        </div>
      )}
    </div>
  );
}

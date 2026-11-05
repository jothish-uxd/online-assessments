import { useId, useMemo, useState } from 'react';
import { Select } from '@jothish-uxd/enterprise-library';
import { AlertIcon, CheckIcon, CopyIcon, PlusIcon, TrashIcon } from '../../../../components/content/icons';
import { Byline } from '../../../../components/content/Byline';
import { now } from '../../../../data/content/store';
import { checkScratch, outputsOf, type FieldError } from '../../../../data/content/scoring';
import { addScore, knownScores, newId, removeScore, replaceScore } from '../../../../data/content/workflows';
import type { Expression, Mapping, Module, Operand, ScratchScore, Workflow } from '../../../../data/content/types';
import { TYPE_TEXT } from './CompositeScores';

interface Props { w: Workflow; modules: Module[]; score?: ScratchScore; editable: boolean; onDone: (id?: string) => void }

const OPERANDS: { value: Operand; label: string }[] = [
  { value: '=', label: '=' }, { value: '!=', label: '≠' }, { value: '>', label: '>' },
  { value: '>=', label: '≥' }, { value: '<', label: '<' }, { value: '<=', label: '≤' },
];
const expr = (join: Expression['join'] = 'AND'): Expression => ({ id: newId('x'), join, condition: '', operand: '', value: '' });
const mapping = (): Mapping => ({ id: newId('m'), reference: '', expressions: [expr(), expr()] });

function blank(): ScratchScore {
  const stamp = now();
  return {
    id: newId('sc'), kind: 'scratch', name: '', pc: false, sendToAts: false, type: 'conditional', mode: 'reference',
    mappings: [mapping()], bandSource: '', bands: [], reference: '', weights: [], variationId: null, created: stamp, edited: stamp,
  };
}

/** Create or edit a score from scratch: conditional (reference mappings or bands), reference, or weighted sum. */
export default function ScratchEditor({ w, modules, score, editable, onDone }: Props) {
  const id = useId();
  const f = (field: string) => `${id}-${field}`;
  const isNew = !score;
  const [d, setD] = useState<ScratchScore>(() => score ? structuredClone(score) : blank());
  const [errors, setErrors] = useState<FieldError[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [said, setSaid] = useState('');

  const known = knownScores(w, modules, d.id);
  const taken = w.scoring.scores.filter((x) => x.id !== d.id).flatMap(outputsOf);
  const options = useMemo(() => [
    ...known.inputs.map((n) => ({ value: n, label: n })),
    ...known.outputs.map((n) => ({ value: n, label: `${n} (workflow score)` })),
  ], [known.inputs.join(), known.outputs.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = isNew || JSON.stringify(d) !== JSON.stringify(score);
  const errFor = (field: string) => errors?.find((e) => e.field === field);
  const set = (p: Partial<ScratchScore>) => { setD((x) => ({ ...x, ...p })); setSaid(''); };
  const setMap = (mid: string, p: Partial<Mapping>) => set({ mappings: d.mappings.map((m) => (m.id === mid ? { ...m, ...p } : m)) });
  const setExpr = (mid: string, xid: string, p: Partial<Expression>) =>
    setMap(mid, { expressions: d.mappings.find((m) => m.id === mid)!.expressions.map((x) => (x.id === xid ? { ...x, ...p } : x)) });

  const check = () => {
    const e = checkScratch(d, taken, known.all);
    setErrors(e);
    setSaid(e.length ? `${e.length} error${e.length === 1 ? '' : 's'} found.` : 'No errors found.');
    return e;
  };
  const save = () => {
    if (check().length) { requestAnimationFrame(() => document.getElementById(`${id}-summary`)?.focus()); return; }
    const out = { ...d, edited: now() };
    if (isNew) { addScore(w.id, out, `Added score ${d.name}`); onDone(d.id); }
    else { replaceScore(w.id, out, `Edited score ${d.name}`); setSaid('Saved.'); }
  };
  const fix = (field: string) => (document.getElementById(f(field)) as HTMLElement | null)?.focus();

  const variationOptions = [{ value: '', label: 'Everyone' }, ...w.scoring.variations.map((v) => ({ value: v.id, label: v.name }))];

  return (
    <form className="score-form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="score-form__head">
        <h3 className="score-form__title" tabIndex={-1} data-pane-heading>{d.name || (isNew ? 'New score' : 'Untitled score')}</h3>
        {!isNew && <p className="muted small">Created by <Byline stamp={d.created} time /> · Last edited by <Byline stamp={d.edited} time /></p>}
      </div>

      <fieldset disabled={!editable} className="plain-fieldset score-form__body">
        <legend className="visually-hidden">Score settings</legend>
        <div className="score-form__row">
          <div className="field field--grow">
            <label className="field__label" htmlFor={f('name')}>Workflow score name <span aria-hidden="true" className="req">*</span></label>
            <input id={f('name')} className="mono-input" value={d.name} onChange={(e) => set({ name: e.target.value.replace(/\s/g, '_') })}
              aria-invalid={!!errFor('name')} aria-describedby={errFor('name') ? `${f('name')}-e` : `${f('name')}-h`} placeholder="for_example_total_score" />
            {errFor('name') ? <span id={`${f('name')}-e`} className="field-error-text"><AlertIcon /> {errFor('name')!.message}</span>
              : <span id={`${f('name')}-h`} className="field-help">Letters, numbers and underscores. Formulas refer to it by this name.</span>}
          </div>
          <label className="check score-form__check">
            <input type="checkbox" checked={d.pc} onChange={(e) => set({ pc: e.target.checked })} /> Personal Competency (PC)
          </label>
        </div>

        <div className="score-form__row">
          <Select label="Score type" value={d.type} buttonId={f('type')}
            options={(['conditional', 'reference', 'weighted'] as const).map((t) => ({ value: t, label: TYPE_TEXT[t] }))}
            onChange={(t) => set({ type: t, ...(t === 'weighted' && !d.weights.length ? { weights: [{ id: newId('w'), input: '', weight: '' }] } : {}) })} />
          <label className="check score-form__check">
            <input type="checkbox" checked={d.sendToAts} onChange={(e) => set({ sendToAts: e.target.checked })} /> Send to ATS
          </label>
          {w.scoring.variations.length > 0 && (
            <Select label="Applies to" value={d.variationId ?? ''} options={variationOptions} onChange={(v) => set({ variationId: v || null })} />
          )}
        </div>

        {d.type === 'conditional' && (
          <fieldset className="radio-row">
            <legend className="visually-hidden">How the score is decided</legend>
            <label className="check"><input type="radio" name={f('mode')} checked={d.mode === 'band'}
              onChange={() => set({ mode: 'band', bands: d.bands.length ? d.bands : [{ id: newId('b'), min: '', max: '', label: '' }, { id: newId('b'), min: '', max: '', label: '' }] })} /> Build scoring band</label>
            <label className="check"><input type="radio" name={f('mode')} checked={d.mode === 'reference'}
              onChange={() => set({ mode: 'reference', mappings: d.mappings.length ? d.mappings : [mapping()] })} /> Use reference score</label>
          </fieldset>
        )}

        {/* Conditional: reference mappings */}
        {d.type === 'conditional' && d.mode === 'reference' && (
          <div className="mappings">
            <p className="field-help">Mappings are tried in order. The first one whose conditions all hold sets the score.</p>
            {d.mappings.map((m, mi) => (
              <fieldset key={m.id} className="mapping">
                <legend className="mapping__title">Score mapping {mi + 1}</legend>
                {editable && (
                  <div className="mapping__actions">
                    <button type="button" className="link-button" onClick={() => {
                      const copy = { ...structuredClone(m), id: newId('m'), expressions: m.expressions.map((x) => ({ ...x, id: newId('x') })) };
                      const list = [...d.mappings]; list.splice(mi + 1, 0, copy); set({ mappings: list }); setSaid(`Duplicated as mapping ${mi + 2}.`);
                    }}><CopyIcon /> Duplicate mapping <span className="visually-hidden">{mi + 1}</span></button>
                    <button type="button" className="link-button" disabled={d.mappings.length === 1}
                      onClick={() => { set({ mappings: d.mappings.filter((x) => x.id !== m.id) }); setSaid(`Deleted mapping ${mi + 1}.`); }}>
                      <TrashIcon /> Delete mapping <span className="visually-hidden">{mi + 1}</span></button>
                  </div>
                )}
                <Select label="Reference score" value={m.reference} options={options} placeholder="Select an option"
                  buttonId={f(`m-${m.id}-ref`)} invalid={!!errFor(`m-${m.id}-ref`)} className="mapping__ref"
                  onChange={(v) => setMap(m.id, { reference: v })} />
                <div className="exprs" role="group" aria-label={`Conditions for mapping ${mi + 1}`}>
                  <div className="exprs__head" aria-hidden="true"><span /><span>Condition</span><span>Operand</span><span>Value</span><span /></div>
                  {m.expressions.map((x, xi) => (
                    <div key={x.id} className="expr">
                      {xi === 0 ? <span className="expr__join expr__join--if">IF</span> : (
                        <Select label={`Join for line ${xi + 1}`} hideLabel value={x.join} options={[{ value: 'AND', label: 'AND' }, { value: 'OR', label: 'OR' }]}
                          onChange={(v) => setExpr(m.id, x.id, { join: v })} className="expr__join" />
                      )}
                      <Select label={`Condition, line ${xi + 1}`} hideLabel value={x.condition} options={options} placeholder="Choose a score"
                        buttonId={f(`x-${x.id}-cond`)} invalid={!!errFor(`x-${x.id}-cond`)} onChange={(v) => setExpr(m.id, x.id, { condition: v })} />
                      <Select label={`Operand, line ${xi + 1}`} hideLabel value={x.operand} options={OPERANDS} placeholder="–"
                        buttonId={f(`x-${x.id}-op`)} invalid={!!errFor(`x-${x.id}-op`)} onChange={(v) => setExpr(m.id, x.id, { operand: v })} />
                      <input id={f(`x-${x.id}-val`)} aria-label={`Value, line ${xi + 1}`} value={x.value} placeholder="0.5 or TRUE"
                        aria-invalid={!!errFor(`x-${x.id}-val`)} onChange={(e) => setExpr(m.id, x.id, { value: e.target.value })} />
                      {editable && (
                        <button type="button" className="bframe__btn" aria-label={`Delete line ${xi + 1}`} disabled={m.expressions.length === 1}
                          onClick={() => setMap(m.id, { expressions: m.expressions.filter((y) => y.id !== x.id) })}><TrashIcon /></button>
                      )}
                    </div>
                  ))}
                  {editable && (
                    <button type="button" className="link-button add-link" onClick={() => setMap(m.id, { expressions: [...m.expressions, expr()] })}>
                      <PlusIcon /> Add expression
                    </button>
                  )}
                </div>
              </fieldset>
            ))}
            {editable && (
              <button type="button" className="link-button add-link" onClick={() => set({ mappings: [...d.mappings, mapping()] })}>
                <PlusIcon /> Add new score mapping
              </button>
            )}
          </div>
        )}

        {/* Conditional: bands */}
        {d.type === 'conditional' && d.mode === 'band' && (
          <div className="bands">
            <Select label="Score to band" value={d.bandSource} options={options} placeholder="Select an option"
              buttonId={f('bandSource')} invalid={!!errFor('bandSource')} onChange={(v) => set({ bandSource: v })} />
            <p className="field-help">Each band covers from its lower limit (included) up to its upper limit (not included). Leave a limit empty for no limit.</p>
            <div className="band-table" role="group" aria-label="Bands">
              <div className="band band--head" aria-hidden="true"><span>From</span><span>Up to</span><span>Label</span><span /></div>
              {d.bands.map((b, i) => (
                <div key={b.id} className="band">
                  <input id={f(`b-${b.id}-min`)} aria-label={`Band ${i + 1}, from`} inputMode="decimal" value={b.min} placeholder="no limit"
                    aria-invalid={!!errFor(`b-${b.id}-min`)} onChange={(e) => set({ bands: d.bands.map((x) => (x.id === b.id ? { ...x, min: e.target.value } : x)) })} />
                  <input aria-label={`Band ${i + 1}, up to`} inputMode="decimal" value={b.max} placeholder="no limit"
                    onChange={(e) => set({ bands: d.bands.map((x) => (x.id === b.id ? { ...x, max: e.target.value } : x)) })} />
                  <input id={f(`b-${b.id}-label`)} aria-label={`Band ${i + 1}, label`} value={b.label} placeholder="Recommended"
                    aria-invalid={!!errFor(`b-${b.id}-label`)} onChange={(e) => set({ bands: d.bands.map((x) => (x.id === b.id ? { ...x, label: e.target.value } : x)) })} />
                  {editable && <button type="button" className="bframe__btn" aria-label={`Delete band ${i + 1}`} disabled={d.bands.length <= 1}
                    onClick={() => set({ bands: d.bands.filter((x) => x.id !== b.id) })}><TrashIcon /></button>}
                </div>
              ))}
            </div>
            {editable && <button type="button" className="link-button add-link" onClick={() => set({ bands: [...d.bands, { id: newId('b'), min: d.bands[d.bands.length - 1]?.max ?? '', max: '', label: '' }] })}><PlusIcon /> Add band</button>}
          </div>
        )}

        {d.type === 'reference' && (
          <Select label="Reference score" value={d.reference} options={options} placeholder="Select an option"
            buttonId={f('reference')} invalid={!!errFor('reference')} onChange={(v) => set({ reference: v })} className="select--wide" />
        )}

        {d.type === 'weighted' && (
          <div className="bands">
            <div className="band-table" role="group" aria-label="Weighted scores">
              <div className="band band--weights band--head" aria-hidden="true"><span>Score</span><span>Weight</span><span /></div>
              {d.weights.map((x, i) => (
                <div key={x.id} className="band band--weights">
                  <Select label={`Score ${i + 1}`} hideLabel value={x.input} options={options} placeholder="Choose a score"
                    buttonId={f(`w-${x.id}-input`)} invalid={!!errFor(`w-${x.id}-input`)}
                    onChange={(v) => set({ weights: d.weights.map((y) => (y.id === x.id ? { ...y, input: v } : y)) })} />
                  <input id={f(`w-${x.id}-weight`)} aria-label={`Weight ${i + 1}`} inputMode="decimal" value={x.weight} placeholder="0.25"
                    aria-invalid={!!errFor(`w-${x.id}-weight`)} onChange={(e) => set({ weights: d.weights.map((y) => (y.id === x.id ? { ...y, weight: e.target.value } : y)) })} />
                  {editable && <button type="button" className="bframe__btn" aria-label={`Delete row ${i + 1}`} disabled={d.weights.length <= 1}
                    onClick={() => set({ weights: d.weights.filter((y) => y.id !== x.id) })}><TrashIcon /></button>}
                </div>
              ))}
            </div>
            <p className="field-help">
              Weights add up to {d.weights.reduce((s, x) => s + (Number(x.weight) || 0), 0).toFixed(2)}
              {Math.abs(d.weights.reduce((s, x) => s + (Number(x.weight) || 0), 0) - 1) > 0.001 ? '. Most weighted sums add up to 1.' : '.'}
            </p>
            {editable && <button type="button" className="link-button add-link" onClick={() => set({ weights: [...d.weights, { id: newId('w'), input: '', weight: '' }] })}><PlusIcon /> Add score</button>}
          </div>
        )}
      </fieldset>

      {errors && (
        errors.length ? (
          <div id={`${id}-summary`} className="check-result check-result--bad" tabIndex={-1}>
            <p className="check-result__head"><AlertIcon /> {errors.length} error{errors.length === 1 ? '' : 's'} found</p>
            <ul>{errors.map((e, i) => <li key={i}><button type="button" className="link-button" onClick={() => fix(e.field)}>{e.message}</button></li>)}</ul>
          </div>
        ) : (
          <div className="check-result check-result--ok"><p className="check-result__head"><CheckIcon /> No errors found.</p></div>
        )
      )}

      {editable && (
        <div className="score-form__foot">
          {!isNew && <button type="button" className="link-button score-form__delete" onClick={() => setConfirmDelete(true)}>Delete score</button>}
          <span className="save-state" role="status">{said}</span>
          {isNew ? <button type="button" className="link-button" onClick={() => onDone()}>Cancel</button>
            : dirty && <button type="button" className="link-button" onClick={() => { setD(structuredClone(score!)); setErrors(null); setSaid('Changes discarded.'); }}>Cancel</button>}
          <button type="button" className="btn btn--secondary" onClick={check}>Check for errors</button>
          <button type="submit" className="btn btn--primary" disabled={!dirty}>{isNew ? 'Add score' : 'Save changes'}</button>
        </div>
      )}

      {confirmDelete && score && (
        <div className="inline-confirm" role="alert">
          <p><strong>Delete {score.name}?</strong> Formulas and conditions that use it will show errors.</p>
          <div className="form-actions">
            <button type="button" className="btn btn--danger btn--sm" onClick={() => { removeScore(w.id, score.id, `Deleted score ${score.name}`); }}>Delete score</button>
            <button type="button" className="btn btn--secondary btn--sm" autoFocus onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </div>
      )}
    </form>
  );
}

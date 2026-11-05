import { useId, useState } from 'react';
import { Select } from '@jothish-uxd/enterprise-library';
import Dialog from '../../../../components/content/Dialog';
import { AlertIcon, CloseIcon, PlusIcon } from '../../../../components/content/icons';
import { VARIATION_CATEGORIES, categoryLabel } from '../../../../data/content/seedScoring';
import { now } from '../../../../data/content/store';
import { deleteVariation, newId, saveVariation } from '../../../../data/content/workflows';
import type { Variation, VariationCategory, VariationRule, Workflow } from '../../../../data/content/types';

type Draft = { id?: string; name: string; isDefault: boolean; rules: (VariationRule & { key: string })[] };
const blank = (): Draft => ({ name: '', isDefault: false, rules: [{ key: newId('r'), category: 'country', op: 'is', values: [] }] });

/** Configure variations: create one from metadata rules, and see, open or delete the ones that exist. */
export default function VariationsDialog({ w, editable, onClose }: { w: Workflow; editable: boolean; onClose: () => void }) {
  const id = useId();
  const [draft, setDraft] = useState<Draft>(blank);
  const [tried, setTried] = useState(false);
  const [deleting, setDeleting] = useState<Variation | null>(null);
  const [said, setSaid] = useState('');
  const vars = w.scoring.variations;
  const usedBy = (vid: string) => w.scoring.scores.filter((s) => s.variationId === vid).length;

  const errors: string[] = [];
  if (!draft.name.trim()) errors.push('Give the variation a name.');
  else if (vars.some((v) => v.id !== draft.id && v.name.toLowerCase() === draft.name.trim().toLowerCase())) errors.push('Another variation has that name.');
  draft.rules.forEach((r, i) => { if (!r.values.length) errors.push(`Metadata category ${i + 1}: choose at least one value.`); });

  const setRule = (key: string, p: Partial<VariationRule>) =>
    setDraft((d) => ({ ...d, rules: d.rules.map((r) => (r.key === key ? { ...r, ...p, ...(p.category ? { values: [] } : {}) } : r)) }));

  const save = () => {
    setTried(true);
    if (errors.length) return;
    const v: Variation = {
      id: draft.id ?? newId('v'), name: draft.name.trim(), isDefault: draft.isDefault,
      rules: draft.rules.map(({ category, op, values }) => ({ category, op, values })),
      created: vars.find((x) => x.id === draft.id)?.created ?? now(),
    };
    saveVariation(w.id, v, draft.id ? `Edited variation ${v.name}` : `Created variation ${v.name}`);
    setSaid(draft.id ? `Saved ${v.name}.` : `Created ${v.name}.`);
    setDraft(blank()); setTried(false);
  };

  return (
    <Dialog open onClose={onClose} size="lg" title="Configure variations"
      description={<p>A variation is a group of candidates, by home system, region, job level or language, who can get their own scores.</p>}>
      {editable && (
        <form className="form variation-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <div className="variation-form__top">
            <div className="field">
              <label className="field__label" htmlFor={`${id}-name`}>Variation name</label>
              <input id={`${id}-name`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                aria-invalid={tried && !draft.name.trim()} placeholder="For example: Outer Rim" />
            </div>
            <label className="check variation-form__default">
              <input type="checkbox" role="switch" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} />
              Default variation
            </label>
          </div>

          {draft.rules.map((r, i) => {
            const cat = VARIATION_CATEGORIES.find((c) => c.value === r.category)!;
            return (
              <fieldset key={r.key} className="rule">
                <legend className="visually-hidden">Metadata category {i + 1}</legend>
                <Select label={`Metadata category ${i + 1}`} value={r.category}
                  options={VARIATION_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                  onChange={(v: VariationCategory) => setRule(r.key, { category: v })} />
                <Select label="Operator" value={r.op} options={[{ value: 'is', label: 'IS' }, { value: 'is-not', label: 'IS NOT' }]}
                  onChange={(v: 'is' | 'is-not') => setRule(r.key, { op: v })} />
                <fieldset className="rule__values" aria-invalid={tried && !r.values.length}>
                  <legend className="field__label">Value</legend>
                  <div className="rule__chips">
                    {cat.values.map((val) => (
                      <label key={val} className={`pill-check${r.values.includes(val) ? ' is-on' : ''}`}>
                        <input type="checkbox" checked={r.values.includes(val)}
                          onChange={(e) => setRule(r.key, { values: e.target.checked ? [...r.values, val] : r.values.filter((x) => x !== val) })} />
                        {val}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {draft.rules.length > 1 && (
                  <button type="button" className="bframe__btn rule__x" aria-label={`Remove metadata category ${i + 1}`}
                    onClick={() => setDraft({ ...draft, rules: draft.rules.filter((x) => x.key !== r.key) })}><CloseIcon /></button>
                )}
              </fieldset>
            );
          })}
          {draft.rules.length < VARIATION_CATEGORIES.length && (
            <button type="button" className="link-button add-link" onClick={() => {
              const free = VARIATION_CATEGORIES.find((c) => !draft.rules.some((r) => r.category === c.value))!;
              setDraft({ ...draft, rules: [...draft.rules, { key: newId('r'), category: free.value, op: 'is', values: [] }] });
            }}><PlusIcon /> Add metadata category</button>
          )}

          {tried && errors.length > 0 && (
            <div className="issues" role="alert"><AlertIcon /><ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul></div>
          )}
          <div className="form-actions">
            <button type="submit" className="btn btn--primary btn--sm">{draft.id ? 'Save variation' : 'Create variation'}</button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setDraft(blank()); setTried(false); }}>Cancel</button>
          </div>
        </form>
      )}

      <h3 className="detail__h3 variation-current">Current variations</h3>
      {vars.length ? (
        <div className="table-wrap">
          <table className="table table--compact">
            <caption className="visually-hidden">Current variations</caption>
            <thead><tr><th scope="col">Variation</th><th scope="col">Parameters</th><th scope="col">Values</th><th scope="col">Default</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              {vars.map((v) => (
                <tr key={v.id}>
                  <th scope="row">{v.name}<span className="cell-sub">{usedBy(v.id)} score{usedBy(v.id) === 1 ? '' : 's'}</span></th>
                  <td>{v.rules.map((r) => <span key={r.category} className="cell-strong">{categoryLabel(r.category)} {r.op === 'is' ? 'IS' : 'IS NOT'}</span>)}</td>
                  <td>{v.rules.map((r) => <span key={r.category} className="cell-sub">{r.values.join(', ')}</span>)}</td>
                  <td>{v.isDefault ? 'Default' : <span className="muted">—</span>}</td>
                  <td className="row-actions">
                    {editable && (
                      <>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => {
                          setDraft({ id: v.id, name: v.name, isDefault: v.isDefault, rules: v.rules.map((r) => ({ ...r, key: newId('r') })) });
                          setTried(false);
                          requestAnimationFrame(() => document.getElementById(`${id}-name`)?.focus());
                        }}>Edit <span className="visually-hidden">{v.name}</span></button>{' '}
                        <button type="button" className="link-button" onClick={() => setDeleting(v)}>Delete <span className="visually-hidden">{v.name}</span></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="muted small">No variations yet. Every score applies to every candidate.</p>}

      {deleting && (
        <div className="inline-confirm" role="alert">
          <p><strong>Delete {deleting.name}?</strong> {usedBy(deleting.id) ? `${usedBy(deleting.id)} score${usedBy(deleting.id) === 1 ? '' : 's'} will apply to everyone instead.` : ''}</p>
          <div className="form-actions">
            <button type="button" className="btn btn--danger btn--sm" onClick={() => { deleteVariation(w.id, deleting.id, deleting.name); setSaid(`Deleted ${deleting.name}.`); setDeleting(null); }}>Delete</button>
            <button type="button" className="btn btn--secondary btn--sm" autoFocus onClick={() => setDeleting(null)}>Cancel</button>
          </div>
        </div>
      )}
      <span className="visually-hidden" role="status" aria-live="polite">{said}</span>
    </Dialog>
  );
}

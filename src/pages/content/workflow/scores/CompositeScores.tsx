import { useEffect, useId, useState } from 'react';
import { Select } from '@jothish-uxd/enterprise-library';
import Dialog from '../../../../components/content/Dialog';
import Menu from '../../../../components/content/Menu';
import { DownIcon, UpIcon } from '../../../../components/content/icons';
import { useModules } from '../../../../data/content/store';
import { inputsFor, outputsOf } from '../../../../data/content/scoring';
import { moveScore } from '../../../../data/content/workflows';
import type { Score, Workflow } from '../../../../data/content/types';
import VariationsDialog from './VariationsDialog';
import ScratchEditor from './ScratchEditor';
import REditor from './REditor';
import RView from './RView';
import Pager, { usePage } from './Pager';
import { CommentButton } from '../comments/Comments';

export type Pane =
  | { k: 'empty' }
  | { k: 'new-scratch' }
  | { k: 'new-r' }
  | { k: 'score'; id: string }
  | { k: 'replace-r'; id: string };

const label = (s: Score) => s.kind === 'r' ? s.name : s.name;

/** Composite scores: variations and the list of workflow scores on the left, the open score on the right. */
export default function CompositeScores({ w, editable }: { w: Workflow; editable: boolean }) {
  const id = useId();
  const modules = useModules();
  const scores = w.scoring.scores;
  const [filter, setFilter] = useState<string>('all');
  const [pane, setPane] = useState<Pane>(() => (scores[0] ? { k: 'score', id: scores[0].id } : { k: 'empty' }));
  const [variations, setVariations] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [said, setSaid] = useState('');

  // If the open score is deleted, fall back to the first one.
  useEffect(() => {
    if ((pane.k === 'score' || pane.k === 'replace-r') && !scores.some((s) => s.id === pane.id)) {
      setPane(scores[0] ? { k: 'score', id: scores[0].id } : { k: 'empty' });
    }
  }, [scores, pane]);

  const shown = scores.filter((s) => filter === 'all' || (filter === 'everyone' ? !s.variationId : s.variationId === filter));
  const varName = (vid: string | null) => w.scoring.variations.find((v) => v.id === vid)?.name;
  const filterOptions = [
    { value: 'all', label: 'All scores' },
    { value: 'everyone', label: 'Applies to everyone' },
    ...w.scoring.variations.map((v) => ({ value: v.id, label: `${v.name}${v.isDefault ? ' (default)' : ''}` })),
  ];
  const openScore = pane.k === 'score' || pane.k === 'replace-r' ? scores.find((s) => s.id === pane.id) : undefined;

  const focusLater = (sel: string) => requestAnimationFrame(() => requestAnimationFrame(() =>
    (document.querySelector(sel) as HTMLElement | null)?.focus()));
  const goTo = (p: Pane) => { setPane(p); focusLater('.scores__pane [data-pane-heading]'); };

  const addItems = [
    { label: 'Create from scratch', onSelect: () => goTo({ k: 'new-scratch' }) },
    { label: 'Paste new R formula', onSelect: () => goTo({ k: 'new-r' }) },
  ];

  return (
    <section className="wf-section wf-section--wide" aria-labelledby={`${id}-h`}>
      <div className="section-head">
        <h2 id={`${id}-h`} className="section-title">Composite scores</h2>
        <button type="button" className="link-button" onClick={() => setViewAll(true)}>View all scores</button>
      </div>

      <div className="scores">
        <div className="scores__side">
          <div className="scores__filter">
            {w.scoring.variations.length ? (
              <Select label="Filter by variation" value={filter} options={filterOptions} onChange={setFilter} />
            ) : (
              <div className="field">
                <span className="field__label">Filter by variation</span>
                <span className="field__static field__static--off">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="m4 12 8-8" /></svg>
                  No variations
                </span>
              </div>
            )}
            <button type="button" className="link-button scores__config" onClick={() => setVariations(true)}>
              {editable ? '+ Configure variations' : 'View variations'}
            </button>
          </div>

          <div className="scores__listhead">
            <h3 className="scores__count">Workflow scores ({scores.length})</h3>
            {editable && scores.length > 0 && (
              <Menu label="Add new score" className="menu--primary" items={addItems}>
                Add new score <DownIcon />
              </Menu>
            )}
          </div>

          {shown.length > 0 ? (
            <ol className="score-list" aria-label="Workflow scores, in the order they’re calculated">
              {shown.map((s) => {
                const i = scores.indexOf(s);
                const current = openScore?.id === s.id;
                return (
                  <li key={s.id} id={`score-${s.id}`} className={`score-row${current ? ' is-current' : ''}`}>
                    {editable && (
                      <span className="score-row__move">
                        <button type="button" className="bframe__btn" aria-label={`Move ${label(s)} up`} disabled={i === 0}
                          data-move={`${s.id}-up`}
                          onClick={() => { moveScore(w.id, s.id, -1); setSaid(`${label(s)} moved to position ${i}.`); focusLater(`[data-move="${s.id}-up"]:not(:disabled), [data-open="${s.id}"]`); }}>
                          <UpIcon />
                        </button>
                        <button type="button" className="bframe__btn" aria-label={`Move ${label(s)} down`} disabled={i === scores.length - 1}
                          data-move={`${s.id}-down`}
                          onClick={() => { moveScore(w.id, s.id, 1); setSaid(`${label(s)} moved to position ${i + 2}.`); focusLater(`[data-move="${s.id}-down"]:not(:disabled), [data-open="${s.id}"]`); }}>
                          <DownIcon />
                        </button>
                      </span>
                    )}
                    <button type="button" className="score-row__open" data-open={s.id} aria-current={current ? 'true' : undefined}
                      onClick={() => goTo({ k: 'score', id: s.id })}>
                      <span className="score-row__text">
                        <span className="score-row__name">{label(s)}</span>
                        <span className="score-row__meta">
                          {s.kind === 'r' ? `${s.outputs.length} output scores` : TYPE_TEXT[s.type]}
                          {s.variationId ? ` · ${varName(s.variationId)}` : ''}
                        </span>
                      </span>
                      <svg className="score-row__chev" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
                    </button>
                    <CommentButton className="score-row__c" target={{ kind: 'score', id: s.id, label: s.kind === 'r' ? `${s.name} (${s.outputs.length} outputs)` : s.name, tab: 'scores' }} />
                  </li>
                );
              })}
            </ol>
          ) : scores.length > 0 ? (
            <p className="muted small scores__none">No scores for this variation.</p>
          ) : null}
        </div>

        <div className="scores__pane">
          {pane.k === 'empty' && (
            <div className="scores__empty">
              <span className="soon__mark" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" /></svg>
              </span>
              <h3 className="sub-title" tabIndex={-1} data-pane-heading>There are no workflow scores</h3>
              <p className="muted">{editable ? 'Add the first score to say how candidates’ module scores combine into a result.' : 'This workflow has no composite scores.'}</p>
              {editable && (
                <div className="scores__empty-actions">
                  <button type="button" className="btn btn--secondary" onClick={() => goTo({ k: 'new-scratch' })}>Create from scratch</button>
                  <button type="button" className="btn btn--secondary" onClick={() => goTo({ k: 'new-r' })}>Paste new R formula</button>
                </div>
              )}
            </div>
          )}
          {pane.k === 'new-scratch' && (
            <ScratchEditor w={w} modules={modules} editable
              onDone={(sid) => { setPane(sid ? { k: 'score', id: sid } : scores[0] ? { k: 'score', id: scores[0].id } : { k: 'empty' }); if (sid) setSaid('Score added.'); }} />
          )}
          {pane.k === 'new-r' && (
            <REditor w={w} modules={modules}
              onDone={(sid) => { setPane(sid ? { k: 'score', id: sid } : scores[0] ? { k: 'score', id: scores[0].id } : { k: 'empty' }); if (sid) setSaid('R formula added.'); }} />
          )}
          {pane.k === 'replace-r' && openScore?.kind === 'r' && (
            <REditor w={w} modules={modules} replacing={openScore} onDone={() => goTo({ k: 'score', id: openScore.id })} />
          )}
          {pane.k === 'score' && openScore?.kind === 'scratch' && (
            <ScratchEditor key={openScore.id} w={w} modules={modules} score={openScore} editable={editable} onDone={() => {}} />
          )}
          {pane.k === 'score' && openScore?.kind === 'r' && (
            <RView key={openScore.id} w={w} score={openScore} editable={editable} onReplace={() => goTo({ k: 'replace-r', id: openScore.id })} />
          )}
        </div>
      </div>

      <span className="visually-hidden" role="status" aria-live="polite">{said}</span>

      {variations && <VariationsDialog w={w} editable={editable} onClose={() => setVariations(false)} />}
      {viewAll && <AllScores w={w} onClose={() => setViewAll(false)} />}
    </section>
  );
}

export const TYPE_TEXT = { conditional: 'Conditional', reference: 'Reference', weighted: 'Weighted sum' } as const;

/** Every input score the workflow produces, and every output the composite scores create. */
function AllScores({ w, onClose }: { w: Workflow; onClose: () => void }) {
  const modules = useModules();
  const rows = [
    ...inputsFor(w.steps, modules).map((x) => ({ name: x.name, from: x.source, kind: `Input · ${x.type}` })),
    ...w.scoring.scores.flatMap((s) => outputsOf(s).map((name) => ({ name, from: s.kind === 'r' ? 'R formula' : 'Created from scratch', kind: 'Output' }))),
  ];
  const { page, setPage, pages, slice } = usePage(rows, 12);
  return (
    <Dialog open onClose={onClose} size="lg" title="All scores"
      description={<p>{rows.length} scores: what the workflow’s modules and checkpoints produce, and what the composite scores calculate from them.</p>}>
      <div className="table-wrap">
        <table className="table table--compact">
          <caption className="visually-hidden">All scores</caption>
          <thead><tr><th scope="col">Score</th><th scope="col">From</th><th scope="col">Kind</th></tr></thead>
          <tbody>{slice.map((r) => <tr key={r.name}><th scope="row" className="mono">{r.name}</th><td>{r.from}</td><td><span className="tag">{r.kind}</span></td></tr>)}</tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} total={rows.length} size={12} onPage={setPage} />
    </Dialog>
  );
}

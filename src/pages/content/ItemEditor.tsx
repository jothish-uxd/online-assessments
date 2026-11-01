import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import Select from '../../components/Select';
import Thumb from '../../components/content/Thumb';
import { Byline } from '../../components/content/Byline';
import { AlertIcon, CloseIcon, PlusIcon } from '../../components/content/icons';
import { choiceId, fmtSeconds, itemIssues, newQuestion, updateItem, useAssets } from '../../data/content/store';
import Chart from '../../components/content/Chart';
import { PURPOSES, typeInfo } from '../../data/content/itemTypes';
import { KIND_LABEL, spec } from '../../data/content/format';
import type { ChartQuestion, Choice, ContentPurpose, Item, ItemSettings, ModuleTiming } from '../../data/content/types';
import AssetPicker from './AssetPicker';
import { contentRoutes } from './routes';

interface Props { moduleId: string; item: Item; readOnly: boolean; timing?: ModuleTiming }

/** Edit one item in place. Changes save as you type, stamped with you and the time. */
export default function ItemEditor({ moduleId, item, readOnly, timing }: Props) {
  const id = useId();
  const assets = useAssets();
  const [picking, setPicking] = useState(false);
  const info = typeInfo(item.type);
  const issues = itemIssues(item);
  const media = assets.find((a) => a.id === item.assetId);

  const set = (patch: Partial<Item>) => updateItem(moduleId, item.id, patch);
  const setS = (patch: Partial<ItemSettings>) => set({ settings: { ...item.settings, ...patch } });
  const num = (v: string) => (v === '' ? undefined : Math.max(0, Number(v)));

  const choices = item.choices ?? [];
  const setChoices = (c: Choice[]) => set({ choices: c });
  const markCorrect = (cid: string, on: boolean) =>
    setChoices(choices.map((c) => item.type === 'single' ? { ...c, correct: c.id === cid } : c.id === cid ? { ...c, correct: on } : c));

  const promptLabel =
    item.type === 'content' ? 'Text candidates read'
    : item.type === 'spoken' ? 'Content to read, and what to say'
    : item.type === 'listen-write' ? 'Instructions'
    : item.type === 'chart' ? 'Instructions above the chart'
    : 'Item stem';

  return (
    <fieldset className="item-editor" disabled={readOnly}>
      <legend className="visually-hidden">Edit item</legend>

      {item.type === 'content' && (
        <div className="form-grid form-grid--2">
          <Select label="Purpose" value={item.settings.purpose ?? 'instructions'} options={PURPOSES}
            onChange={(v: ContentPurpose) => setS({ purpose: v })} />
          <div className="field">
            <label className="field__label" htmlFor={`${id}-title`}>Heading</label>
            <input id={`${id}-title`} value={item.title ?? ''} onChange={(e) => set({ title: e.target.value })} placeholder="For example: Before you begin" />
          </div>
        </div>
      )}

      <div className="field">
        <label className="field__label" htmlFor={`${id}-prompt`}>{promptLabel}</label>
        <textarea id={`${id}-prompt`} data-autofocus rows={item.type === 'content' ? 5 : item.type === 'chart' ? 2 : 3} value={item.prompt}
          onChange={(e) => set({ prompt: e.target.value })} />
      </div>

      {item.type === 'chart' && (
        <div className="field">
          <span className="field__label" id={`${id}-chart`}>Chart</span>
          {media?.chart ? (
            <div className="chart-pick">
              <Chart spec={media.chart} title={media.title} />
              {!readOnly && (
                <span className="media-pick__actions">
                  <button type="button" className="link-button" onClick={() => setPicking(true)}>Change chart</button>
                  <Link to={contentRoutes.assets(media.id)} className="link-button">Edit in Assets</Link>
                </span>
              )}
            </div>
          ) : (
            <div>
              <button type="button" className="btn btn--secondary btn--sm" aria-describedby={`${id}-chart`} onClick={() => setPicking(true)}>
                <PlusIcon /> Choose chart
              </button>
            </div>
          )}
        </div>
      )}

      {item.type === 'chart' && <ChartQuestions id={id} questions={item.questions ?? []} readOnly={readOnly} onChange={(q) => set({ questions: q })} />}

      {/* Media from the asset library */}
      {item.type !== 'chart' && <div className="field">
        <span className="field__label" id={`${id}-media`}>
          {item.type === 'listen-write' ? 'Audio clip' : 'Media'} {item.type !== 'listen-write' && <span className="muted">(optional)</span>}
        </span>
        {media ? (
          <div className="media-pick" aria-labelledby={`${id}-media`} role="group">
            <Thumb asset={media} size="sm" />
            <span className="media-pick__text">
              <Link to={contentRoutes.assets(media.id)} className="row-link">{media.title}</Link>
              <span className="cell-sub">{KIND_LABEL[media.kind]} · {spec(media)}</span>
            </span>
            {!readOnly && (
              <span className="media-pick__actions">
                <button type="button" className="link-button" onClick={() => setPicking(true)}>Change</button>
                <button type="button" className="link-button" onClick={() => set({ assetId: undefined })}>Remove</button>
              </span>
            )}
          </div>
        ) : (
          <div>
            <button type="button" className="btn btn--secondary btn--sm" aria-describedby={`${id}-media`} onClick={() => setPicking(true)}>
              <PlusIcon /> {item.type === 'listen-write' ? 'Choose audio' : 'Add media'}
            </button>
          </div>
        )}
      </div>}

      {(item.type === 'single' || item.type === 'multi') && (
        <fieldset className="choices">
          <legend className="field__label">Choices</legend>
          <p className="field-help">{item.type === 'single' ? 'Choose Mark correct on the right answer. Choosing another one moves it.' : 'Choose Mark correct on every right answer. Choose it again to unmark.'}</p>
          <ol className="choices__list">
            {choices.map((c, i) => (
              <li key={c.id} className={`choice${c.correct ? ' is-correct' : ''}`}>
                <span className="choice__letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                <input className="choice__text" aria-label={`Choice ${i + 1}`} value={c.text} placeholder={`Choice ${i + 1}`}
                  onChange={(e) => setChoices(choices.map((x) => x.id === c.id ? { ...x, text: e.target.value } : x))} />
                <CorrectToggle multi={item.type === 'multi'} name={`${id}-correct`} on={c.correct} what={c.text || `choice ${i + 1}`}
                  onChange={(on) => markCorrect(c.id, on)} />
                {!readOnly && (
                  <button type="button" className="bframe__btn" aria-label={`Remove choice ${i + 1}`} disabled={choices.length <= 2}
                    onClick={() => setChoices(choices.filter((x) => x.id !== c.id))}><CloseIcon /></button>
                )}
              </li>
            ))}
          </ol>
          {!readOnly && (
            <button type="button" className="btn btn--secondary btn--sm" disabled={choices.length >= 8}
              onClick={() => setChoices([...choices, { id: choiceId(), text: '', correct: false }])}>
              <PlusIcon /> Add choice
            </button>
          )}
          <div className="checks">
            <label className="check">
              <input type="checkbox" checked={!!item.settings.shuffle} onChange={(e) => setS({ shuffle: e.target.checked })} />
              Shuffle choices for each candidate
            </label>
            {item.type === 'multi' && (
              <label className="check">
                <input type="checkbox" checked={!!item.settings.allOrNothing} onChange={(e) => setS({ allOrNothing: e.target.checked })} />
                Score only when every correct choice is picked
              </label>
            )}
          </div>
        </fieldset>
      )}

      {(item.type === 'paragraph' || item.type === 'listen-write') && (
        <div className="form-grid">
          {item.type === 'listen-write' && (
            <NumField id={`${id}-plays`} label="Times candidates can play it" value={item.settings.plays} onChange={(v) => setS({ plays: num(v) })} min={1} />
          )}
          {item.type === 'paragraph' && (
            <NumField id={`${id}-min`} label="Minimum words" value={item.settings.minWords} onChange={(v) => setS({ minWords: num(v) })} />
          )}
          <NumField id={`${id}-max`} label="Maximum words" value={item.settings.maxWords} onChange={(v) => setS({ maxWords: num(v) })} />
        </div>
      )}

      {item.type === 'spoken' && (
        <div className="form-grid">
          <NumField id={`${id}-prep`} label="Preparation time (seconds)" value={item.settings.prepSeconds} onChange={(v) => setS({ prepSeconds: num(v) })} />
          <NumField id={`${id}-rec`} label="Longest answer (seconds)" value={item.settings.maxSeconds} onChange={(v) => setS({ maxSeconds: num(v) })} min={10} />
          <NumField id={`${id}-att`} label="Recording attempts" value={item.settings.attempts} onChange={(v) => setS({ attempts: num(v) })} min={1} />
        </div>
      )}

      {(item.type === 'paragraph' || item.type === 'listen-write' || item.type === 'spoken') && (
        <div className="field">
          <label className="field__label" htmlFor={`${id}-guide`}>Scoring guidance for reviewers</label>
          <textarea id={`${id}-guide`} rows={3} value={item.settings.guidance ?? ''} aria-describedby={`${id}-guide-help`}
            onChange={(e) => setS({ guidance: e.target.value })} />
          <span id={`${id}-guide-help`} className="field-help">What a full-marks answer includes. Candidates never see this.</span>
        </div>
      )}

      {item.type === 'content' && (
        <div className="ack">
          <label className="check">
            <input type="checkbox" checked={!!item.settings.requireAck} onChange={(e) => setS({ requireAck: e.target.checked })} />
            Candidates must agree before continuing
          </label>
          {item.settings.requireAck && (
            <div className="field field--wide">
              <label className="field__label" htmlFor={`${id}-ack`}>Agreement checkbox text</label>
              <input id={`${id}-ack`} value={item.settings.ackLabel ?? ''} onChange={(e) => setS({ ackLabel: e.target.value })} />
            </div>
          )}
        </div>
      )}

      {info.scored && (
        <div className="item-editor__scoring">
          {item.type === 'chart'
            ? <div className="field field--num"><span className="field__label">Points</span><span className="readout">{item.points} <span className="muted small">total of its questions</span></span></div>
            : <NumField id={`${id}-pts`} label="Points" value={item.points} onChange={(v) => set({ points: num(v) ?? 0 })} />}
          {timing?.mode === 'per-item' && (
            <NumField id={`${id}-time`} label="Time limit (seconds)" value={item.settings.timeSeconds} min={10}
              onChange={(v) => setS({ timeSeconds: num(v) })} />
          )}
          {timing?.mode === 'each' && (
            <div className="field field--num"><span className="field__label">Time limit</span><span className="readout">{fmtSeconds(timing.seconds)} <span className="muted small">same for every item</span></span></div>
          )}
          <label className="check">
            <input type="checkbox" checked={item.required} onChange={(e) => set({ required: e.target.checked })} />
            Candidates must answer
          </label>
        </div>
      )}

      {issues.length > 0 && (
        <div className="issues" role="note" aria-label="Not ready yet">
          <AlertIcon />
          <ul>{issues.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}

      <p className="item-editor__stamps">
        Created by <Byline stamp={item.created} time /> · Last edited by <Byline stamp={item.edited} time />
        {!readOnly && <span className="muted"> · Changes save as you type</span>}
      </p>

      {picking && <AssetPicker
        open
        onClose={() => setPicking(false)}
        current={item.assetId}
        kinds={info.media === 'audio' ? ['audio'] : info.media === 'chart' ? ['chart'] : undefined}
        onPick={(aid) => { set({ assetId: aid }); setPicking(false); }}
      />}
    </fieldset>
  );
}

/**
 * The correct-answer control on a choice. A real radio (single select) or
 * checkbox (multiple select), drawn as a pill that reads "Mark correct" or
 * "Correct", so keyboard and screen reader behaviour stay native.
 */
function CorrectToggle({ multi, name, on, what, onChange }: { multi?: boolean; name: string; on: boolean; what: string; onChange: (on: boolean) => void }) {
  return (
    <label className={`correct-toggle${on ? ' is-on' : ''}`}>
      <input type={multi ? 'checkbox' : 'radio'} name={name} checked={on} onChange={(e) => onChange(e.target.checked)}
        aria-label={`${what} is correct`} />
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>
      <span aria-hidden="true">{on ? 'Correct' : 'Mark correct'}</span>
    </label>
  );
}

/** One to three single-select questions about the chart. */
function ChartQuestions({ id, questions, readOnly, onChange }: { id: string; questions: ChartQuestion[]; readOnly: boolean; onChange: (q: ChartQuestion[]) => void }) {
  const setQ = (qid: string, patch: Partial<ChartQuestion>) => onChange(questions.map((q) => q.id === qid ? { ...q, ...patch } : q));
  const focusLast = () => requestAnimationFrame(() => (document.querySelector(`#${CSS.escape(id)}-qs > li:last-child textarea`) as HTMLElement | null)?.focus());
  return (
    <section className="cq" aria-labelledby={`${id}-qh`}>
      <div className="cq__head">
        <h3 id={`${id}-qh`} className="field__label">Questions about the chart <span className="muted">({questions.length} of 3)</span></h3>
        <p className="field-help">Each question is single select: candidates pick one answer. Choose Mark correct on the right one; choosing another moves it.</p>
      </div>
      <ol className="cq__list" id={`${id}-qs`}>
        {questions.map((q, qi) => (
          <li key={q.id} className="cq__q">
            <fieldset>
              <legend className="cq__legend">Question {qi + 1}</legend>
              <div className="field">
                <label className="visually-hidden" htmlFor={`${id}-${q.id}-p`}>Question {qi + 1}</label>
                <textarea id={`${id}-${q.id}-p`} rows={2} value={q.prompt} placeholder="For example: Which squadron flew the most sorties?"
                  onChange={(e) => setQ(q.id, { prompt: e.target.value })} />
              </div>
              <ol className="choices__list">
                {q.choices.map((c, i) => (
                  <li key={c.id} className={`choice${c.correct ? ' is-correct' : ''}`}>
                    <span className="choice__letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                    <input className="choice__text" aria-label={`Question ${qi + 1}, choice ${i + 1}`} value={c.text} placeholder={`Choice ${i + 1}`}
                      onChange={(e) => setQ(q.id, { choices: q.choices.map((x) => x.id === c.id ? { ...x, text: e.target.value } : x) })} />
                    <CorrectToggle name={`${id}-${q.id}-correct`} on={c.correct} what={c.text || `choice ${i + 1}`}
                      onChange={() => setQ(q.id, { choices: q.choices.map((x) => ({ ...x, correct: x.id === c.id })) })} />
                    {!readOnly && (
                      <button type="button" className="bframe__btn" aria-label={`Remove question ${qi + 1}, choice ${i + 1}`} disabled={q.choices.length <= 2}
                        onClick={() => setQ(q.id, { choices: q.choices.filter((x) => x.id !== c.id) })}><CloseIcon /></button>
                    )}
                  </li>
                ))}
              </ol>
              <div className="cq__foot">
                {!readOnly && (
                  <button type="button" className="btn btn--ghost btn--sm" disabled={q.choices.length >= 6}
                    onClick={() => setQ(q.id, { choices: [...q.choices, { id: choiceId(), text: '', correct: false }] })}>
                    <PlusIcon /> Add choice
                  </button>
                )}
                <NumField id={`${id}-${q.id}-pts`} label="Points" value={q.points} min={0}
                  onChange={(v) => setQ(q.id, { points: v === '' ? 0 : Math.max(0, Number(v)) })} />
                {!readOnly && questions.length > 1 && (
                  <button type="button" className="link-button btn--danger-text" onClick={() => onChange(questions.filter((x) => x.id !== q.id))}>
                    Remove question {qi + 1}
                  </button>
                )}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      {!readOnly && (
        <button type="button" className="btn btn--secondary btn--sm" disabled={questions.length >= 3}
          onClick={() => { onChange([...questions, newQuestion()]); focusLast(); }}>
          <PlusIcon /> Add question
        </button>
      )}
      {!readOnly && questions.length >= 3 && <span className="field-help"> A chart can carry up to three questions.</span>}
    </section>
  );
}

function NumField({ id, label, value, onChange, min = 0 }: { id: string; label: string; value?: number; onChange: (v: string) => void; min?: number }) {
  return (
    <div className="field field--num">
      <label className="field__label" htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="numeric" min={min} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

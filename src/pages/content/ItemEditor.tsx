import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import Select from '../../components/Select';
import Thumb from '../../components/content/Thumb';
import { Byline } from '../../components/content/Byline';
import { AlertIcon, CloseIcon, PlusIcon } from '../../components/content/icons';
import { choiceId, itemIssues, updateItem, useAssets } from '../../data/content/store';
import { PURPOSES, typeInfo } from '../../data/content/itemTypes';
import { KIND_LABEL, spec } from '../../data/content/format';
import type { Choice, ContentPurpose, Item, ItemSettings } from '../../data/content/types';
import AssetPicker from './AssetPicker';
import { contentRoutes } from './routes';

interface Props { moduleId: string; item: Item; readOnly: boolean }

/** Edit one item in place. Changes save as you type, stamped with you and the time. */
export default function ItemEditor({ moduleId, item, readOnly }: Props) {
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
        <textarea id={`${id}-prompt`} data-autofocus rows={item.type === 'content' ? 5 : 3} value={item.prompt}
          onChange={(e) => set({ prompt: e.target.value })} />
      </div>

      {/* Media from the asset library */}
      <div className="field">
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
      </div>

      {(item.type === 'single' || item.type === 'multi') && (
        <fieldset className="choices">
          <legend className="field__label">Choices</legend>
          <p className="field-help">{item.type === 'single' ? 'Select the one correct choice.' : 'Tick every correct choice.'}</p>
          <ol className="choices__list">
            {choices.map((c, i) => (
              <li key={c.id} className={`choice${c.correct ? ' is-correct' : ''}`}>
                <label className="choice__mark">
                  <input type={item.type === 'single' ? 'radio' : 'checkbox'} name={`${id}-correct`} checked={c.correct}
                    onChange={(e) => markCorrect(c.id, e.target.checked)} />
                  <span className="visually-hidden">Choice {i + 1} is correct</span>
                </label>
                <span className="choice__letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                <input className="choice__text" aria-label={`Choice ${i + 1}`} value={c.text} placeholder={`Choice ${i + 1}`}
                  onChange={(e) => setChoices(choices.map((x) => x.id === c.id ? { ...x, text: e.target.value } : x))} />
                {c.correct && <span className="choice__flag">Correct</span>}
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
          <NumField id={`${id}-pts`} label="Points" value={item.points} onChange={(v) => set({ points: num(v) ?? 0 })} />
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
        kinds={info.media === 'audio' ? ['audio'] : undefined}
        onPick={(aid) => { set({ assetId: aid }); setPicking(false); }}
      />}
    </fieldset>
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

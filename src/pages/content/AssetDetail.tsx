import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Thumb, { SceneArt, Wave } from '../../components/content/Thumb';
import Dialog from '../../components/content/Dialog';
import TagInput from '../../components/content/TagInput';
import { ActivityList, Byline } from '../../components/content/Byline';
import { AlertIcon, CloseIcon, DownloadIcon, TrashIcon } from '../../components/content/icons';
import { useFileUrl } from '../../data/content/blobs';
import { deleteAssets, updateAsset, useModules, usesOf } from '../../data/content/store';
import { KIND_LABEL, bytes, duration, durationLong } from '../../data/content/format';
import type { Asset } from '../../data/content/types';
import { contentRoutes } from './routes';
import Chart from '../../components/content/Chart';
import { CHART_NOUN } from '../../data/content/format';

type Fields = Pick<Asset, 'title' | 'alt' | 'caption' | 'transcript' | 'tags'>;
const pickFields = (a: Asset): Fields => ({ title: a.title, alt: a.alt, caption: a.caption, transcript: a.transcript, tags: a.tags });

/** Asset details beside the library: preview, editable text, facts, where it's used and its history. */
export default function AssetDetail({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const id = useId();
  const headRef = useRef<HTMLHeadingElement>(null);
  const modules = useModules();
  const url = useFileUrl(asset.id, asset.hasFile);
  const [fields, setFields] = useState<Fields>(() => pickFields(asset));
  const [saved, setSaved] = useState('');
  const [confirm, setConfirm] = useState(false);
  const uses = usesOf(asset.id, modules);

  const dirty = JSON.stringify(fields) !== JSON.stringify(pickFields(asset));
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => { setFields((f) => ({ ...f, [k]: v })); setSaved(''); };

  useEffect(() => { headRef.current?.focus({ preventScroll: true }); }, []);

  const save = () => {
    if (!fields.title.trim()) return;
    updateAsset(asset.id, { ...fields, title: fields.title.trim() });
    setSaved('Saved.');
  };

  const isMedia = asset.kind === 'audio' || asset.kind === 'video';

  return (
    <aside className="detail" aria-labelledby={`${id}-h`}
      onKeyDown={(e) => { if (e.key === 'Escape' && !confirm) { e.stopPropagation(); onClose(); } }}>
      <div className="detail__head">
        <h2 ref={headRef} tabIndex={-1} id={`${id}-h`} className="detail__title">{asset.title}</h2>
        <button type="button" className="bframe__btn" aria-label="Close details" onClick={onClose}><CloseIcon /></button>
      </div>

      <div className="detail__scroll">
        {asset.kind === 'chart' && asset.chart ? (
          <div className="preview preview--chart"><Chart spec={asset.chart} title={fields.title || asset.title} /></div>
        ) : (
        <figure className={`preview preview--${asset.kind}`}>
          {asset.kind === 'image' && (url ? <img src={url} alt={asset.alt} /> : <SceneArt id={asset.id} />)}
          {asset.kind === 'video' && (url
            ? <video src={url} controls preload="metadata" aria-label={asset.title} />
            : <><SceneArt id={asset.id} /><span className="preview__note">Sample video, no file attached</span></>)}
          {asset.kind === 'audio' && (
            <>
              <Wave id={asset.id} bars={56} />
              {url ? <audio src={url} controls preload="metadata" aria-label={asset.title} />
                : <span className="preview__note">Sample audio · {duration(asset.duration)}</span>}
            </>
          )}
          {asset.kind === 'document' && (
            <>
              <Thumb asset={asset} />
              {url && <a className="preview__open" href={url} target="_blank" rel="noreferrer">Open {asset.fileName}</a>}
            </>
          )}
        </figure>
        )}

        <form className="form detail__form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-title`}>Title</label>
            <input id={`${id}-title`} value={fields.title} required aria-invalid={!fields.title.trim()}
              onChange={(e) => set('title', e.target.value)} />
          </div>

          {asset.kind === 'image' && (
            <div className="field">
              <label className="field__label" htmlFor={`${id}-alt`}>Alt text</label>
              <textarea id={`${id}-alt`} rows={3} value={fields.alt} aria-describedby={`${id}-alt-help`}
                onChange={(e) => set('alt', e.target.value)} />
              <span id={`${id}-alt-help`} className="field-help">
                {fields.alt.trim()
                  ? 'Read to candidates who use a screen reader. Describe what matters for the item.'
                  : <span className="gap-text"><AlertIcon /> Needed before a candidate who can’t see the image can answer.</span>}
              </span>
            </div>
          )}

          {asset.kind === 'chart' && asset.chart && (
            <div className="field">
              <span className="field__label">Summary for screen readers</span>
              <p className="field-help chart-summary-note">Shown under the chart and read out with it. It’s written from the data, so it stays in step when the numbers change. Candidates can also open the data table.</p>
            </div>
          )}

          {isMedia && (
            <div className="field">
              <label className="field__label" htmlFor={`${id}-tr`}>Transcript</label>
              <textarea id={`${id}-tr`} rows={4} value={fields.transcript} aria-describedby={`${id}-tr-help`}
                onChange={(e) => set('transcript', e.target.value)} />
              <span id={`${id}-tr-help`} className="field-help">
                {fields.transcript.trim()
                  ? `The words spoken${asset.kind === 'video' ? ', used for captions' : ''}. Offered to candidates who are deaf or hard of hearing.`
                  : <span className="gap-text"><AlertIcon /> Needed for candidates who are deaf or hard of hearing.</span>}
              </span>
            </div>
          )}

          <div className="field">
            <label className="field__label" htmlFor={`${id}-cap`}>Note for authors</label>
            <textarea id={`${id}-cap`} rows={2} value={fields.caption} onChange={(e) => set('caption', e.target.value)}
              aria-describedby={`${id}-cap-help`} />
            <span id={`${id}-cap-help`} className="field-help">Only your team sees this.</span>
          </div>

          <TagInput label="Tags" tags={fields.tags} onChange={(t) => set('tags', t)} />

          <div className="form-actions">
            <button type="submit" className="btn btn--primary btn--sm" disabled={!dirty || !fields.title.trim()}>Save changes</button>
            {dirty && <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setFields(pickFields(asset)); setSaved(''); }}>Discard</button>}
            <span className="save-state" role="status">{saved || (dirty ? 'Unsaved changes' : '')}</span>
          </div>
        </form>

        <section className="detail__section" aria-labelledby={`${id}-file`}>
          <h3 id={`${id}-file`} className="detail__h3">{asset.kind === 'chart' ? 'Chart' : 'File'}</h3>
          {asset.kind === 'chart' && asset.chart ? (
          <dl className="kv">
            <div><dt>Type</dt><dd>{CHART_NOUN[asset.chart.type]}</dd></div>
            <div><dt>Data</dt><dd>{asset.chart.type === 'scatter' ? `${asset.chart.points?.length ?? 0} points` : `${asset.chart.categories.length} categories × ${asset.chart.series.length} series`}</dd></div>
            {asset.chart.unit && <div><dt>Unit</dt><dd className="mono">{asset.chart.unit}</dd></div>}
            <div><dt>Created</dt><dd><Byline stamp={asset.created} time /></dd></div>
            <div><dt>Last edited</dt><dd><Byline stamp={asset.edited} time /></dd></div>
          </dl>
          ) : (
          <dl className="kv">
            <div><dt>File name</dt><dd className="mono">{asset.fileName}</dd></div>
            <div><dt>Type</dt><dd>{KIND_LABEL[asset.kind]} <span className="muted">· {asset.mime}</span></dd></div>
            <div><dt>Size</dt><dd>{bytes(asset.size)}</dd></div>
            {asset.width && <div><dt>Dimensions</dt><dd>{asset.width} × {asset.height} px</dd></div>}
            {asset.duration !== undefined && <div><dt>Length</dt><dd><span aria-hidden="true">{duration(asset.duration)}</span><span className="visually-hidden">{durationLong(asset.duration)}</span></dd></div>}
            <div><dt>Uploaded</dt><dd><Byline stamp={asset.created} time /></dd></div>
            <div><dt>Last edited</dt><dd><Byline stamp={asset.edited} time /></dd></div>
          </dl>
          )}
        </section>

        <section className="detail__section" aria-labelledby={`${id}-used`}>
          <h3 id={`${id}-used`} className="detail__h3">Used in</h3>
          {uses.length ? (
            <ul className="uses">
              {uses.map((u) => (
                <li key={u.item.id}>
                  <Link to={contentRoutes.module(u.module.id)} state={{ openItem: u.item.id }} className="row-link">{u.module.name}</Link>
                  <span className="cell-sub">Item {u.position}{u.item.title ? `: ${u.item.title}` : ''}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted small">Not used in any module yet.</p>}
        </section>

        <section className="detail__section" aria-labelledby={`${id}-act`}>
          <h3 id={`${id}-act`} className="detail__h3">Activity</h3>
          <ActivityList items={asset.history} />
        </section>
      </div>

      <div className="detail__foot">
        {url && <a className="btn btn--secondary btn--sm" href={url} download={asset.fileName}><DownloadIcon /> Download</a>}
        <button type="button" className="btn btn--secondary btn--sm btn--danger-text" onClick={() => setConfirm(true)}><TrashIcon /> Delete</button>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        alert
        title={`Delete “${asset.title}”?`}
        description={
          <>
            <p>This can’t be undone.</p>
            {uses.length > 0 && <p className="warn-line"><strong>{uses.length} item{uses.length === 1 ? '' : 's'}</strong> show this asset and will lose their media.</p>}
          </>
        }
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setConfirm(false)} autoFocus>Cancel</button>
            <button type="button" className="btn btn--danger" onClick={() => { deleteAssets([asset.id]); setConfirm(false); onClose(); }}>Delete</button>
          </>
        }
      />
    </aside>
  );
}

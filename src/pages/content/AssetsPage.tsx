import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../components/usePageTitle';
import Select from '../../components/Select';
import Thumb from '../../components/content/Thumb';
import Dialog from '../../components/content/Dialog';
import { Byline } from '../../components/content/Byline';
import { GridIcon, KindIcon, ListIcon, SearchIcon, TagIcon, TrashIcon, UploadIcon } from '../../components/content/icons';
import { useStored } from '../../data/store';
import { a11yGap, deleteAssets, tagAssets, uploadFiles, useAssets, useModules, usesOf } from '../../data/content/store';
import { KIND_LABEL, spec } from '../../data/content/format';
import type { Asset, AssetKind } from '../../data/content/types';
import AssetDetail from './AssetDetail';
import { contentRoutes } from './routes';

type KindFilter = 'all' | AssetKind;
type Sort = 'uploaded' | 'edited' | 'name' | 'size';

const KINDS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Documents' },
];
const SORTS: { value: Sort; label: string }[] = [
  { value: 'uploaded', label: 'Newest uploaded' },
  { value: 'edited', label: 'Recently edited' },
  { value: 'name', label: 'Name, A to Z' },
  { value: 'size', label: 'Largest first' },
];
const ACCEPT = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt';

export default function AssetsPage() {
  const h = usePageTitle('Assets');
  const { assetId } = useParams();
  const navigate = useNavigate();
  const assets = useAssets();
  const modules = useModules();

  const [view, setView] = useStored<'grid' | 'list'>('content:ui:asset-view', () => 'grid');
  const [kind, setKind] = useState<KindFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('uploaded');
  const [gapsOnly, setGapsOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [tagText, setTagText] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastPicked = useRef<number | null>(null);
  const dragDepth = useRef(0);

  // The visual toast fades after a few seconds; the status region keeps the text for screen readers.
  const [toast, setToast] = useState('');
  useEffect(() => {
    setToast(status);
    if (!status) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [status]);

  const counts = useMemo(() => {
    const c: Record<KindFilter, number> = { all: assets.length, image: 0, video: 0, audio: 0, document: 0 };
    assets.forEach((a) => { c[a.kind]++; });
    return c;
  }, [assets]);
  const gapCount = assets.filter((a) => a11yGap(a)).length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = assets.filter((a) =>
      (kind === 'all' || a.kind === kind) &&
      (!gapsOnly || a11yGap(a)) &&
      (!q || [a.title, a.fileName, a.caption, ...a.tags].some((s) => s.toLowerCase().includes(q))));
    const by: Record<Sort, (x: Asset, y: Asset) => number> = {
      uploaded: (x, y) => y.created.at.localeCompare(x.created.at),
      edited: (x, y) => y.edited.at.localeCompare(x.edited.at),
      name: (x, y) => x.title.localeCompare(y.title),
      size: (x, y) => y.size - x.size,
    };
    return [...list].sort(by[sort]);
  }, [assets, kind, query, sort, gapsOnly]);

  const open = assets.find((a) => a.id === assetId);
  const selectedIds = [...selected].filter((id) => assets.some((a) => a.id === id));
  const allShownSelected = shown.length > 0 && shown.every((a) => selected.has(a.id));
  const usedSelected = selectedIds.flatMap((id) => usesOf(id, modules));

  /* ---- selection: click toggles, Shift-click selects the range ---- */
  const pick = (index: number, shift: boolean) => {
    const id = shown[index].id;
    setSelected((prev) => {
      const next = new Set(prev);
      const on = !prev.has(id);
      if (shift && lastPicked.current !== null) {
        const [a, b] = [lastPicked.current, index].sort((x, y) => x - y);
        shown.slice(a, b + 1).forEach((s) => (on ? next.add(s.id) : next.delete(s.id)));
      } else if (on) next.add(id); else next.delete(id);
      return next;
    });
    lastPicked.current = index;
  };
  const toggleAll = () => setSelected(allShownSelected ? new Set() : new Set(shown.map((a) => a.id)));

  /* ---- upload ---- */
  const upload = async (files: File[]) => {
    if (!files.length) return;
    setProgress({ done: 0, total: files.length });
    setStatus(`Uploading ${files.length} file${files.length === 1 ? '' : 's'}…`);
    const added = await uploadFiles(files, (done) => setProgress({ done, total: files.length }));
    setProgress(null);
    setKind('all'); setGapsOnly(false); setSort('uploaded'); setQuery('');
    const gaps = added.filter((a) => a11yGap(a)).length;
    setStatus(`Uploaded ${added.length} file${added.length === 1 ? '' : 's'}.${gaps ? ` ${gaps} need${gaps === 1 ? 's' : ''} alt text or a transcript.` : ''}`);
    if (added.length === 1) navigate(contentRoutes.assets(added[0].id));
  };

  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes('Files');
  const dropProps = {
    onDragEnter: (e: DragEvent) => { if (!hasFiles(e)) return; dragDepth.current++; setDragging(true); },
    onDragLeave: (e: DragEvent) => { if (!hasFiles(e)) return; if (--dragDepth.current <= 0) setDragging(false); },
    onDragOver: (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); },
    onDrop: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); dragDepth.current = 0; setDragging(false);
      void upload([...e.dataTransfer.files]);
    },
  };

  /* ---- bulk actions ---- */
  const doDelete = () => {
    const n = selectedIds.length;
    deleteAssets(selectedIds);
    setSelected(new Set());
    setConfirmDelete(false);
    if (assetId && selectedIds.includes(assetId)) navigate(contentRoutes.assets());
    setStatus(`Deleted ${n} asset${n === 1 ? '' : 's'}.`);
  };
  const doTag = () => {
    const t = tagText.trim().toLowerCase();
    if (!t) return;
    tagAssets(selectedIds, t);
    setTagging(false); setTagText('');
    setStatus(`Tagged ${selectedIds.length} asset${selectedIds.length === 1 ? '' : 's'} “${t}”.`);
  };

  const closeDetail = () => {
    const id = assetId;
    navigate(contentRoutes.assets());
    requestAnimationFrame(() => document.getElementById(`asset-link-${id}`)?.focus());
  };

  return (
    <div className={`assets${open ? ' has-detail' : ''}`}>
      <section className="assets__lib" aria-labelledby="assets-title" {...dropProps}>
        <header className="ca-head">
          <div>
            <h1 ref={h} tabIndex={-1} id="assets-title" className="ca-title">Assets</h1>
            <p className="ca-sub">Images, video, audio and documents that items can show.</p>
          </div>
          <div className="ca-head__actions">
            <input ref={fileRef} type="file" multiple accept={ACCEPT} hidden
              onChange={(e) => { void upload([...(e.target.files ?? [])]); e.target.value = ''; }} />
            <button type="button" className="btn btn--primary" onClick={() => fileRef.current?.click()} disabled={!!progress}>
              <UploadIcon /> Upload files
            </button>
          </div>
        </header>

        <div className="toolbar">
          <label className="search">
            <SearchIcon />
            <span className="visually-hidden">Search assets</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, file or tag" />
          </label>
          <fieldset className="seg-control" aria-label="Type">
            <legend className="visually-hidden">Type</legend>
            {KINDS.map((k) => (
              <label key={k.value} className={`seg-control__opt${kind === k.value ? ' is-on' : ''}`}>
                <input type="radio" name="asset-kind" checked={kind === k.value} onChange={() => setKind(k.value)} />
                {k.label} <span className="seg-count">{counts[k.value]}</span>
              </label>
            ))}
          </fieldset>
          <div className="toolbar__end">
            <Select label="Sort" inline value={sort} options={SORTS} onChange={setSort} />
            <div className="view-toggle" role="group" aria-label="View">
              <button type="button" className="bframe__btn" aria-pressed={view === 'grid'} aria-label="Grid" onClick={() => setView('grid')}><GridIcon /></button>
              <button type="button" className="bframe__btn" aria-pressed={view === 'list'} aria-label="List" onClick={() => setView('list')}><ListIcon /></button>
            </div>
          </div>
        </div>

        <div className="results-bar">
          <label className="check">
            <input type="checkbox" checked={allShownSelected} disabled={!shown.length}
              ref={(el) => { if (el) el.indeterminate = !allShownSelected && shown.some((a) => selected.has(a.id)); }}
              onChange={toggleAll} />
            {selectedIds.length ? `${selectedIds.length} selected` : `${shown.length} asset${shown.length === 1 ? '' : 's'}`}
          </label>
          {selectedIds.length > 0 ? (
            <div className="bulk" role="group" aria-label="Bulk actions">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setTagging(true)}><TagIcon /> Add tag</button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setConfirmDelete(true)}><TrashIcon /> Delete</button>
              <button type="button" className="link-button" onClick={() => setSelected(new Set())}>Clear selection</button>
            </div>
          ) : (
            <label className="check check--quiet">
              <input type="checkbox" checked={gapsOnly} onChange={(e) => setGapsOnly(e.target.checked)} />
              Missing alt text or transcript <span className="seg-count">{gapCount}</span>
            </label>
          )}
        </div>

        {progress && (
          <div className="upload-progress">
            <span>Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}</span>
            <progress max={progress.total} value={progress.done} aria-label="Upload progress" />
          </div>
        )}

        {shown.length === 0 ? (
          <div className="empty">
            <p className="empty__title">{assets.length ? 'No assets match' : 'No assets yet'}</p>
            <p>{assets.length ? 'Try another type or search.' : 'Upload files, or drop them anywhere on this page.'}</p>
          </div>
        ) : view === 'grid' ? (
          <ul className="tiles" aria-label="Assets">
            {shown.map((a, i) => {
              const gap = a11yGap(a);
              const isSel = selected.has(a.id);
              return (
                <li key={a.id} className={`tile${isSel ? ' is-selected' : ''}${a.id === assetId ? ' is-open' : ''}${selectedIds.length ? ' is-selecting' : ''}`}>
                  <Link id={`asset-link-${a.id}`} to={contentRoutes.assets(a.id)} className="tile__link" aria-current={a.id === assetId ? 'true' : undefined}>
                    <Thumb asset={a} />
                    <span className="tile__title">{a.title}</span>
                    <span className="tile__meta"><KindIcon kind={a.kind} /> {KIND_LABEL[a.kind]} · {spec(a)}</span>
                    {gap && <span className="tag tag--gap">{gap}</span>}
                  </Link>
                  <label className="tile__check">
                    <input type="checkbox" checked={isSel} aria-label={`Select ${a.title}`}
                      onChange={(e) => pick(i, (e.nativeEvent as MouseEvent).shiftKey === true)} />
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="table-wrap">
            <table className="table asset-table">
              <caption className="visually-hidden">Assets</caption>
              <thead>
                <tr>
                  <th scope="col" className="col-check"><span className="visually-hidden">Selected</span></th>
                  <th scope="col">Asset</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="num">Size</th>
                  <th scope="col">Uploaded</th>
                  <th scope="col">Last edited</th>
                  <th scope="col" className="num">Used in</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a, i) => {
                  const gap = a11yGap(a);
                  const uses = usesOf(a.id, modules).length;
                  return (
                    <tr key={a.id} className={`${selected.has(a.id) ? 'is-selected' : ''}${a.id === assetId ? ' is-open' : ''}`}>
                      <td className="col-check">
                        <input type="checkbox" checked={selected.has(a.id)} aria-label={`Select ${a.title}`}
                          onChange={(e) => pick(i, (e.nativeEvent as MouseEvent).shiftKey === true)} />
                      </td>
                      <th scope="row">
                        <span className="asset-cell">
                          <Thumb asset={a} size="sm" />
                          <span>
                            <Link id={`asset-link-${a.id}`} to={contentRoutes.assets(a.id)} className="row-link" aria-current={a.id === assetId ? 'true' : undefined}>{a.title}</Link>
                            <span className="cell-sub">{a.fileName}{gap && <> · <span className="gap-text">{gap}</span></>}</span>
                          </span>
                        </span>
                      </th>
                      <td>{KIND_LABEL[a.kind]}</td>
                      <td className="num">{spec(a).split(' · ').pop()}</td>
                      <td><Byline stamp={a.created} stacked /></td>
                      <td><Byline stamp={a.edited} stacked /></td>
                      <td className="num">{uses ? `${uses} item${uses === 1 ? '' : 's'}` : <span className="muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {dragging && (
          <div className="dropzone" aria-hidden="true">
            <UploadIcon />
            <p>Drop files to upload</p>
            <span>Images, video, audio and documents</span>
          </div>
        )}
        <p className="drop-hint">Tip: drop files anywhere on this page to upload several at once.</p>
        <span className="visually-hidden" role="status" aria-live="polite">{status}</span>
        {toast && !progress && <p className="toast" aria-hidden="true">{toast}</p>}
      </section>

      {open && <AssetDetail key={open.id} asset={open} onClose={closeDetail} />}

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        alert
        title={`Delete ${selectedIds.length} asset${selectedIds.length === 1 ? '' : 's'}?`}
        description={
          <>
            <p>This can’t be undone.</p>
            {usedSelected.length > 0 && (
              <p className="warn-line"><strong>{usedSelected.length} item{usedSelected.length === 1 ? '' : 's'}</strong> in {new Set(usedSelected.map((u) => u.module.id)).size} module{new Set(usedSelected.map((u) => u.module.id)).size === 1 ? '' : 's'} show {selectedIds.length === 1 ? 'this asset' : 'these assets'}. They’ll lose their media.</p>
            )}
          </>
        }
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setConfirmDelete(false)} autoFocus>Cancel</button>
            <button type="button" className="btn btn--danger" onClick={doDelete}>Delete</button>
          </>
        }
      />

      <Dialog
        open={tagging}
        onClose={() => setTagging(false)}
        title={`Tag ${selectedIds.length} asset${selectedIds.length === 1 ? '' : 's'}`}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setTagging(false)}>Cancel</button>
            <button type="submit" form="tag-form" className="btn btn--primary">Add tag</button>
          </>
        }
      >
        <form id="tag-form" className="field" onSubmit={(e) => { e.preventDefault(); doTag(); }}>
          <label className="field__label" htmlFor="bulk-tag">Tag</label>
          <input id="bulk-tag" value={tagText} onChange={(e) => setTagText(e.target.value)} autoFocus
            list="known-tags" placeholder="For example: listening" />
          <datalist id="known-tags">{[...new Set(assets.flatMap((a) => a.tags))].sort().map((t) => <option key={t} value={t} />)}</datalist>
        </form>
      </Dialog>
    </div>
  );
}


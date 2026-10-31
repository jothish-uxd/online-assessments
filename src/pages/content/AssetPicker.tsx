import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Dialog from '../../components/content/Dialog';
import Thumb from '../../components/content/Thumb';
import { SearchIcon } from '../../components/content/icons';
import { useAssets } from '../../data/content/store';
import { KIND_LABEL, spec } from '../../data/content/format';
import type { AssetKind } from '../../data/content/types';
import { contentRoutes } from './routes';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (assetId: string) => void;
  /** Limit to some kinds, e.g. audio for listen-and-write */
  kinds?: AssetKind[];
  current?: string;
}

/** Choose media from the asset library for an item. */
export default function AssetPicker({ open, onClose, onPick, kinds, current }: Props) {
  const assets = useAssets();
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string | undefined>(current);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => (!kinds || kinds.includes(a.kind)) &&
      (!q || [a.title, a.fileName, ...a.tags].some((s) => s.toLowerCase().includes(q))));
  }, [assets, kinds, query]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={kinds?.length === 1 ? `Choose ${KIND_LABEL[kinds[0]].toLowerCase()}` : 'Choose media'}
      description={<p>From the asset library. <Link to={contentRoutes.assets()}>Upload new files in Assets</Link>.</p>}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" disabled={!chosen} onClick={() => { if (chosen) onPick(chosen); }}>Use this asset</button>
        </>
      }
    >
      <label className="search search--full">
        <SearchIcon />
        <span className="visually-hidden">Search assets</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, file or tag" autoFocus />
      </label>
      {shown.length ? (
        <fieldset className="picker">
          <legend className="visually-hidden">Assets</legend>
          {shown.map((a) => (
            <label key={a.id} className={`picker__opt${chosen === a.id ? ' is-on' : ''}`}>
              <input type="radio" name="asset-pick" checked={chosen === a.id} onChange={() => setChosen(a.id)}
                onDoubleClick={() => onPick(a.id)} />
              <Thumb asset={a} />
              <span className="tile__title">{a.title}</span>
              <span className="tile__meta">{KIND_LABEL[a.kind]} · {spec(a)}</span>
            </label>
          ))}
        </fieldset>
      ) : <p className="muted">No assets match.</p>}
    </Dialog>
  );
}

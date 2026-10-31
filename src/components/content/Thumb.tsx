import type { Asset } from '../../data/content/types';
import { useFileUrl } from '../../data/content/blobs';
import { duration, ext } from '../../data/content/format';

/** Small deterministic random numbers from an id, so placeholder art is stable. */
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
}

/** Monochrome placeholder picture: horizon, a few blocks and a sun, drawn from the id. */
function SceneArt({ id }: { id: string }) {
  const r = rng(id);
  const horizon = 55 + r() * 20;
  const blocks = Array.from({ length: 5 }, () => ({ x: r() * 140, w: 12 + r() * 30, h: 10 + r() * 34 }));
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className="thumb__art" aria-hidden="true">
      <rect width="160" height="100" className="art-sky" />
      <circle cx={30 + r() * 100} cy={18 + r() * 18} r={7 + r() * 6} className="art-sun" />
      <rect y={horizon} width="160" height={100 - horizon} className="art-ground" />
      {blocks.map((b, i) => <rect key={i} x={b.x} y={horizon - b.h} width={b.w} height={b.h} rx="1.5" className="art-block" />)}
    </svg>
  );
}

function Wave({ id, bars = 36 }: { id: string; bars?: number }) {
  const r = rng(id);
  return (
    <svg viewBox={`0 0 ${bars * 4} 40`} preserveAspectRatio="none" className="thumb__wave" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => {
        const h = 4 + Math.abs(Math.sin(i / 3.2)) * 18 + r() * 14;
        return <rect key={i} x={i * 4 + 1} y={20 - h / 2} width="2" height={h} rx="1" />;
      })}
    </svg>
  );
}

const Play = () => (
  <span className="thumb__play" aria-hidden="true">
    <svg viewBox="0 0 24 24"><path d="M9 7v10l8-5z" fill="currentColor" /></svg>
  </span>
);

/** Preview tile for an asset. Uploaded files show themselves; samples get drawn art. */
export default function Thumb({ asset, size = 'md' }: { asset: Asset; size?: 'sm' | 'md' }) {
  const url = useFileUrl(asset.id, asset.hasFile);
  const cls = `thumb thumb--${asset.kind} thumb--${size}`;

  if (asset.kind === 'image') {
    return <span className={cls}>{url ? <img src={url} alt="" loading="lazy" /> : <SceneArt id={asset.id} />}</span>;
  }
  if (asset.kind === 'video') {
    return (
      <span className={cls}>
        {url ? <video src={url} muted preload="metadata" aria-hidden="true" tabIndex={-1} /> : <SceneArt id={asset.id} />}
        <Play />
        {size === 'md' && asset.duration !== undefined && <span className="thumb__badge" aria-hidden="true">{duration(asset.duration)}</span>}
      </span>
    );
  }
  if (asset.kind === 'audio') {
    return (
      <span className={cls}>
        <Wave id={asset.id} bars={size === 'sm' ? 14 : 36} />
        {size === 'md' && asset.duration !== undefined && <span className="thumb__badge" aria-hidden="true">{duration(asset.duration)}</span>}
      </span>
    );
  }
  return (
    <span className={cls}>
      <span className="thumb__page" aria-hidden="true">
        <span /><span /><span /><span />
        <b>{ext(asset.fileName) || 'FILE'}</b>
      </span>
    </span>
  );
}

export { SceneArt, Wave };

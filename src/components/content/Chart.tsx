import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { ChartSpec, ChartType } from '../../data/content/types';

/*
  Charts in the a11y-charts style. Monochrome: bars and slices are told apart
  by fill pattern, lines by dash style and marker shape, scatter groups by
  marker shape and fill. Each chart has a written summary and a data table,
  so nothing depends on seeing it.
*/

export const CHART_TYPES: { value: ChartType; label: string; about: string }[] = [
  { value: 'vbar', label: 'Vertical bars', about: 'Compare a few values side by side' },
  { value: 'hbar', label: 'Horizontal bars', about: 'Compare values with long labels' },
  { value: 'stacked', label: 'Segmented bars', about: 'Show what each total is made of' },
  { value: 'donut', label: 'Donut', about: 'Show parts of one whole' },
  { value: 'line', label: 'Multi-line', about: 'Show change over time' },
  { value: 'scatter', label: 'Scatter plot', about: 'Show how two measures relate' },
];
export const chartTypeLabel = (t: ChartType) => CHART_TYPES.find((x) => x.value === t)!.label;
const NOUN: Record<ChartType, string> = { vbar: 'Vertical bar chart', hbar: 'Horizontal bar chart', stacked: 'Segmented bar chart', donut: 'Donut chart', line: 'Line chart', scatter: 'Scatter plot' };

const PATTERNS = ['diagonal', 'dots', 'vertical', 'horizontal', 'checker', 'crosshatch', 'solid'] as const;
const DASHES = ['', '7 5', '2 4', '10 4 2 4'];
const MARKERS = ['circle', 'square', 'triangle', 'diamond'] as const;
type Marker = (typeof MARKERS)[number];

const fmt = (n: number) => (Math.abs(n) >= 1000 ? n.toLocaleString('en-US') : String(Math.round(n * 100) / 100));
const withUnit = (n: number, unit?: string) => `${fmt(n)}${unit ?? ''}`;

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
const ticks = (max: number, n = 4) => Array.from({ length: n + 1 }, (_, i) => (max / n) * i);

/** Plain-language summary, like the one a screen reader hears. */
export function summarize(spec: ChartSpec, title: string): string {
  const u = spec.unit ?? '';
  const name = NOUN[spec.type];
  if (spec.type === 'scatter') {
    const pts = spec.points ?? [];
    const groups = [...new Set(pts.map((p) => p.group))];
    const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y);
    return `${name} of ${title}: ${pts.length} points in ${groups.length} groups (${groups.join(', ')}). ${spec.xLabel ?? 'x'} runs from ${fmt(Math.min(...xs))} to ${fmt(Math.max(...xs))}; ${spec.yLabel ?? 'y'} from ${fmt(Math.min(...ys))} to ${fmt(Math.max(...ys))}.`;
  }
  if (spec.type === 'line') {
    const parts = spec.series.map((s) => `${s.name} goes from ${withUnit(s.values[0], u)} to ${withUnit(s.values[s.values.length - 1], u)}`);
    return `${name} of ${title}, ${spec.categories[0]} to ${spec.categories[spec.categories.length - 1]}. ${parts.join('; ')}.`;
  }
  if (spec.type === 'stacked') {
    const totals = spec.categories.map((c, i) => ({ c, t: spec.series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0) }));
    const top = [...totals].sort((a, b) => b.t - a.t)[0];
    return `${name} of ${title}: ${spec.categories.length} bars, each split into ${spec.series.map((s) => s.name).join(', ')}. ${top.c} has the largest total, ${withUnit(top.t, u)}.`;
  }
  const vals = spec.series[0]?.values ?? [];
  const rows = spec.categories.map((c, i) => ({ c, v: vals[i] ?? 0 })).sort((a, b) => b.v - a.v);
  const total = vals.reduce((a, b) => a + b, 0);
  if (spec.type === 'donut') {
    return `${name} of ${title}: ${rows.length} parts. Largest is ${rows[0].c} at ${withUnit(rows[0].v, u)}; smallest is ${rows[rows.length - 1].c} at ${withUnit(rows[rows.length - 1].v, u)}. Total ${withUnit(total, u)}.`;
  }
  return `${name} of ${title}: ${rows.length} bars. Highest is ${rows[0].c} at ${withUnit(rows[0].v, u)}; lowest is ${rows[rows.length - 1].c} at ${withUnit(rows[rows.length - 1].v, u)}.`;
}

/* ---------- Shared SVG pieces ---------- */

export function ChartPatterns({ prefix }: { prefix: string }) {
  const bg = <rect width="8" height="8" style={{ fill: 'var(--bg)' }} />;
  return (
    <defs>
      <pattern id={`${prefix}-diagonal`} patternUnits="userSpaceOnUse" width="7" height="7">{bg}<path d="M-1 1 L1 -1 M0 7 L7 0 M6 8 L8 6" stroke="currentColor" strokeWidth="2.2" /></pattern>
      <pattern id={`${prefix}-dots`} patternUnits="userSpaceOnUse" width="7" height="7">{bg}<circle cx="3.5" cy="3.5" r="1.8" fill="currentColor" /></pattern>
      <pattern id={`${prefix}-vertical`} patternUnits="userSpaceOnUse" width="7" height="7">{bg}<rect width="2.6" height="7" fill="currentColor" /></pattern>
      <pattern id={`${prefix}-horizontal`} patternUnits="userSpaceOnUse" width="7" height="7">{bg}<rect width="7" height="2.6" fill="currentColor" /></pattern>
      <pattern id={`${prefix}-checker`} patternUnits="userSpaceOnUse" width="9" height="9">{bg}<rect width="4.5" height="4.5" fill="currentColor" /><rect x="4.5" y="4.5" width="4.5" height="4.5" fill="currentColor" /></pattern>
      <pattern id={`${prefix}-crosshatch`} patternUnits="userSpaceOnUse" width="6" height="6">{bg}<path d="M-1 1 L1 -1 M0 6 L6 0 M5 7 L7 5 M-1 5 L1 7 M0 0 L6 6 M5 -1 L7 1" stroke="currentColor" strokeWidth="1.1" /></pattern>
      <pattern id={`${prefix}-solid`} patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="currentColor" /></pattern>
    </defs>
  );
}
const fill = (prefix: string, i: number) => `url(#${prefix}-${PATTERNS[i % PATTERNS.length]})`;

function MarkerShape({ kind, x, y, r = 4.5, filled = true }: { kind: Marker; x: number; y: number; r?: number; filled?: boolean }) {
  const common = { stroke: 'currentColor', strokeWidth: 1.6, fill: filled ? 'currentColor' : 'var(--bg)' };
  if (kind === 'circle') return <circle cx={x} cy={y} r={r} {...common} />;
  if (kind === 'square') return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} {...common} />;
  if (kind === 'triangle') return <path d={`M${x} ${y - r * 1.15} L${x + r * 1.1} ${y + r * 0.85} L${x - r * 1.1} ${y + r * 0.85} Z`} {...common} />;
  return <path d={`M${x} ${y - r * 1.25} L${x + r * 1.15} ${y} L${x} ${y + r * 1.25} L${x - r * 1.15} ${y} Z`} {...common} />;
}

export function Swatch({ i, kind }: { i: number; kind: 'fill' | 'line' | 'marker' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="cswatch" viewBox="0 0 24 16" aria-hidden="true" focusable="false">
      <ChartPatterns prefix={id} />
      {kind === 'fill' && <rect x="2" y="1.5" width="20" height="13" fill={fill(id, i)} stroke="currentColor" />}
      {kind === 'line' && <><line x1="1" y1="8" x2="23" y2="8" stroke="currentColor" strokeWidth="2" strokeDasharray={DASHES[i % DASHES.length]} /><MarkerShape kind={MARKERS[i % MARKERS.length]} x={12} y={8} r={3.2} /></>}
      {kind === 'marker' && <MarkerShape kind={MARKERS[i % MARKERS.length]} x={12} y={8} r={4} filled={i % 2 === 0} />}
    </svg>
  );
}

/* ---------- The chart ---------- */

interface Props { spec: ChartSpec; title: string; size?: 'full' | 'thumb'; showTable?: boolean }

export default function Chart({ spec, title, size = 'full', showTable = true }: Props) {
  const raw = useId();
  const id = raw.replace(/:/g, '');
  const [table, setTable] = useState(false);
  const thumb = size === 'thumb';
  const summary = summarize(spec, title);
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const svg = <ChartSvg spec={spec} prefix={id} thumb={thumb} width={width} />;
  if (thumb) return <span className="chart chart--thumb" aria-hidden="true">{svg}</span>;

  const legendKind = spec.type === 'line' ? 'line' : spec.type === 'scatter' ? 'marker' : 'fill';
  const legend = spec.type === 'scatter'
    ? [...new Set((spec.points ?? []).map((p) => p.group))]
    : spec.type === 'stacked' || spec.type === 'line' ? spec.series.map((s) => s.name)
    : spec.type === 'donut' ? spec.categories : [];

  return (
    <figure className="chart" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="chart__title">{title}</figcaption>
      <div ref={plotRef} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-s`} className="chart__plot">{svg}</div>
      {legend.length > 0 && (
        <ul className="chart__legend" aria-label="Key">
          {legend.map((l, i) => (
            <li key={l}><Swatch i={i} kind={legendKind} />{l}{spec.type === 'donut' && <span className="muted">&nbsp;{withUnit(spec.series[0].values[i], spec.unit)}</span>}</li>
          ))}
        </ul>
      )}
      <p id={`${id}-s`} className="chart__summary">{summary}</p>
      {showTable && (
        <>
          <button type="button" className="link-button chart__toggle" aria-expanded={table} aria-controls={`${id}-d`} onClick={() => setTable(!table)}>
            {table ? 'Hide' : 'Show'} data table
          </button>
          {table && <DataTable id={`${id}-d`} spec={spec} title={title} />}
        </>
      )}
    </figure>
  );
}

function DataTable({ id, spec, title }: { id: string; spec: ChartSpec; title: string }) {
  const u = spec.unit ?? '';
  let head: ReactNode; let body: ReactNode;
  if (spec.type === 'scatter') {
    head = <tr><th scope="col">Group</th><th scope="col">{spec.xLabel ?? 'x'}</th><th scope="col">{spec.yLabel ?? 'y'}</th></tr>;
    body = (spec.points ?? []).map((p, i) => <tr key={i}><th scope="row">{p.group}</th><td className="num">{fmt(p.x)}</td><td className="num">{fmt(p.y)}</td></tr>);
  } else if (spec.series.length > 1) {
    head = <tr><th scope="col">{spec.xLabel ?? ''}</th>{spec.series.map((s) => <th key={s.name} scope="col" className="num">{s.name}</th>)}</tr>;
    body = spec.categories.map((c, i) => <tr key={c}><th scope="row">{c}</th>{spec.series.map((s) => <td key={s.name} className="num">{withUnit(s.values[i], u)}</td>)}</tr>);
  } else {
    head = <tr><th scope="col">{spec.xLabel ?? 'Label'}</th><th scope="col" className="num">{spec.yLabel ?? spec.series[0]?.name ?? 'Value'}</th></tr>;
    body = spec.categories.map((c, i) => <tr key={c}><th scope="row">{c}</th><td className="num">{withUnit(spec.series[0].values[i], u)}</td></tr>);
  }
  return (
    <div className="table-wrap" id={id}>
      <table className="table table--compact chart__table"><caption className="visually-hidden">{title}</caption><thead>{head}</thead><tbody>{body}</tbody></table>
    </div>
  );
}

function ChartSvg({ spec, prefix, thumb, width = 560 }: { spec: ChartSpec; prefix: string; thumb: boolean; width?: number }) {
  const W = thumb ? 160 : width;
  const narrow = W < 420;
  const H = thumb ? 100 : spec.type === 'hbar' || spec.type === 'stacked' ? Math.max(180, spec.categories.length * 44 + 50) : spec.type === 'donut' ? Math.min(300, Math.max(220, W * 0.55)) : Math.round(Math.min(320, Math.max(230, W * 0.55)));
  const pad = thumb ? { t: 8, r: 8, b: 8, l: 8 } : spec.type === 'hbar' || spec.type === 'stacked' ? { t: 12, r: 44, b: 36, l: narrow ? 104 : 124 } : { t: 18, r: 14, b: 46, l: 52 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const u = spec.unit ?? '';
  const textCls = 'chart__text';
  const axisLabels = !thumb;

  const frame = (children: ReactNode) => (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart__svg" preserveAspectRatio={thumb ? 'xMidYMid meet' : 'xMidYMid meet'} aria-hidden="true" focusable="false">
      <ChartPatterns prefix={prefix} />
      {children}
    </svg>
  );

  if (spec.type === 'donut') {
    const vals = spec.series[0]?.values ?? [];
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = W / 2, cy = H / 2, R = Math.min(iw, ih) / 2, r = R * 0.55;
    let a0 = -Math.PI / 2;
    const arcs = vals.map((v, i) => {
      const a1 = a0 + (v / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a: number, rad: number) => `${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}`;
      const d = `M${p(a0, R)} A${R} ${R} 0 ${large} 1 ${p(a1, R)} L${p(a1, r)} A${r} ${r} 0 ${large} 0 ${p(a0, r)} Z`;
      const mid = (a0 + a1) / 2;
      a0 = a1;
      return { d, i, mid, v };
    });
    return frame(<>
      {arcs.map((a) => <path key={a.i} d={a.d} fill={fill(prefix, a.i)} stroke="currentColor" strokeWidth={thumb ? 1 : 1.5} />)}
      {!thumb && <text x={cx} y={cy + 5} textAnchor="middle" className={`${textCls} chart__text--big`}>{withUnit(total, u)}</text>}
    </>);
  }

  if (spec.type === 'scatter') {
    const pts = spec.points ?? [];
    const groups = [...new Set(pts.map((p) => p.group))];
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const span = (lo: number, hi: number) => { const d = (hi - lo) || 1; return [lo - d * 0.1, hi + d * 0.1]; };
    const [x0, x1] = span(Math.min(...xs), Math.max(...xs));
    const [y0, y1] = span(Math.min(...ys), Math.max(...ys));
    const X = (v: number) => pad.l + ((v - x0) / (x1 - x0)) * iw;
    const Y = (v: number) => pad.t + ih - ((v - y0) / (y1 - y0)) * ih;
    const xt = Array.from({ length: 5 }, (_, i) => x0 + ((x1 - x0) / 4) * i);
    const yt = Array.from({ length: 5 }, (_, i) => y0 + ((y1 - y0) / 4) * i);
    return frame(<>
      {!thumb && yt.map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} className="chart__grid" /><text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" className={textCls}>{fmt(Math.round(t))}</text></g>)}
      {!thumb && xt.map((t) => <text key={t} x={X(t)} y={H - pad.b + 16} textAnchor="middle" className={textCls}>{fmt(Math.round(t))}</text>)}
      <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} className="chart__axis" />
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + ih} className="chart__axis" />
      {pts.map((p, i) => { const g = groups.indexOf(p.group); return <MarkerShape key={i} kind={MARKERS[g % MARKERS.length]} x={X(p.x)} y={Y(p.y)} r={thumb ? 2.6 : 5} filled={g % 2 === 0} />; })}
      {axisLabels && <AxisLabels W={W} H={H} pad={pad} spec={spec} />}
    </>);
  }

  if (spec.type === 'line') {
    const max = niceMax(Math.max(...spec.series.flatMap((s) => s.values)));
    const n = spec.categories.length;
    const X = (i: number) => pad.l + (n === 1 ? iw / 2 : (iw / (n - 1)) * i);
    const Y = (v: number) => pad.t + ih - (v / max) * ih;
    return frame(<>
      {!thumb && ticks(max).map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} className="chart__grid" /><text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" className={textCls}>{fmt(t)}</text></g>)}
      {!thumb && spec.categories.map((c, i) => <text key={c} x={X(i)} y={H - pad.b + 16} textAnchor="middle" className={textCls}>{c}</text>)}
      <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} className="chart__axis" />
      {spec.series.map((s, si) => (
        <g key={s.name}>
          <polyline points={s.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth={thumb ? 1.4 : 2.2} strokeDasharray={DASHES[si % DASHES.length]} />
          {!thumb && s.values.map((v, i) => <MarkerShape key={i} kind={MARKERS[si % MARKERS.length]} x={X(i)} y={Y(v)} r={4} />)}
        </g>
      ))}
      {axisLabels && <AxisLabels W={W} H={H} pad={pad} spec={spec} />}
    </>);
  }

  // Bars: vertical, horizontal, segmented
  const totals = spec.categories.map((_, i) => spec.series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const max = niceMax(Math.max(...(spec.type === 'stacked' ? totals : spec.series[0]?.values ?? [1])));
  const n = spec.categories.length;

  if (spec.type === 'vbar') {
    const band = iw / n; const bw = Math.min(56, band * 0.62);
    const Y = (v: number) => pad.t + ih - (v / max) * ih;
    return frame(<>
      {!thumb && ticks(max).map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} className="chart__grid" /><text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" className={textCls}>{fmt(t)}</text></g>)}
      {spec.series[0].values.map((v, i) => {
        const x = pad.l + band * i + (band - bw) / 2;
        return (
          <g key={i}>
            <rect x={x} y={Y(v)} width={bw} height={pad.t + ih - Y(v)} fill={fill(prefix, i)} stroke="currentColor" strokeWidth={thumb ? 1 : 1.4} />
            {!thumb && <text x={x + bw / 2} y={Y(v) - 6} textAnchor="middle" className={`${textCls} chart__text--val`}>{withUnit(v, u)}</text>}
            {!thumb && <text x={x + bw / 2} y={H - pad.b + 16} textAnchor="middle" className={textCls}>{spec.categories[i]}</text>}
          </g>
        );
      })}
      <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} className="chart__axis" />
      {axisLabels && <AxisLabels W={W} H={H} pad={pad} spec={spec} />}
    </>);
  }

  // hbar and stacked
  const band = ih / n; const bh = Math.min(28, band * 0.64);
  const X = (v: number) => pad.l + (v / max) * iw;
  return frame(<>
    {!thumb && ticks(max).map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1={pad.t} y2={pad.t + ih} className="chart__grid" /><text x={X(t)} y={H - pad.b + 16} textAnchor="middle" className={textCls}>{fmt(t)}</text></g>)}
    {spec.categories.map((c, i) => {
      const y = pad.t + band * i + (band - bh) / 2;
      let acc = 0;
      return (
        <g key={c}>
          {!thumb && <text x={pad.l - 8} y={y + bh / 2 + 4} textAnchor="end" className={textCls}>{c}</text>}
          {(spec.type === 'stacked' ? spec.series : [spec.series[0]]).map((s, si) => {
            const v = s.values[i] ?? 0;
            const x = X(acc); acc += v;
            return <rect key={s.name} x={x} y={y} width={X(acc) - x} height={bh} fill={fill(prefix, spec.type === 'stacked' ? si : i)} stroke="currentColor" strokeWidth={thumb ? 1 : 1.4} />;
          })}
          {!thumb && <text x={X(totals[i] ?? 0) + 6} y={y + bh / 2 + 4} className={`${textCls} chart__text--val`}>{withUnit(spec.type === 'stacked' ? totals[i] : spec.series[0].values[i], u)}</text>}
        </g>
      );
    })}
    <line x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + ih} className="chart__axis" />
    {axisLabels && <AxisLabels W={W} H={H} pad={pad} spec={spec} />}
  </>);
}

function AxisLabels({ W, H, pad, spec }: { W: number; H: number; pad: { t: number; r: number; b: number; l: number }; spec: ChartSpec }) {
  return (
    <>
      {spec.xLabel && <text x={pad.l + (W - pad.l - pad.r) / 2} y={H - 6} textAnchor="middle" className="chart__text chart__text--axis">{spec.xLabel}</text>}
      {spec.yLabel && spec.type !== 'hbar' && spec.type !== 'stacked' && (
        <text transform={`translate(12 ${pad.t + (H - pad.t - pad.b) / 2}) rotate(-90)`} textAnchor="middle" className="chart__text chart__text--axis">{spec.yLabel}</text>
      )}
    </>
  );
}

import { useId, useMemo, useState } from 'react';
import Dialog from '../../components/content/Dialog';
import Select from '../../components/Select';
import Chart, { CHART_TYPES } from '../../components/content/Chart';
import { createChart } from '../../data/content/store';
import type { Asset, ChartSpec, ChartType } from '../../data/content/types';

const SAMPLE: Record<ChartType, string> = {
  vbar: 'Squadron, Sorties\nRed, 42\nGold, 31\nRogue, 55',
  hbar: 'Ship, Repairs waiting\nX-wing, 24\nY-wing, 17\nA-wing, 9',
  stacked: 'Base, Burns, Cold, Crashes\nEcho, 9, 41, 14\nHome One, 22, 5, 31',
  donut: 'Use, Share\nPatrols, 45\nTraining, 30\nReserve, 25',
  line: 'Week, Echo Base, Home One\nW1, 120, 90\nW2, 104, 95\nW3, 88, 101',
  scatter: 'Squadron, Reaction time (ms), Accuracy (%)\nRed, 210, 82\nRed, 240, 76\nGold, 300, 64\nGold, 280, 70',
};

/** Reads pasted rows: a header row, then one row per category (scatter: group, x, y). */
export function parseChart(type: ChartType, text: string, unit: string): { spec?: ChartSpec; error?: string } {
  const rows = text.split('\n').map((l) => l.split(/\t|,/).map((c) => c.trim())).filter((r) => r.some(Boolean));
  if (rows.length < 3) return { error: 'Add a header row and at least two rows of data.' };
  const [head, ...body] = rows;
  const bad = (r: number, c: string) => ({ error: `Row ${r + 2}: “${c}” isn’t a number.` });
  if (type === 'scatter') {
    if (head.length < 3) return { error: 'Scatter data needs three columns: group, x, y.' };
    const points: NonNullable<ChartSpec['points']> = [];
    for (const [i, r] of body.entries()) {
      const x = Number(r[1]); const y = Number(r[2]);
      if (Number.isNaN(x) || r[1] === '' || r[1] === undefined) return bad(i, r[1] ?? '');
      if (Number.isNaN(y) || r[2] === '' || r[2] === undefined) return bad(i, r[2] ?? '');
      points.push({ group: r[0] || 'Group', x, y });
    }
    return { spec: { type, categories: [], series: [], points, xLabel: head[1], yLabel: head[2], unit: unit || undefined } };
  }
  if (head.length < 2) return { error: 'Add at least one column of values after the labels.' };
  const names = (type === 'stacked' || type === 'line') ? head.slice(1) : head.slice(1, 2);
  if (type === 'stacked' && names.length < 2) return { error: 'Segmented bars need two or more value columns.' };
  const series = names.map((name) => ({ name, values: [] as number[] }));
  for (const [i, r] of body.entries()) {
    for (const [si, s] of series.entries()) {
      const v = Number(r[si + 1]);
      if (r[si + 1] === undefined || r[si + 1] === '' || Number.isNaN(v)) return bad(i, r[si + 1] ?? '');
      if (v < 0 && type !== 'line') return { error: `Row ${i + 2}: bars and donuts need values of 0 or more.` };
      s.values.push(v);
    }
  }
  return {
    spec: {
      type, categories: body.map((r) => r[0]), series, unit: unit || undefined,
      xLabel: head[0] || undefined, yLabel: type === 'vbar' || type === 'hbar' ? names[0] : undefined,
    },
  };
}

export default function NewChartDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (a: Asset) => void }) {
  const id = useId();
  const [type, setType] = useState<ChartType>('vbar');
  const [title, setTitle] = useState('');
  const [data, setData] = useState(SAMPLE.vbar);
  const [unit, setUnit] = useState('');
  const [tried, setTried] = useState(false);
  const parsed = useMemo(() => parseChart(type, data, unit), [type, data, unit]);

  const reset = () => { setType('vbar'); setTitle(''); setData(SAMPLE.vbar); setUnit(''); setTried(false); };
  const close = () => { reset(); onClose(); };
  const submit = () => {
    setTried(true);
    if (!title.trim() || !parsed.spec) return;
    const a = createChart({ title: title.trim(), chart: parsed.spec, alt: '', tags: ['chart'] });
    reset();
    onCreated(a);
  };

  return (
    <Dialog open={open} onClose={close} size="lg" title="New chart"
      description={<p>Charts are drawn from data, so they stay sharp, read the same in light and dark, and come with a summary and data table for screen readers.</p>}
      footer={<>
        <button type="button" className="btn btn--secondary" onClick={close}>Cancel</button>
        <button type="submit" form={`${id}-f`} className="btn btn--primary">Create chart</button>
      </>}>
      <div className="newchart">
        <form id={`${id}-f`} className="form" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-t`}>Title</label>
            <input id={`${id}-t`} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={tried && !title.trim()}
              aria-describedby={tried && !title.trim() ? `${id}-te` : undefined} placeholder="For example: Sorties flown last month" autoFocus />
            {tried && !title.trim() && <span id={`${id}-te`} className="field-error-text">Give the chart a title. Candidates hear it first.</span>}
          </div>
          <Select label="Chart type" value={type} describedBy={`${id}-th`}
            options={CHART_TYPES.map((c) => ({ value: c.value, label: c.label }))}
            onChange={(v) => { if (data === SAMPLE[type]) setData(SAMPLE[v]); setType(v); }} />
          <span id={`${id}-th`} className="field-help">{CHART_TYPES.find((c) => c.value === type)!.about}.</span>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-d`}>Data</label>
            <textarea id={`${id}-d`} rows={7} className="mono" value={data} onChange={(e) => setData(e.target.value)}
              aria-invalid={!!parsed.error} aria-describedby={`${id}-dh`} spellCheck={false} />
            <span id={`${id}-dh`} className={parsed.error ? 'field-help field-error-text' : 'field-help'}>
              {parsed.error ?? (type === 'scatter'
                ? 'Paste from a spreadsheet or type comma-separated rows. Header: group, x label, y label.'
                : 'Paste from a spreadsheet or type comma-separated rows. The first row names the columns.')}
            </span>
          </div>
          <div className="field field--narrow">
            <label className="field__label" htmlFor={`${id}-u`}>Unit <span className="muted">(optional)</span></label>
            <input id={`${id}-u`} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="%" />
          </div>
        </form>
        <div className="newchart__preview" aria-label="Preview" role="region">
          <span className="eyebrow">Preview</span>
          {parsed.spec ? <Chart spec={parsed.spec} title={title.trim() || 'Untitled chart'} showTable={false} /> : <p className="muted small">Fix the data to see the chart.</p>}
        </div>
      </div>
    </Dialog>
  );
}

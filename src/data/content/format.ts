import type { Asset } from './types';

export function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(n < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

export function duration(s?: number) {
  if (s === undefined) return '';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}

/** Spoken form for screen readers, e.g. "2 minutes 14 seconds". */
export function durationLong(s?: number) {
  if (s === undefined) return '';
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return [m && `${m} minute${m === 1 ? '' : 's'}`, r && `${r} second${r === 1 ? '' : 's'}`].filter(Boolean).join(' ') || '0 seconds';
}

const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today, 3:14 PM", "Yesterday, 9:02 AM" or "Oct 21, 2026". With `time`, older dates get the time too. */
export function when(iso: string, time = false) {
  const d = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (days === 0) return `Today, ${timeFmt.format(d)}`;
  if (days === 1) return `Yesterday, ${timeFmt.format(d)}`;
  return time ? `${dayFmt.format(d)}, ${timeFmt.format(d)}` : dayFmt.format(d);
}

export const KIND_LABEL: Record<Asset['kind'], string> = { image: 'Image', video: 'Video', audio: 'Audio', document: 'Document' };

/** One-line spec: "2400 × 1600 · 2.3 MB" or "2:14 · 3.1 MB" */
export function spec(a: Asset) {
  const parts: string[] = [];
  if (a.kind === 'image' && a.width) parts.push(`${a.width} × ${a.height}`);
  if (a.duration !== undefined) parts.push(duration(a.duration));
  parts.push(bytes(a.size));
  return parts.join(' · ');
}

export const ext = (name: string) => (name.match(/\.([^.]+)$/)?.[1] ?? '').toUpperCase();

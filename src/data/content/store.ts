import { useStored, peek, put, resetStore } from '../store';
import { SEED_ASSETS } from './seedAssets';
import { SEED_MODULES } from './seedModules';
import { ME } from './people';
import { typeInfo } from './itemTypes';
import type { Activity, Asset, AssetKind, Item, ItemType, Module, Stamp } from './types';
import { clearFiles, deleteFile, probe, saveFile } from './blobs';

/*
  Assessment content state. Every change is stamped with who made it and when,
  and anything worth auditing is added to the asset's or module's activity.
*/

const ASSETS = 'content:assets';
const MODULES = 'content:modules';

export const now = (): Stamp => ({ by: ME, at: new Date().toISOString() });
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

const assets = () => peek<Asset[]>(ASSETS) ?? SEED_ASSETS;
const modules = () => peek<Module[]>(MODULES) ?? SEED_MODULES;

export const useAssets = () => useStored<Asset[]>(ASSETS, () => SEED_ASSETS)[0];
export const useModules = () => useStored<Module[]>(MODULES, () => SEED_MODULES)[0];

/** Add an activity, folding repeated edits by the same person within 10 minutes into one. */
function addActivity(history: Activity[], action: string): Activity[] {
  const entry = { ...now(), action };
  const last = history[0];
  if (last && last.by === entry.by && last.action === action &&
      Date.parse(entry.at) - Date.parse(last.at) < 10 * 60_000) {
    return [entry, ...history.slice(1)];
  }
  return [entry, ...history];
}

/* ---------- Assets ---------- */

export function kindOf(mime: string, name: string): AssetKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return 'image';
  if (/\.(mp4|mov|webm)$/i.test(name)) return 'video';
  if (/\.(mp3|wav|m4a|ogg)$/i.test(name)) return 'audio';
  return 'document';
}

const titleFrom = (name: string) =>
  name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^./, (c) => c.toUpperCase()) || 'Untitled';

/** Upload files into the library. Returns the new assets, newest first. */
export async function uploadFiles(files: File[], onEach?: (done: number) => void): Promise<Asset[]> {
  const added: Asset[] = [];
  for (const file of files) {
    const id = uid('a');
    const meta = await probe(file);
    await saveFile(id, file);
    const stamp = now();
    added.unshift({
      id, kind: kindOf(file.type, file.name), title: titleFrom(file.name), fileName: file.name,
      mime: file.type || 'application/octet-stream', size: file.size, ...meta,
      alt: '', caption: '', transcript: '', tags: [],
      created: stamp, edited: stamp, history: [{ ...stamp, action: 'Uploaded' }], hasFile: true,
    });
    onEach?.(added.length);
  }
  put(ASSETS, [...added, ...assets()]);
  return added;
}

export function updateAsset(id: string, patch: Partial<Pick<Asset, 'title' | 'alt' | 'caption' | 'transcript' | 'tags'>>, action = 'Edited details') {
  put(ASSETS, assets().map((a) => a.id === id ? { ...a, ...patch, edited: now(), history: addActivity(a.history, action) } : a));
}

export function tagAssets(ids: string[], tag: string) {
  const t = tag.trim().toLowerCase();
  if (!t) return;
  put(ASSETS, assets().map((a) => ids.includes(a.id) && !a.tags.includes(t)
    ? { ...a, tags: [...a.tags, t], edited: now(), history: addActivity(a.history, `Tagged “${t}”`) }
    : a));
}

/** Delete assets, and take them off any item that showed them. */
export function deleteAssets(ids: string[]) {
  put(ASSETS, assets().filter((a) => !ids.includes(a.id)));
  ids.forEach((id) => { void deleteFile(id); });
  const touched = modules().map((m) => {
    if (!m.items.some((i) => i.assetId && ids.includes(i.assetId))) return m;
    return {
      ...m, edited: now(), history: addActivity(m.history, 'Removed deleted media'),
      items: m.items.map((i) => i.assetId && ids.includes(i.assetId) ? { ...i, assetId: undefined, edited: now() } : i),
    };
  });
  put(MODULES, touched);
}

/** Modules and item positions where an asset is used. */
export function usesOf(assetId: string, list: Module[]) {
  return list.flatMap((m) => m.items
    .map((it, i) => ({ module: m, item: it, position: i + 1 }))
    .filter((u) => u.item.assetId === assetId));
}

/* ---------- Modules ---------- */

export function createModule(fields: Pick<Module, 'name' | 'description' | 'kind'>): Module {
  const stamp = now();
  const m: Module = {
    id: uid('m'), ...fields, status: 'draft', items: [],
    created: stamp, edited: stamp, history: [{ ...stamp, action: 'Created the module' }],
  };
  put(MODULES, [m, ...modules()]);
  return m;
}

function patchModule(id: string, fn: (m: Module) => Module, action?: string) {
  put(MODULES, modules().map((m) => {
    if (m.id !== id) return m;
    const next = fn(m);
    return { ...next, edited: now(), history: action ? addActivity(next.history, action) : next.history };
  }));
}

export function updateModule(id: string, patch: Partial<Pick<Module, 'name' | 'description' | 'status'>>, action = 'Edited details') {
  patchModule(id, (m) => ({ ...m, ...patch }), action);
}

export function deleteModule(id: string) {
  put(MODULES, modules().filter((m) => m.id !== id));
}

export function duplicateModule(id: string): Module | undefined {
  const src = modules().find((m) => m.id === id);
  if (!src) return;
  const stamp = now();
  const copy: Module = {
    ...src, id: uid('m'), name: `${src.name} (copy)`, status: 'draft',
    items: src.items.map((i) => ({ ...i, id: uid('i'), choices: i.choices?.map((c) => ({ ...c, id: uid('c') })), created: stamp, edited: stamp })),
    created: stamp, edited: stamp, history: [{ ...stamp, action: `Duplicated from “${src.name}”` }],
  };
  put(MODULES, [copy, ...modules()]);
  return copy;
}

export function newItem(type: ItemType): Item {
  const stamp = now();
  const choices = type === 'single' || type === 'multi'
    ? [{ id: uid('c'), text: '', correct: false }, { id: uid('c'), text: '', correct: false }]
    : undefined;
  const settings: Item['settings'] =
    type === 'single' ? { shuffle: true }
    : type === 'multi' ? { shuffle: true, allOrNothing: false }
    : type === 'paragraph' ? { minWords: 50, maxWords: 300, guidance: '' }
    : type === 'spoken' ? { prepSeconds: 30, maxSeconds: 120, attempts: 1, guidance: '' }
    : type === 'listen-write' ? { plays: 2, maxWords: 200, guidance: '' }
    : type === 'content' ? { purpose: 'instructions', requireAck: false, ackLabel: 'I understand' }
    : {};
  return {
    id: uid('i'), type, prompt: '', title: type === 'content' ? '' : undefined, choices,
    points: typeInfo(type).scored ? 1 : 0, required: true, settings, created: stamp, edited: stamp,
  };
}

export function addItem(moduleId: string, item: Item) {
  patchModule(moduleId, (m) => ({ ...m, items: [...m.items, item] }), `Added item ${modules().find((m) => m.id === moduleId)!.items.length + 1}`);
}

export function updateItem(moduleId: string, itemId: string, patch: Partial<Item>) {
  patchModule(moduleId, (m) => ({
    ...m, items: m.items.map((i) => i.id === itemId ? { ...i, ...patch, edited: now() } : i),
  }), `Edited item ${(modules().find((m) => m.id === moduleId)?.items.findIndex((i) => i.id === itemId) ?? 0) + 1}`);
}

export function moveItem(moduleId: string, itemId: string, delta: -1 | 1) {
  patchModule(moduleId, (m) => {
    const items = [...m.items];
    const i = items.findIndex((x) => x.id === itemId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= items.length) return m;
    [items[i], items[j]] = [items[j], items[i]];
    return { ...m, items };
  }, 'Reordered items');
}

export function duplicateItem(moduleId: string, itemId: string): Item | undefined {
  const m = modules().find((x) => x.id === moduleId);
  const i = m?.items.findIndex((x) => x.id === itemId) ?? -1;
  if (!m || i < 0) return;
  const stamp = now();
  const src = m.items[i];
  const copy: Item = { ...src, id: uid('i'), choices: src.choices?.map((c) => ({ ...c, id: uid('c') })), created: stamp, edited: stamp };
  patchModule(moduleId, (x) => ({ ...x, items: [...x.items.slice(0, i + 1), copy, ...x.items.slice(i + 1)] }), `Duplicated item ${i + 1}`);
  return copy;
}

export function deleteItem(moduleId: string, itemId: string) {
  const i = modules().find((x) => x.id === moduleId)?.items.findIndex((x) => x.id === itemId) ?? 0;
  patchModule(moduleId, (m) => ({ ...m, items: m.items.filter((x) => x.id !== itemId) }), `Deleted item ${i + 1}`);
}

export const choiceId = () => uid('c');

/* ---------- Checks ---------- */

/** What's missing before an item is ready. Empty when it's ready. */
export function itemIssues(item: Item): string[] {
  const out: string[] = [];
  const info = typeInfo(item.type);
  if (item.type === 'content') {
    if (!item.title?.trim()) out.push('Add a heading.');
    if (!item.prompt.trim()) out.push('Add the text candidates read.');
  } else if (!item.prompt.trim()) out.push(item.type === 'spoken' ? 'Add the content or question candidates respond to.' : 'Add the question.');
  if (item.choices) {
    const filled = item.choices.filter((c) => c.text.trim());
    const correct = item.choices.filter((c) => c.correct);
    if (filled.length < item.choices.length) out.push('Fill in or remove empty choices.');
    if (item.choices.length < 2) out.push('Add at least two choices.');
    if (item.type === 'single' && correct.length !== 1) out.push('Mark exactly one correct choice.');
    if (item.type === 'multi' && correct.length < 1) out.push('Mark at least one correct choice.');
  }
  if (item.type === 'listen-write' && !item.assetId) out.push('Attach the audio candidates listen to.');
  if (info.scored && item.points <= 0) out.push('Give it at least 1 point.');
  if (item.settings.minWords && item.settings.maxWords && item.settings.minWords > item.settings.maxWords) out.push('Minimum words is more than the maximum.');
  return out;
}

export const moduleIssues = (m: Module) => m.items.filter((i) => itemIssues(i).length).length;
export const modulePoints = (m: Module) => m.items.reduce((s, i) => s + (typeInfo(i.type).scored ? i.points : 0), 0);

/** Assets missing the text people using assistive tech need. */
export function a11yGap(a: Asset): string | null {
  if (a.kind === 'image' && !a.alt.trim()) return 'No alt text';
  if ((a.kind === 'audio' || a.kind === 'video') && !a.transcript.trim()) return 'No transcript';
  return null;
}

export function resetContent() {
  resetStore((k) => k.startsWith('content:'));
  void clearFiles();
}

import { useEffect, useState } from 'react';

/*
  Files uploaded in this browser are kept in IndexedDB, keyed by asset id,
  so previews survive a reload. Nothing is sent anywhere.
*/

const DB = 'oa-assets';
const STORE = 'files';
const urls = new Map<string, string>();

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFile(id: string, file: Blob) {
  try { await tx('readwrite', (s) => s.put(file, id)); } catch { /* storage blocked: preview lasts this session */ }
  urls.set(id, URL.createObjectURL(file));
}

export async function deleteFile(id: string) {
  const url = urls.get(id);
  if (url) { URL.revokeObjectURL(url); urls.delete(id); }
  try { await tx('readwrite', (s) => s.delete(id)); } catch { /* nothing stored */ }
}

export async function clearFiles() {
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls.clear();
  try { await tx('readwrite', (s) => s.clear()); } catch { /* nothing stored */ }
}

async function getUrl(id: string): Promise<string | undefined> {
  if (urls.has(id)) return urls.get(id);
  try {
    const blob = await tx<Blob | undefined>('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>);
    if (!blob) return undefined;
    const url = URL.createObjectURL(blob);
    urls.set(id, url);
    return url;
  } catch { return undefined; }
}

/** Object URL for an uploaded asset's file, or undefined for sample assets. */
export function useFileUrl(id: string, hasFile: boolean) {
  const [url, setUrl] = useState<string | undefined>(() => urls.get(id));
  useEffect(() => {
    if (!hasFile) { setUrl(undefined); return; }
    let live = true;
    getUrl(id).then((u) => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [id, hasFile]);
  return url;
}

/** Read size, dimensions and duration from a file before it is added. */
export function probe(file: File): Promise<{ width?: number; height?: number; duration?: number }> {
  const url = URL.createObjectURL(file);
  const done = <T,>(v: T) => { URL.revokeObjectURL(url); return v; };
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => resolve(done({ width: img.naturalWidth, height: img.naturalHeight }));
      img.onerror = () => resolve(done({}));
      img.src = url;
    } else if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        const v = el as HTMLVideoElement;
        resolve(done({
          duration: Number.isFinite(el.duration) ? Math.round(el.duration) : undefined,
          width: v.videoWidth || undefined, height: v.videoHeight || undefined,
        }));
      };
      el.onerror = () => resolve(done({}));
      el.src = url;
    } else resolve(done({}));
  });
}

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/*
  A tiny persisted store for edits made in the apps.
  Values live in memory and are mirrored to localStorage when it is available,
  so a demo keeps its changes across reloads in the same browser.
  Nothing leaves the browser.
*/

const KEY = 'oa-store-v1';
type State = Record<string, unknown>;

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as State) : {};
  } catch {
    return {};
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function write(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked: keep in memory */ }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Read a stored value without subscribing (for derived data outside components). */
export function peek<T>(key: string): T | undefined {
  return state[key] as T | undefined;
}

/** useState-like hook backed by the store. `initial` is used until something is saved. */
export function useStored<T>(key: string, initial: () => T): [T, (next: T | ((prev: T) => T)) => void] {
  const fallback = useMemo(initial, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const stored = useSyncExternalStore(subscribe, () => state[key] as T | undefined);
  const value = stored ?? fallback;
  const set = useCallback((next: T | ((prev: T) => T)) => {
    const prev = (state[key] as T | undefined) ?? fallback;
    const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
    write({ ...state, [key]: resolved });
  }, [key, fallback]);
  return [value, set];
}

/** Subscribe to every store change (for lists that derive from many keys). */
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, () => state);
}

/** Clear stored edits. With a filter, clear only the keys it accepts. */
export function resetStore(which: (key: string) => boolean = () => true) {
  write(Object.fromEntries(Object.entries(state).filter(([k]) => !which(k))));
}





/** Write a value outside a component (for tables that change many rows). */
export function put<T>(key: string, value: T) {
  write({ ...state, [key]: value });
}

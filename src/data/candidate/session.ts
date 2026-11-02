import { peek, put, resetStore, useStored } from '../store';
import { ASSESSMENT, QUESTIONS } from './assessment';

/*
  One candidate's session on the candidate website. Kept in the browser so a
  reload carries on where it left off, as the real site would from its server.
  Captures and proctoring events are kept apart: they go to the back end for
  the proctoring report, and the candidate never sees them again.
*/

export type Phase = 'welcome' | 'consent' | 'camera' | 'selfie' | 'id' | 'verify' | 'ready' | 'exam' | 'done' | 'signed-out';
export type IdType = 'licence' | 'national' | 'passport';
export type Answer = string | string[];

export interface Session {
  phase: Phase;
  /** Where to return after signing back in */
  resume?: Phase;
  consentAt?: number;
  idType: IdType;
  camera: 'live' | 'simulated' | null;
  startedAt?: number;
  deadline?: number;
  index: number;
  /** When the current timed item runs out */
  itemDeadline?: number;
  answers: Record<string, Answer>;
  timedOut: string[];
  submittedAt?: number;
  submitReason?: 'candidate' | 'time';
}

export interface Captures { selfie?: string; idFront?: string; idBack?: string; takenAt?: number }
export interface ProctorEvent { at: number; type: string; text: string }

const KEY = 'candidate:v1:session';
const CAPTURES = 'proctor:v1:captures';
const EVENTS = 'proctor:v1:events';

const fresh = (): Session => ({ phase: 'welcome', idType: 'licence', camera: null, index: 0, answers: {}, timedOut: [] });

export const useSession = () => useStored<Session>(KEY, fresh);
const get = () => peek<Session>(KEY) ?? fresh();
export const patch = (p: Partial<Session> | ((s: Session) => Partial<Session>)) => {
  const s = get();
  put(KEY, { ...s, ...(typeof p === 'function' ? p(s) : p) });
};

export const useCaptures = () => useStored<Captures>(CAPTURES, () => ({}))[0];
export const saveCapture = (k: 'selfie' | 'idFront' | 'idBack', dataUrl: string) =>
  put(CAPTURES, { ...(peek<Captures>(CAPTURES) ?? {}), [k]: dataUrl, takenAt: Date.now() });

export function logEvent(type: string, text: string) {
  put(EVENTS, [...(peek<ProctorEvent[]>(EVENTS) ?? []), { at: Date.now(), type, text }]);
}

/** Session ID the candidate quotes when asking for help. Stable per browser. */
export const SESSION_ID = 'OA-7F3K-29QD';

export function startExam() {
  const now = Date.now();
  patch({ phase: 'exam', startedAt: now, deadline: now + ASSESSMENT.minutes * 60_000, index: 0, itemDeadline: itemDeadlineFor(0, now) });
  logEvent('start', 'Started the assessment');
}

function itemDeadlineFor(index: number, now = Date.now()) {
  const q = QUESTIONS[index];
  return q?.seconds ? now + q.seconds * 1000 : undefined;
}

/** Move to the next question, or submit after the last. */
export function advance(timedOut = false) {
  const s = get();
  const q = QUESTIONS[s.index];
  if (timedOut) logEvent('item-timeout', `Time ran out on question ${s.index + 1}`);
  const next = s.index + 1;
  if (next >= QUESTIONS.length) return submit('candidate', timedOut ? [q.id] : []);
  patch({ index: next, itemDeadline: itemDeadlineFor(next), timedOut: timedOut ? [...s.timedOut, q.id] : s.timedOut });
}

export function submit(reason: 'candidate' | 'time', alsoTimedOut: string[] = []) {
  const s = get();
  if (s.phase === 'done') return;
  patch({ phase: 'done', submittedAt: Date.now(), submitReason: reason, itemDeadline: undefined, timedOut: [...s.timedOut, ...alsoTimedOut] });
  logEvent('submit', reason === 'time' ? 'Time ran out; the assessment was submitted' : 'Submitted the assessment');
}

export function resetCandidate() {
  resetStore((k) => k.startsWith('candidate:') || k.startsWith('proctor:'));
}

export const answered = (s: Session) => QUESTIONS.filter((q) => {
  const a = s.answers[q.id];
  return Array.isArray(a) ? a.length > 0 : !!a?.toString().trim();
}).length;

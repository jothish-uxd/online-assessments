import { generatedSession } from '../hiring/applicants';

/*
  Sample proctoring sessions for the Proctoring report. Placeholder data:
  enough to lay out the queues and the session detail before the real model.
*/

export type Risk = 'high' | 'medium' | 'low';
export type ReviewStatus = 'needs-review' | 'in-review' | 'cleared' | 'confirmed';
export type IdMatch = 'match' | 'mismatch' | 'unsure';

export interface ProctorEventRow {
  at: number; // seconds into the recording
  type: string;
  detail: string;
  confidence: number; // 0–1, from the AI
}

export interface Session {
  id: string;
  candidate: string;
  candidateId: string;
  job: string;
  reqId: string;
  workflow: string;
  submitted: string; // ISO
  minutes: number;
  risk: Risk;
  status: ReviewStatus;
  idMatch: IdMatch;
  events: ProctorEventRow[];
}

export interface Job { reqId: string; title: string; closes: string; recruiter: string }

export const JOBS: Job[] = [
  { reqId: 'REQ-4471', title: 'Starfighter Pilot L4', closes: '2026-11-05', recruiter: 'Hera Syndulla' },
  { reqId: 'REQ-4502', title: 'Hangar Mechanic L3', closes: '2026-11-07', recruiter: 'Hera Syndulla' },
  { reqId: 'REQ-4519', title: 'Intelligence Analyst L5', closes: '2026-11-14', recruiter: 'Mon Mothma' },
];

const ev = (at: number, type: string, detail: string, confidence: number): ProctorEventRow => ({ at, type, detail, confidence });

export const SESSIONS: Session[] = [
  {
    id: 's-poe', candidate: 'Poe Dameron', candidateId: 'CAND-48213', job: 'Starfighter Pilot L4', reqId: 'REQ-4471', workflow: 'Starfighter Pilot L4',
    submitted: '2026-11-02T01:46:00Z', minutes: 27, risk: 'medium', status: 'needs-review', idMatch: 'match',
    events: [
      ev(212, 'Left the assessment tab', 'Away for 9 seconds on question 3', 0.99),
      ev(655, 'Looked away from screen', 'Gaze off to the left for 6 seconds', 0.71),
      ev(1240, 'Paste blocked', 'Tried to paste into the written answer', 0.99),
    ],
  },
  {
    id: 's-kallus', candidate: 'Alexsandr Kallus', candidateId: 'CAND-47790', job: 'Intelligence Analyst L5', reqId: 'REQ-4519', workflow: 'Intelligence Analyst L5',
    submitted: '2026-11-02T18:20:00Z', minutes: 41, risk: 'high', status: 'needs-review', idMatch: 'mismatch',
    events: [
      ev(35, 'Face doesn’t match selfie', 'Person on camera differs from the selfie and ID photo', 0.88),
      ev(420, 'Second person in frame', 'Another face appears behind the candidate for 14 seconds', 0.93),
      ev(980, 'Voice detected', 'A second voice speaking for about 20 seconds', 0.81),
      ev(1610, 'Phone visible', 'A phone is held up toward the screen', 0.77),
      ev(2200, 'Left the assessment tab', 'Away for 2 minutes 10 seconds', 0.99),
    ],
  },
  {
    id: 's-bodhi', candidate: 'Bodhi Rook', candidateId: 'CAND-48022', job: 'Starfighter Pilot L4', reqId: 'REQ-4471', workflow: 'Starfighter Pilot L4',
    submitted: '2026-11-01T22:05:00Z', minutes: 29, risk: 'high', status: 'needs-review', idMatch: 'unsure',
    events: [
      ev(60, 'Face partly hidden', 'Hood and low light make the face hard to match', 0.64),
      ev(730, 'Looked away from screen', 'Repeated glances down and to the right', 0.82),
      ev(1100, 'Phone visible', 'A lit screen reflects in the candidate’s glasses', 0.69),
    ],
  },
  {
    id: 's-wedge', candidate: 'Wedge Antilles', candidateId: 'TAL-20417', job: 'Starfighter Pilot L4', reqId: 'REQ-4471', workflow: 'Starfighter Pilot L4',
    submitted: '2026-10-21T17:30:00Z', minutes: 26, risk: 'low', status: 'cleared', idMatch: 'match',
    events: [ev(980, 'Looked away from screen', 'Glanced at a wall chronometer for 3 seconds', 0.38)],
  },
  {
    id: 's-rose', candidate: 'Rose Tico', candidateId: 'CAND-48101', job: 'Hangar Mechanic L3', reqId: 'REQ-4502', workflow: 'Hangar Mechanic L3',
    submitted: '2026-11-02T15:12:00Z', minutes: 44, risk: 'low', status: 'cleared', idMatch: 'match',
    events: [ev(1500, 'Looked away from screen', 'Brief glance to the side', 0.42)],
  },
  {
    id: 's-cassian', candidate: 'Cassian Andor', candidateId: 'CAND-47855', job: 'Intelligence Analyst L5', reqId: 'REQ-4519', workflow: 'Intelligence Analyst L5',
    submitted: '2026-11-01T09:40:00Z', minutes: 52, risk: 'medium', status: 'in-review', idMatch: 'match',
    events: [
      ev(300, 'Camera covered', 'Camera dark for 18 seconds', 0.95),
      ev(1900, 'Left the assessment tab', 'Away for 31 seconds', 0.99),
    ],
  },
  {
    id: 's-sabine', candidate: 'Sabine Wren', candidateId: 'CAND-48160', job: 'Hangar Mechanic L3', reqId: 'REQ-4502', workflow: 'Hangar Mechanic L3',
    submitted: '2026-11-03T02:30:00Z', minutes: 38, risk: 'high', status: 'needs-review', idMatch: 'match',
    events: [
      ev(510, 'Second screen detected', 'Eyes track to a second display repeatedly', 0.86),
      ev(1320, 'Voice detected', 'Reading questions aloud to someone off camera', 0.79),
    ],
  },
  {
    id: 's-jyn', candidate: 'Jyn Erso', candidateId: 'CAND-48004', job: 'Starfighter Pilot L4', reqId: 'REQ-4471', workflow: 'Starfighter Pilot L4',
    submitted: '2026-11-02T20:55:00Z', minutes: 25, risk: 'low', status: 'needs-review', idMatch: 'match',
    events: [],
  },
];

export const RISK_TEXT: Record<Risk, string> = { high: 'High risk', medium: 'Medium risk', low: 'Low risk' };
export const STATUS_TEXT: Record<ReviewStatus, string> = { 'needs-review': 'Needs review', 'in-review': 'In review', cleared: 'Cleared', confirmed: 'Misconduct confirmed' };
export const MATCH_TEXT: Record<IdMatch, string> = { match: 'Same person', mismatch: 'Different person', unsure: 'Can’t tell' };
const RANK: Record<Risk, number> = { high: 0, medium: 1, low: 2 };
export const byRisk = (a: Session, b: Session) => RANK[a.risk] - RANK[b.risk] || b.events.length - a.events.length;
export const byNewest = (a: Session, b: Session) => b.submitted.localeCompare(a.submitted);
export const sessionById = (id?: string) => SESSIONS.find((s) => s.id === id) ?? generatedSession(id);

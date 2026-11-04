import { sessionById, type Session } from '../proctor/sessions';
import type { Stage } from './jobs';

/*
  Candidates on each job, with where their online assessment stands. When the
  OA was proctored, the session links to the Proctoring review.
*/

export type OaState = 'not-sent' | 'invited' | 'started' | 'completed';
export interface JobCandidate {
  id: string;
  name: string;
  stage: Stage | 'Not selected';
  applied: string;
  oa: { state: OaState; date?: string; score?: number; outOf?: number; pass?: boolean; proctored?: boolean; sessionId?: string };
}

const done = (date: string, score: number, pass: boolean, sessionId?: string) =>
  ({ state: 'completed' as const, date, score, outOf: 100, pass, proctored: !!sessionId, sessionId });

const BY_JOB: Record<string, JobCandidate[]> = {
  'REQ-4471': [
    { id: 'TAL-20417', name: 'Wedge Antilles', stage: 'Interview', applied: '2026-10-18', oa: done('2026-10-21', 88, true, 's-wedge') },
    { id: 'CAND-48213', name: 'Poe Dameron', stage: 'Assessment', applied: '2026-10-25', oa: done('2026-11-02', 79, true, 's-poe') },
    { id: 'CAND-48022', name: 'Bodhi Rook', stage: 'Assessment', applied: '2026-10-22', oa: done('2026-11-01', 71, true, 's-bodhi') },
    { id: 'CAND-48004', name: 'Jyn Erso', stage: 'Assessment', applied: '2026-10-27', oa: done('2026-11-02', 64, true, 's-jyn') },
    { id: 'CAND-48230', name: 'Biggs Darklighter', stage: 'Not selected', applied: '2026-10-20', oa: done('2026-10-24', 41, false) },
    { id: 'CAND-48241', name: 'Han Solo', stage: 'Assessment', applied: '2026-10-29', oa: { state: 'started', date: '2026-11-03' } },
    { id: 'CAND-48255', name: 'Kes Dameron', stage: 'Screening', applied: '2026-10-30', oa: { state: 'invited', date: '2026-10-31' } },
    { id: 'CAND-48262', name: 'Norra Wexley', stage: 'Applied', applied: '2026-11-02', oa: { state: 'not-sent' } },
  ],
  'REQ-4502': [
    { id: 'CAND-48101', name: 'Rose Tico', stage: 'Interview', applied: '2026-10-10', oa: done('2026-11-02', 84, true, 's-rose') },
    { id: 'CAND-48160', name: 'Sabine Wren', stage: 'Assessment', applied: '2026-10-28', oa: done('2026-11-03', 81, true, 's-sabine') },
    { id: 'CAND-48170', name: 'Chewbacca', stage: 'Interview', applied: '2026-10-12', oa: done('2026-10-16', 92, true) },
    { id: 'CAND-48177', name: 'Paige Tico', stage: 'Screening', applied: '2026-10-30', oa: { state: 'invited', date: '2026-11-01' } },
  ],
  'REQ-4519': [
    { id: 'CAND-47790', name: 'Alexsandr Kallus', stage: 'Assessment', applied: '2026-10-20', oa: done('2026-11-02', 90, true, 's-kallus') },
    { id: 'CAND-47855', name: 'Cassian Andor', stage: 'Assessment', applied: '2026-10-15', oa: done('2026-11-01', 86, true, 's-cassian') },
    { id: 'CAND-47861', name: 'Luthen Rael', stage: 'Applied', applied: '2026-11-01', oa: { state: 'not-sent' } },
  ],
};

export const candidatesFor = (reqId: string) => BY_JOB[reqId] ?? [];
export const sessionFor = (c: JobCandidate): Session | undefined => sessionById(c.oa.sessionId);

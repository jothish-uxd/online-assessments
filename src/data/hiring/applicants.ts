import type { Session } from '../proctor/sessions';
import { JOBS, STAGES, type Job, type Stage } from './jobs';

/*
  Every candidate on each job, so the list always adds up to the pipeline
  counts. A few hand-written people come first (they link to the curated
  proctoring sessions); the rest are generated from a fixed seed, so the same
  job always shows the same people.
*/

export type OaState = 'not-sent' | 'invited' | 'started' | 'completed';
export interface JobCandidate {
  id: string;
  name: string;
  stage: Stage;
  applied: string;
  oa: { state: OaState; date?: string; score?: number; outOf?: number; pass?: boolean; proctored?: boolean; sessionId?: string };
}

const done = (date: string, score: number, pass: boolean, sessionId?: string) =>
  ({ state: 'completed' as const, date, score, outOf: 100, pass, proctored: !!sessionId, sessionId });

const CURATED: Record<string, JobCandidate[]> = {
  'REQ-4471': [
    { id: 'TAL-20417', name: 'Wedge Antilles', stage: 'Interview', applied: '2026-10-18', oa: done('2026-10-21', 88, true, 's-wedge') },
    { id: 'CAND-48213', name: 'Poe Dameron', stage: 'Assessment', applied: '2026-10-25', oa: done('2026-11-02', 79, true, 's-poe') },
    { id: 'CAND-48022', name: 'Bodhi Rook', stage: 'Assessment', applied: '2026-10-22', oa: done('2026-11-01', 71, true, 's-bodhi') },
    { id: 'CAND-48004', name: 'Jyn Erso', stage: 'Assessment', applied: '2026-10-27', oa: done('2026-11-02', 64, true, 's-jyn') },
    { id: 'CAND-48230', name: 'Biggs Darklighter', stage: 'Assessment', applied: '2026-10-20', oa: done('2026-10-24', 41, false, undefined) },
    { id: 'CAND-48241', name: 'Han Solo', stage: 'Assessment', applied: '2026-10-29', oa: { state: 'started', date: '2026-11-03' } },
    { id: 'CAND-48255', name: 'Kes Dameron', stage: 'Assessment', applied: '2026-10-30', oa: { state: 'invited', date: '2026-10-31' } },
    { id: 'CAND-48262', name: 'Norra Wexley', stage: 'Applied', applied: '2026-11-02', oa: { state: 'not-sent' } },
  ],
  'REQ-4502': [
    { id: 'CAND-48101', name: 'Rose Tico', stage: 'Interview', applied: '2026-10-10', oa: done('2026-11-02', 84, true, 's-rose') },
    { id: 'CAND-48160', name: 'Sabine Wren', stage: 'Assessment', applied: '2026-10-28', oa: done('2026-11-03', 81, true, 's-sabine') },
    { id: 'CAND-48170', name: 'Chewbacca', stage: 'Interview', applied: '2026-10-12', oa: done('2026-10-16', 92, true) },
    { id: 'CAND-48177', name: 'Paige Tico', stage: 'Assessment', applied: '2026-10-30', oa: { state: 'invited', date: '2026-11-01' } },
  ],
  'REQ-4519': [
    { id: 'CAND-47790', name: 'Alexsandr Kallus', stage: 'Assessment', applied: '2026-10-20', oa: done('2026-11-02', 90, true, 's-kallus') },
    { id: 'CAND-47855', name: 'Cassian Andor', stage: 'Assessment', applied: '2026-10-15', oa: done('2026-11-01', 86, true, 's-cassian') },
    { id: 'CAND-47861', name: 'Luthen Rael', stage: 'Applied', applied: '2026-11-01', oa: { state: 'not-sent' } },
  ],
};

const FIRST = ['Arvel', 'Tamsin', 'Jorin', 'Kessa', 'Davin', 'Lira', 'Corran', 'Mirax', 'Tycho', 'Hobbie', 'Wes', 'Dak', 'Zev', 'Jek', 'Garven', 'Shara', 'Ello', 'Tallie', 'Nien', 'Iden', 'Del', 'Teza', 'Torra', 'Neeku', 'Synara', 'Fenn', 'Kaeden', 'Miara', 'Ketsu', 'Aren', 'Lyra', 'Orrin', 'Sela', 'Pax', 'Rhea', 'Tobin', 'Vel', 'Cinta', 'Bix', 'Nemik', 'Arlo', 'Siri', 'Odo', 'Mae', 'Quill', 'Jessa', 'Ronan', 'Talia'];
const LAST = ['Vane', 'Horn', 'Terrik', 'Celchu', 'Klivian', 'Janson', 'Ralter', 'Maree', 'Porkins', 'Garn', 'Versio', 'Meeko', 'Xiono', 'Doza', 'Lerran', 'Kell', 'Dreis', 'Stadd', 'Brance', 'Torvin', 'Larr', 'Onyo', 'Fett', 'Kast', 'Maarva', 'Melshi', 'Karn', 'Sarkli', 'Tolruck', 'Dorn', 'Rennick', 'Sollo', 'Vantis', 'Okafor', 'Brightwater', 'Quarren', 'Halcyon', 'Ostrander'];

/** Small seeded random number generator, so generated people stay the same. */
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

/** Sample data is as of this date; nothing generated lands after it. */
const AS_OF = '2026-11-03';
const iso = (base: string, plusDays: number) => {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + plusDays);
  const out = d.toISOString().slice(0, 10);
  return out > AS_OF ? AS_OF : out;
};
const daysBetween = (a: string, b: string) => Math.max(1, Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000));

const generatedSessions = new Map<string, Session>();

function build(job: Job): JobCandidate[] {
  const curated = CURATED[job.reqId] ?? [];
  const r = rng(job.reqId);
  const used = new Set(curated.map((c) => c.name));
  const out: JobCandidate[] = [...curated];
  let n = 0;
  for (const stage of STAGES) {
    const need = job.pipeline[stage] - curated.filter((c) => c.stage === stage).length;
    for (let i = 0; i < need; i++) {
      let name = '';
      do { name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`; } while (used.has(name) && used.size < FIRST.length * LAST.length);
      used.add(name);
      n += 1;
      const id = `CAND-${String(50000 + Math.floor(r() * 49999)).padStart(5, '0')}`;
      // Later stages applied earlier, so they've had time to get there.
      const span = daysBetween(job.opened, AS_OF);
      const head = 1 - STAGES.indexOf(stage) / (STAGES.length + 1);
      const applied = iso(job.opened, Math.floor(r() * span * head));
      let oa: JobCandidate['oa'];
      if (!job.workflow || stage === 'Applied') oa = { state: 'not-sent' };
      else if (stage === 'Screening') oa = r() < 0.3 ? { state: 'invited', date: iso(applied, 3) } : { state: 'not-sent' };
      else if (stage === 'Assessment') {
        const x = r();
        // Roughly half have taken it; the rest are invited or part-way through.
        if (x < 0.32) oa = { state: 'invited', date: iso(applied, 4) };
        else if (x < 0.45) oa = { state: 'started', date: iso(applied, 6) };
        else {
          const score = Math.round(45 + r() * 50);
          const sid = `g-${job.reqId}-${n}`;
          oa = done(iso(applied, 6), score, score >= 60, sid);
          register(sid, name, id, job, oa.date!, 'cleared', r);
        }
      } else {
        const score = Math.round(66 + r() * 30);
        const sid = `g-${job.reqId}-${n}`;
        oa = done(iso(applied, 5), score, true, sid);
        register(sid, name, id, job, oa.date!, 'cleared', r);
      }
      out.push({ id, name, stage, applied, oa });
    }
  }
  return out;
}

/** A plain, low-risk session behind each generated proctored result, so its Details link works. */
function register(sid: string, name: string, id: string, job: Job, date: string, status: Session['status'], r: () => number) {
  const flags = r() < 0.4 ? [{ at: Math.round(200 + r() * 1200), type: 'Looked away from screen', detail: 'Brief glance off screen', confidence: Math.round((0.3 + r() * 0.3) * 100) / 100 }] : [];
  generatedSessions.set(sid, {
    id: sid, candidate: name, candidateId: id, job: job.title, reqId: job.reqId, workflow: job.workflow ?? job.title,
    submitted: `${date}T${String(9 + Math.floor(r() * 10)).padStart(2, '0')}:15:00Z`, minutes: Math.round(22 + r() * 25),
    risk: 'low', status, idMatch: 'match', events: flags,
  });
}

const cache = new Map<string, JobCandidate[]>();
export function candidatesFor(reqId: string): JobCandidate[] {
  if (!cache.has(reqId)) {
    const job = JOBS.find((j) => j.reqId === reqId);
    cache.set(reqId, job ? build(job) : []);
  }
  return cache.get(reqId)!;
}

/** Sessions behind generated candidates. Building every job's roster once makes direct links work too. */
export function generatedSession(id?: string): Session | undefined {
  if (!id?.startsWith('g-')) return undefined;
  if (!generatedSessions.has(id)) JOBS.forEach((j) => candidatesFor(j.reqId));
  return generatedSessions.get(id);
}

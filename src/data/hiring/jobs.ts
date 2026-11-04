/*
  Jobs (requisitions) in the Internal ATS, with how many people sit at each
  stage of the pipeline. Sample data for the Jobs table.
*/

export const STAGES = ['Applied', 'Screening', 'Assessment', 'Interview', 'Offer', 'Hired'] as const;
export type Stage = (typeof STAGES)[number];

export interface Job {
  reqId: string;
  title: string;
  team: string;
  location: string;
  level: string;
  openings: number;
  recruiter: string;
  hiringManager: string;
  opened: string;
  closes?: string;
  status: 'Open' | 'On hold' | 'Filled' | 'Closed';
  workflow?: string;
  pipeline: Record<Stage, number>;
}

const p = (applied: number, screening: number, assessment: number, interview: number, offer: number, hired: number): Record<Stage, number> =>
  ({ Applied: applied, Screening: screening, Assessment: assessment, Interview: interview, Offer: offer, Hired: hired });

export const JOBS: Job[] = [
  { reqId: 'REQ-4471', title: 'Starfighter Pilot L4', team: 'Starfighter Corps', location: 'Home One, fleet', level: 'L4', openings: 6, recruiter: 'Hera Syndulla', hiringManager: 'Wedge Antilles', opened: '2026-09-02', closes: '2026-11-05', status: 'Open', workflow: 'Starfighter Pilot L4', pipeline: p(214, 88, 61, 19, 4, 2) },
  { reqId: 'REQ-4502', title: 'Hangar Mechanic L3', team: 'Hangar Operations', location: 'Echo Base, Hoth', level: 'L3', openings: 4, recruiter: 'Hera Syndulla', hiringManager: 'Rose Tico', opened: '2026-09-15', closes: '2026-11-07', status: 'Open', workflow: 'Hangar Mechanic L3', pipeline: p(132, 40, 27, 11, 2, 1) },
  { reqId: 'REQ-4519', title: 'Intelligence Analyst L5', team: 'Alliance Intelligence', location: 'Yavin 4', level: 'L5', openings: 2, recruiter: 'Mon Mothma', hiringManager: 'Cassian Andor', opened: '2026-10-01', closes: '2026-11-14', status: 'Open', workflow: 'Intelligence Analyst L5', pipeline: p(76, 31, 18, 6, 1, 0) },
  { reqId: 'REQ-4533', title: 'Flight Instructor L5', team: 'Starfighter Corps', location: 'Yavin 4', level: 'L5', openings: 1, recruiter: 'Hera Syndulla', hiringManager: 'Wedge Antilles', opened: '2026-10-12', status: 'Open', workflow: 'Starfighter Pilot L4', pipeline: p(23, 9, 5, 2, 0, 0) },
  { reqId: 'REQ-4560', title: 'Squadron Leader L6', team: 'Starfighter Corps', location: 'Home One, fleet', level: 'L6', openings: 1, recruiter: 'Mon Mothma', hiringManager: 'Admiral Ackbar', opened: '2026-10-20', status: 'Open', workflow: 'Starfighter Pilot L4', pipeline: p(11, 4, 3, 0, 0, 0) },
  { reqId: 'REQ-4488', title: 'Field Medic L2', team: 'Medical Corps', location: 'Redemption, fleet', level: 'L2', openings: 5, recruiter: 'Jyn Erso', hiringManager: 'Kalonia', opened: '2026-08-20', status: 'On hold', workflow: 'Field Medic L2', pipeline: p(158, 52, 0, 0, 0, 0) },
  { reqId: 'REQ-4390', title: 'Flight Operations Lead L5', team: 'Fleet Operations', location: 'Home One, fleet', level: 'L5', openings: 1, recruiter: 'Mon Mothma', hiringManager: 'Admiral Ackbar', opened: '2026-06-10', status: 'Filled', workflow: undefined, pipeline: p(64, 20, 12, 5, 1, 1) },
];

export const jobById = (reqId?: string) => JOBS.find((j) => j.reqId === reqId);
export const inPipeline = (j: Job) => STAGES.reduce((s, k) => s + j.pipeline[k], 0) - j.pipeline.Hired;

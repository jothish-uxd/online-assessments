import type { Activity, PersonId, Step, Workflow, WorkflowSettings } from './types';
import { st } from './seedAssets';
import { SEED_SCORING } from './seedScoring';
import { defaultMisbehavior } from './misbehavior';

let n = 0;
const mod = (moduleId: string): Step => ({ id: `s${++n}`, kind: 'module', moduleId });
const idCheck = (): Step => ({ id: `s${++n}`, kind: 'id-check' });
const proctor = (): Step => ({ id: `s${++n}`, kind: 'proctoring' });
const log = (by: PersonId, at: string, action: string): Activity => ({ ...st(by, at), action });

const base = (over: Partial<WorkflowSettings> = {}): WorkflowSettings => ({
  linkDays: 180,
  scoreDays: 180,
  ats: ['holonet-hire'],
  devices: ['desktop'],
  equivalent: [],
  reviewers: { ops: null, program: [], e2e: null, signoff: [], launch: null },
  inviteSubject: 'Your Alliance assessment is ready',
  inviteBody: 'Thank you for applying to serve with the Alliance. Use the link below to take your online assessment. It takes about 45 standard minutes, and the link stays open for {link_days} days.',
  reminderDays: 3,
  ...over,
});

export const ATS_OPTIONS = [
  { value: 'holonet-hire', label: 'Holonet Hire' },
  { value: 'rebel-recruit', label: 'Rebel Recruit' },
  { value: 'mon-cala-talent', label: 'Mon Cala Talent' },
  { value: 'corellian-careers', label: 'Corellian Careers' },
];
export const DEVICE_OPTIONS = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'smart-tv', label: 'Smart TV' },
];

export const SEED_WORKFLOWS: Workflow[] = [
  {
    id: 'w-pilot', name: 'Starfighter Pilot L4', code: 'STARFIGHTER_PILOT_L4_01234', type: 'Candidate',
    stage: 'build', version: 5, dirty: false,
    steps: [
      mod('m-consent'), mod('m-instructions'), idCheck(), mod('m-proctoring'), proctor(),
      mod('m-pilot'), mod('m-customer-judgement'), mod('m-leadership'), mod('m-written'),
    ],
    settings: base({ devices: ['desktop'], reviewers: { ops: ['hera'], program: [], e2e: null, signoff: [], launch: null } }),
    scoring: SEED_SCORING['w-pilot'],
    misbehavior: defaultMisbehavior({ selfie: { on: true, badge: true, onsite: true, retentionDays: 365 }, video: { on: true, audio: true, retentionDays: 90 } }),
    created: st('jyn', '2026-10-06T10:00'), edited: st('leia', '2026-10-29T16:40'),
    history: [
      log('leia', '2026-10-29T16:40', 'Saved version 5'),
      log('leia', '2026-10-29T16:32', 'Added Written communication'),
      log('jyn', '2026-10-22T17:30', 'Saved version 4'),
      log('jyn', '2026-10-22T17:20', 'Moved the proctoring check before Pilot readiness'),
      log('jyn', '2026-10-15T14:00', 'Added ID verification'),
      log('jyn', '2026-10-06T10:00', 'Created the workflow'),
    ],
  },
  {
    id: 'w-mechanic', name: 'Hangar Mechanic L3', code: 'HANGAR_MECHANIC_L3_00871', type: 'Candidate',
    stage: 'program-review', version: 3, dirty: false,
    steps: [mod('m-consent'), mod('m-instructions'), mod('m-starship'), mod('m-numerical'), mod('m-customer-judgement')],
    settings: base({
      ats: ['holonet-hire', 'rebel-recruit'], devices: ['desktop', 'tablet'],
      reviewers: { ops: ['hera'], program: ['mon'], e2e: null, signoff: ['mon'], launch: null },
    }),
    scoring: SEED_SCORING['w-mechanic'],
    misbehavior: defaultMisbehavior({ selfie: { on: true, badge: true, onsite: false, retentionDays: 180 } }),
    created: st('cassian', '2026-10-02T09:00'), edited: st('cassian', '2026-10-27T11:15'),
    history: [
      log('cassian', '2026-10-27T11:15', 'Sent to Program review'),
      log('cassian', '2026-10-27T11:10', 'Saved version 3'),
      log('cassian', '2026-10-02T09:00', 'Created the workflow'),
    ],
  },
  {
    id: 'w-analyst', name: 'Intelligence Analyst L5', code: 'INTEL_ANALYST_L5_00412', type: 'Candidate',
    stage: 'live', version: 9, dirty: false,
    steps: [mod('m-consent'), mod('m-instructions'), idCheck(), mod('m-proctoring'), proctor(), mod('m-intel'), mod('m-customer-judgement')],
    settings: base({
      linkDays: 120, scoreDays: 365, ats: ['holonet-hire', 'mon-cala-talent'], devices: ['desktop'],
      reviewers: { ops: ['hera'], program: ['mon'], e2e: ['jyn'], signoff: ['mon'], launch: ['hera'] },
    }),
    scoring: SEED_SCORING['w-analyst'],
    misbehavior: defaultMisbehavior({ selfie: { on: true, badge: true, onsite: true, retentionDays: 365 }, image: { on: true, perHour: 8, faceMatch: true }, video: { on: true, audio: true, retentionDays: 120 }, review: { threshold: 2, holdResults: true } }),
    created: st('jyn', '2026-09-28T08:30'), edited: st('hera', '2026-10-14T09:00'),
    history: [
      log('hera', '2026-10-14T09:00', 'Launched: live for requisitions'),
      log('mon', '2026-10-13T16:20', 'Final sign-off'),
      log('jyn', '2026-10-13T11:00', 'End-to-end testing passed'),
      log('mon', '2026-10-12T15:00', 'Program review approved'),
      log('jyn', '2026-10-12T10:40', 'Saved version 9'),
      log('jyn', '2026-09-28T08:30', 'Created the workflow'),
    ],
  },
  {
    id: 'w-medic', name: 'Field Medic L2', code: 'FIELD_MEDIC_L2_01377', type: 'Candidate',
    stage: 'build', version: 1, dirty: true,
    steps: [mod('m-consent'), mod('m-medical')],
    settings: base({ devices: ['desktop', 'mobile'] }),
    scoring: SEED_SCORING['w-medic'],
    misbehavior: defaultMisbehavior(),
    created: st('hera', '2026-10-30T08:20'), edited: st('hera', '2026-10-30T08:35'),
    history: [
      log('hera', '2026-10-30T08:35', 'Added Medical frigate triage'),
      log('hera', '2026-10-30T08:20', 'Created the workflow'),
    ],
  },
];

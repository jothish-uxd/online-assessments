import type { Activity, CommentTarget, PersonId, ReviewRound, Step, Thread, Workflow, WorkflowSettings } from './types';
import { st } from './seedAssets';
import { SEED_SCORING } from './seedScoring';
import { defaultMisbehavior } from './misbehavior';
import { suggestPlan } from './testplan';
import { SEED_MODULES } from './seedModules';

let n = 0;
const mod = (moduleId: string): Step => ({ id: `s${++n}`, kind: 'module', moduleId });
const idCheck = (): Step => ({ id: `s${++n}`, kind: 'id-check' });
const proctor = (): Step => ({ id: `s${++n}`, kind: 'proctoring' });
const log = (by: PersonId, at: string, action: string): Activity => ({ ...st(by, at), action });

let c = 0;
type Msg = [PersonId, string, string];
/** A comment thread: [who, when, what], oldest first. */
const th = (target: CommentTarget, msgs: Msg[], resolved?: [PersonId, string]): Thread => ({
  id: `th${++c}`, target,
  comments: msgs.map(([by, at, body]) => ({ id: `c${++c}`, by, at: new Date(at).toISOString(), body })),
  resolved: resolved ? st(resolved[0], resolved[1]) : undefined,
});
const round = (n: number, by: PersonId, at: string, reviewers: PersonId[], message: string, decision?: [PersonId, string, 'approved' | 'changes', string]): ReviewRound => ({
  n, requested: st(by, at), reviewers, message,
  decision: decision ? { ...st(decision[0], decision[1]), outcome: decision[2], note: decision[3] } : undefined,
});
const WHOLE = (label = 'Whole workflow'): CommentTarget => ({ kind: 'workflow', label, tab: 'builder' });

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
    settings: base({ devices: ['desktop'], equivalent: ['w-analyst'], reviewers: { ops: ['hera'], program: ['mon'], e2e: null, signoff: ['mon'], launch: null } }),
    scoring: SEED_SCORING['w-pilot'],
    misbehavior: defaultMisbehavior({ selfie: { on: true, badge: true, onsite: true, retentionDays: 365 }, video: { on: true, audio: true, retentionDays: 90 } }),
    testPlan: null,
    reviews: [round(1, 'jyn', '2026-10-22T17:40', ['mon'], 'Ready for a first look. Pilot readiness is new; the rest is reused from Intelligence Analyst.',
      ['mon', '2026-10-23T15:05', 'changes', 'Three modules aren’t published yet, and I’d like the composite to weight spatial reasoning more. See my comments.'])],
    comments: [
      th({ kind: 'step', id: 's8', label: 'Squadron leadership', tab: 'builder' }, [
        ['mon', '2026-10-23T14:50', 'Wedge flagged item 2 as having two defensible answers. Hold this module until that’s fixed, or swap it for Mission focus only.'],
        ['leia', '2026-10-29T16:35', 'Asked Wedge to rewrite item 2 this week. Keeping the module for now.'],
      ]),
      th({ kind: 'score', id: SEED_SCORING['w-pilot'].scores[0].id, label: 'R formula', tab: 'scores' }, [
        ['mon', '2026-10-23T14:58', 'pilot_comp weights spatial reasoning at 0.6. For L4 pilots the validation study supports 0.7. Can you rerun with 0.7 / 0.3?'],
      ]),
      th({ kind: 'setting', id: 'video', label: 'Video proctoring', tab: 'misbehavior' }, [
        ['hera', '2026-10-23T10:12', 'Video only works on desktop and laptop. Recruiters say some pilot candidates apply from field stations on tablets.'],
        ['jyn', '2026-10-23T11:40', 'Agreed with Hera: field station candidates will get a scheduled proctored session instead. Desktop only stays.'],
      ], ['hera', '2026-10-23T11:55']),
    ],
    created: st('jyn', '2026-10-06T10:00'), edited: st('leia', '2026-10-29T16:40'),
    history: [
      log('leia', '2026-10-29T16:40', 'Saved version 5'),
      log('leia', '2026-10-29T16:32', 'Added Written communication'),
      log('mon', '2026-10-23T15:05', 'Requested changes in Program review'),
      log('jyn', '2026-10-22T17:40', 'Requested Program review from 1 reviewer'),
      log('jyn', '2026-10-22T17:30', 'Saved version 4'),
      log('jyn', '2026-10-22T17:20', 'Moved the proctoring check before Pilot readiness'),
      log('jyn', '2026-10-15T14:00', 'Added ID verification'),
      log('jyn', '2026-10-06T10:00', 'Created the workflow'),
    ],
  },
  {
    id: 'w-mechanic', name: 'Hangar Mechanic L3', code: 'HANGAR_MECHANIC_L3_00871', type: 'Candidate',
    stage: 'e2e', version: 3, dirty: false,
    steps: [mod('m-consent'), mod('m-instructions'), mod('m-starship'), mod('m-numerical'), mod('m-customer-judgement')],
    settings: base({
      ats: ['holonet-hire', 'rebel-recruit'], devices: ['desktop', 'tablet'],
      reviewers: { ops: ['hera'], program: ['mon'], e2e: null, signoff: ['mon'], launch: null },
    }),
    scoring: SEED_SCORING['w-mechanic'],
    misbehavior: defaultMisbehavior({ selfie: { on: true, badge: true, onsite: false, retentionDays: 180 } }),
    testPlan: null,
    reviews: [round(1, 'cassian', '2026-10-27T11:15', ['mon'], '', ['mon', '2026-10-27T11:25', 'approved', 'Looks good. Watch the band boundaries in testing.'])],
    comments: [
      th(WHOLE('Review: approved'), [['mon', '2026-10-27T11:25', 'Looks good. Watch the band boundaries in testing.']]),
      th({ kind: 'case', id: '', label: 'Test case 1.2: All incorrect answers', tab: 'test-plan' }, [
        ['wedge', '2026-10-29T14:12', 'Failed: came back “Recommended with training”. I think the 0.45 boundary in mechanic_band is too low.'],
        ['cassian', '2026-10-29T15:30', 'You’re right. I’ll unlock, move it to 0.5 and send it back through review.'],
      ]),
    ],
    created: st('cassian', '2026-10-02T09:00'), edited: st('hera', '2026-10-29T14:10'),
    history: [
      log('mon', '2026-10-27T11:25', 'Approved in Program review; locked for testing'),
      log('cassian', '2026-10-27T11:15', 'Requested Program review from 1 reviewer'),
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
    testPlan: null,
    reviews: [
      round(1, 'jyn', '2026-10-08T10:00', ['mon'], '', ['mon', '2026-10-09T09:30', 'changes', 'Outer Rim candidates need their own variation.']),
      round(2, 'jyn', '2026-10-12T10:45', ['mon'], 'Added the Outer Rim variation.', ['mon', '2026-10-12T15:00', 'approved', '']),
    ],
    comments: [
      th({ kind: 'score', id: SEED_SCORING['w-analyst'].scores[1].id, label: 'intel_result', tab: 'scores' }, [
        ['mon', '2026-10-09T09:20', 'Outer Rim candidates shouldn’t be held to the same proctoring flag rule; connections drop more often there.'],
        ['jyn', '2026-10-12T10:40', 'Added an Outer Rim variation with its own score that ignores proctoring flags.'],
      ], ['mon', '2026-10-12T14:55']),
    ],
    created: st('jyn', '2026-09-28T08:30'), edited: st('hera', '2026-10-14T09:00'),
    history: [
      log('hera', '2026-10-14T09:00', 'Launched: live for requisitions'),
      log('mon', '2026-10-13T16:20', 'Final sign-off'),
      log('jyn', '2026-10-13T11:00', 'End-to-end testing passed'),
      log('mon', '2026-10-12T15:00', 'Approved in Program review; locked for testing'),
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
    testPlan: null,
    reviews: [],
    comments: [],
    created: st('hera', '2026-10-30T08:20'), edited: st('hera', '2026-10-30T08:35'),
    history: [
      log('hera', '2026-10-30T08:35', 'Added Medical frigate triage'),
      log('hera', '2026-10-30T08:20', 'Created the workflow'),
    ],
  },
  {
    id: 'w-comms', name: 'Comms Officer L3', code: 'COMMS_OFFICER_L3_02260', type: 'Candidate',
    stage: 'program-review', version: 2, dirty: false,
    steps: [mod('m-consent'), mod('m-instructions'), mod('m-intel'), mod('m-customer-judgement')],
    settings: base({ ats: ['holonet-hire'], devices: ['desktop', 'mobile'], reviewers: { ops: ['hera'], program: ['mon'], e2e: null, signoff: ['mon'], launch: null } }),
    scoring: {
      variations: [],
      scores: [{
        id: 'sc-comms-total', kind: 'scratch', name: 'comms_total', pc: true, sendToAts: true, type: 'weighted', mode: 'reference',
        mappings: [], bandSource: '', bands: [], reference: '', variationId: null,
        weights: [{ id: 'cw1', input: 'intel_analysis_scaled', weight: '0.6' }, { id: 'cw2', input: 'mission_focus_scaled', weight: '0.4' }],
        created: st('jyn', '2026-10-28T13:00'), edited: st('jyn', '2026-10-28T13:00'),
      }, {
        id: 'sc-comms-band', kind: 'scratch', name: 'comms_result', pc: false, sendToAts: true, type: 'conditional', mode: 'band',
        mappings: [], reference: '', weights: [], variationId: null, bandSource: 'comms_total',
        bands: [{ id: 'cb1', min: '', max: '0.5', label: 'Not recommended' }, { id: 'cb2', min: '0.5', max: '', label: 'Recommended' }],
        created: st('jyn', '2026-10-28T13:05'), edited: st('jyn', '2026-10-28T13:05'),
      }],
    },
    misbehavior: defaultMisbehavior(),
    testPlan: null,
    reviews: [round(1, 'jyn', '2026-10-30T09:10', ['mon'], 'Comms officers listen to intercepts all day, so this leans on Intelligence analysis. No proctoring: it’s a low-stakes screen.')],
    comments: [
      th(WHOLE(), [['jyn', '2026-10-30T09:10', 'Comms officers listen to intercepts all day, so this leans on Intelligence analysis. No proctoring: it’s a low-stakes screen.']]),
      th({ kind: 'setting', id: 'browser', label: 'Browser activity', tab: 'misbehavior' }, [
        ['hera', '2026-10-30T10:02', 'Without proctoring, should pasting into the listen-and-write answer stop the assessment rather than just flag it?'],
      ]),
    ],
    created: st('jyn', '2026-10-28T12:40'), edited: st('jyn', '2026-10-30T09:10'),
    history: [
      log('jyn', '2026-10-30T09:10', 'Requested Program review from 1 reviewer'),
      log('jyn', '2026-10-30T09:05', 'Saved version 2'),
      log('jyn', '2026-10-28T12:40', 'Created the workflow'),
    ],
  },
];

/* Sample test plans: the mechanic workflow is partway through testing; the analyst one passed before launch. */
function seedPlans() {
  const by = (id: string) => SEED_WORKFLOWS.find((w) => w.id === id)!;
  const mech = by('w-mechanic');
  mech.testPlan = suggestPlan(mech, SEED_MODULES, SEED_WORKFLOWS);
  mech.testPlan.created = st('cassian', '2026-10-27T11:30');
  mech.testPlan.modified = st('hera', '2026-10-29T14:10');
  const [scoring] = mech.testPlan.suites;
  const failed = scoring.cases[1];
  const t = mech.comments.find((x) => x.target.kind === 'case')!;
  t.target = { ...t.target, id: failed.id };
  scoring.cases.forEach((c, i) => {
    c.created = st('cassian', '2026-10-27T11:30');
    if (i < 3) { c.link = `https://assess.onlineassessments.app/t/${mech.code}-TC1.${i + 1}`; c.linkCreated = st('hera', '2026-10-28T09:00'); }
    if (i === 0) c.result = { tester: 'Wedge Antilles', outcome: 'pass', notes: 'Every module presented; recommendation was Recommended as expected.', entered: st('hera', '2026-10-28T10:20') };
    if (i === 1) c.result = { tester: 'Wedge Antilles', outcome: 'fail', notes: 'Recommendation came back “Recommended with training” instead of “Not recommended”. The 0.45 band boundary looks too low. Raised with Cassian.', entered: st('hera', '2026-10-29T14:10') };
  });

  const intel = by('w-analyst');
  intel.testPlan = suggestPlan(intel, SEED_MODULES, SEED_WORKFLOWS);
  intel.testPlan.created = st('jyn', '2026-10-12T11:30');
  intel.testPlan.modified = st('jyn', '2026-10-13T10:50');
  intel.testPlan.suites.forEach((suite, si) => suite.cases.forEach((c, ci) => {
    c.created = st('jyn', '2026-10-12T11:30');
    c.link = `https://assess.onlineassessments.app/t/${intel.code}-TC${si + 1}.${ci + 1}`;
    c.linkCreated = st('jyn', '2026-10-12T13:00');
    c.result = {
      tester: ['Jyn Erso', 'Cassian Andor', 'Bodhi Rook'][(si + ci) % 3],
      outcome: si === 1 && ci === 0 ? 'retest' : 'pass',
      notes: si === 1 && ci === 0 ? 'Failed first: the warning didn’t show on the first tab switch. Passed on re-test after the fix.' : 'Worked as expected.',
      entered: st('jyn', '2026-10-13T10:50'),
    };
  }));
}
seedPlans();

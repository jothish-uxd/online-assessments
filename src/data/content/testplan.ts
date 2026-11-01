import { ME } from './people';
import { inputsFor, scoreKey } from './scoring';
import { typeInfo } from './itemTypes';
import type {
  CaseOutcome, Module, Stamp, TestCase, TestPlan, TestStatus, TestSuite, Variation, Workflow,
} from './types';

/* ---------- Test candidates and job metadata ---------- */

export interface TestCandidate {
  id: string; name: string; home: string; language: string;
  /** Modules this candidate already completed, for score re-use */
  history: { moduleId: string; workflowId: string; daysAgo: number }[];
}

export const TEST_CANDIDATES: TestCandidate[] = [
  { id: '123123', name: 'Han Solo', home: 'Corellia', language: 'Galactic Basic', history: [] },
  { id: '456456', name: 'Luke Skywalker', home: 'Tatooine', language: 'Galactic Basic', history: [{ moduleId: 'm-customer-judgement', workflowId: 'w-analyst', daysAgo: 20 }] },
  { id: '789789', name: 'Rey', home: 'Jakku', language: 'Galactic Basic', history: [] },
  { id: '246810', name: 'Finn', home: 'Chandrila', language: 'Galactic Basic', history: [{ moduleId: 'm-numerical', workflowId: 'w-mechanic', daysAgo: 400 }] },
  { id: '135791', name: 'Poe Dameron', home: 'Naboo', language: 'Galactic Basic', history: [] },
  { id: '112358', name: 'Chewbacca', home: 'Kashyyyk', language: 'Shyriiwook', history: [] },
];
export const candidate = (id: string) => TEST_CANDIDATES.find((c) => c.id === id);
export const candidateLabel = (id: string) => { const c = candidate(id); return c ? `${c.name} (ID: ${c.id})` : id; };

export const REGION_OF: Record<string, string> = {
  Chandrila: 'Core Worlds', Corellia: 'Core Worlds', Naboo: 'Mid Rim', Kashyyyk: 'Mid Rim', 'Mon Cala': 'Outer Rim',
  Lothal: 'Outer Rim', Bespin: 'Outer Rim', Dantooine: 'Outer Rim', Tatooine: 'Outer Rim', Jakku: 'Unknown Regions',
};
export const COUNTRIES = Object.keys(REGION_OF);
export const JOB_CODES = ['S03209', 'P04110', 'M02210', 'I05300', 'D01120', 'Q02040'];
export const JOB_FAMILIES = ['Starfighter Corps', 'Hangar Operations', 'Intelligence', 'Medical Corps', 'Fleet Logistics'];
export const JOB_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
export const JOB_CLASSES = ['Pilot | Red Squadron', 'Pilot | Rogue Squadron', 'Mechanic | Echo Base', 'Analyst | Rebel Intelligence', 'Medic | Home One', 'Quartermaster | Fleet Supply'];

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const at = (): Stamp => ({ by: ME, at: new Date().toISOString() });

/* ---------- Statuses ---------- */

export const OUTCOME_TEXT: Record<CaseOutcome, string> = { pass: 'Passed', fail: 'Failed', retest: 'Failed: re-tested', 'not-tested': 'Not tested' };
export const STATUS_TEXT: Record<TestStatus, string> = { 'not-started': 'Not started', 'in-progress': 'In progress', passed: 'Passed', failed: 'Failed' };

/** A case starts when its link exists, and ends with a result. A re-test after a failure counts as passed. */
export function caseStatus(c: TestCase): TestStatus {
  if (c.result.outcome === 'pass' || c.result.outcome === 'retest') return 'passed';
  if (c.result.outcome === 'fail') return 'failed';
  return c.link ? 'in-progress' : 'not-started';
}

export function rollUp(cases: TestCase[]): TestStatus | 'complete' {
  const s = cases.map(caseStatus);
  if (!s.length || s.every((x) => x === 'not-started')) return 'not-started';
  if (s.some((x) => x === 'failed')) return 'failed';
  if (s.every((x) => x === 'passed')) return 'complete';
  return 'in-progress';
}
export const ROLLUP_TEXT = { 'not-started': 'Not started', 'in-progress': 'In progress', passed: 'Passed', failed: 'Failed', complete: 'Complete' } as const;

export function counts(plan: TestPlan) {
  const all = plan.suites.flatMap((s) => s.cases);
  const by = (st: TestStatus) => all.filter((c) => caseStatus(c) === st).length;
  return { total: all.length, notStarted: by('not-started'), inProgress: by('in-progress'), passed: by('passed'), failed: by('failed') };
}

/* ---------- A suggested plan, built from the workflow's own setup ---------- */

type Draft = Omit<TestCase, 'id' | 'created' | 'result' | 'version'>;

export function suggestPlan(w: Workflow, _modules: Module[], workflows: Workflow[]): TestPlan {
  const stamp = at();
  const level = (w.name.match(/L(\d)/)?.[0]) ?? 'L4';
  const family = /pilot/i.test(w.name) ? 'Starfighter Corps' : /mechanic/i.test(w.name) ? 'Hangar Operations' : /analyst|intel/i.test(w.name) ? 'Intelligence' : /medic/i.test(w.name) ? 'Medical Corps' : 'Fleet Logistics';
  const cls = JOB_CLASSES.find((c) => c.toLowerCase().startsWith(family === 'Starfighter Corps' ? 'pilot' : family === 'Hangar Operations' ? 'mechanic' : family === 'Intelligence' ? 'analyst' : family === 'Medical Corps' ? 'medic' : 'quartermaster'))!;
  const job = { jobCode: JOB_CODES[Math.abs(hash(w.id)) % JOB_CODES.length], jobFamily: family, jobLevel: level, jobClass: cls };
  const mk = (d: Partial<Draft> & Pick<Draft, 'title' | 'summary' | 'candidateId' | 'instructions' | 'expected'>): TestCase => ({
    id: uid('tc'), version: w.version, country: candidate(d.candidateId)?.home ?? 'Corellia', ...job, ...d,
    result: { tester: '', outcome: 'not-tested', notes: '' }, created: stamp,
  });
  const suite = (reason: string, description: string, cases: TestCase[]): TestSuite => ({ id: uid('ts'), reason, description, cases, created: stamp });

  const suites: TestSuite[] = [];
  const hasId = w.steps.some((s) => s.kind === 'id-check');
  const camera = w.misbehavior.image.on || w.misbehavior.video.on;

  suites.push(suite('Scoring outcomes', 'Checks the composite scores give the right result for clear and borderline candidates.', [
    mk({ title: 'All correct answers', summary: 'A candidate who answers every item correctly should pass.', candidateId: '123123',
      instructions: ['Open the test link as the candidate', 'Answer every scored item correctly', 'Write full, on-topic answers to written and spoken items', 'Submit the assessment'],
      expected: 'Every module is presented\nAll module scores are at or near their maximum\nThe recommendation is the highest band' }),
    mk({ title: 'All incorrect answers', summary: 'A candidate who answers every item incorrectly should not pass.', candidateId: '789789',
      instructions: ['Open the test link as the candidate', 'Choose a wrong answer for every selected-response item', 'Leave written answers at the minimum length', 'Submit the assessment'],
      expected: 'Every module is presented\nModule scores are at or near zero\nThe recommendation is the lowest band' }),
    mk({ title: 'Just above the pass mark', summary: 'Boundary check: a score just above the threshold should pass.', candidateId: '135791',
      instructions: ['Answer items so the composite lands just above the pass threshold', 'Submit the assessment', 'Compare the composite with the threshold in Composite scores'],
      expected: 'The composite is above the threshold by less than 0.1\nThe recommendation is the passing band' }),
    mk({ title: 'Just below the pass mark', summary: 'Boundary check: a score just below the threshold should not pass.', candidateId: '246810',
      instructions: ['Answer items so the composite lands just below the pass threshold', 'Submit the assessment'],
      expected: 'The composite is below the threshold by less than 0.1\nThe recommendation is the band below passing' }),
  ]));

  if (hasId || camera) {
    suites.push(suite('Misbehavior warning and IVV', 'Checks misbehavior detection, warnings and ID validation and verification protect the assessment.', [
      ...(hasId ? [mk({ title: 'ID can’t be verified', summary: 'The ID photo doesn’t match the selfie.', candidateId: '123123',
        instructions: ['Take the selfie as one tester', 'Show a different tester’s ID', `Use all ${w.misbehavior.id.attempts} attempts`],
        expected: w.misbehavior.id.onFail === 'block' ? 'The candidate is stopped after the last attempt\nThe session is logged for review' : 'The candidate can continue\nThe session is sent to proctoring review with a different-person flag' })] : []),
      ...(camera ? [mk({ title: 'Another person in frame', summary: 'A second person appears during a scored module.', candidateId: '456456',
        instructions: ['Pass the camera check', 'During the second scored module, have a second person lean into frame for 10 seconds', 'Finish the assessment'],
        expected: 'An “Another person in frame” flag is raised at the right time\nThe session reaches proctoring review if the flag count meets the threshold' })] : []),
      mk({ title: 'Candidate leaves the tab', summary: 'Switching away mid-module warns, then flags.', candidateId: '135791',
        instructions: ['Start a scored module', 'Switch to another tab for 5 seconds, then return', 'Do it again in the next module'],
        expected: 'A warning shows the first time\nThe second time is flagged\nBoth events are logged with timestamps' }),
    ]));
  }

  if (w.scoring.variations.length) {
    suites.push(suite('Regional variations', 'Checks candidates get the score variation that matches their metadata.', w.scoring.variations.map((v: Variation) => {
      const home = v.rules.find((r) => r.category === 'region' && r.op === 'is')?.values[0];
      const country = COUNTRIES.find((c) => REGION_OF[c] === home) ?? 'Corellia';
      const cand = TEST_CANDIDATES.find((c) => c.home === country) ?? TEST_CANDIDATES[0];
      return mk({ title: `${v.name} variation`, summary: `A candidate from ${country} should be scored with the ${v.name} variation.`, candidateId: cand.id, country,
        instructions: ['Open the test link as the candidate', 'Complete the assessment normally', 'Open System behavior and score results'],
        expected: `Score variation selected is ${v.name}\nScores marked for ${v.name} are calculated` });
    })));
  }

  const eq = w.settings.equivalent.map((id) => workflows.find((x) => x.id === id)).filter(Boolean) as Workflow[];
  if (eq.length) {
    suites.push(suite('Workflow score re-use', 'Checks recent scores from equivalent workflows are re-used instead of re-tested.', [
      mk({ title: 'Recent score from an equivalent workflow', summary: `A candidate who took ${eq[0].name} recently skips the modules it shares.`, candidateId: '456456',
        instructions: ['Open the test link as the candidate', 'Complete the modules that are presented'],
        expected: `Shared modules are skipped with the reason “Score re-used”\nRe-used module scores are marked in Score results\nThe candidate isn’t asked to retake them` }),
    ]));
  }

  const tl = w.settings.timeLimit;
  const timedMods = _modules.filter((m) => m.timing.mode !== 'off' && w.steps.some((s) => s.kind === 'module' && s.moduleId === m.id));
  if (tl.on || timedMods.length) {
    const most = tl.extraTime.length ? Math.max(...tl.extraTime) : 0;
    suites.push(suite('Timing', 'Checks item timers and the assessment time limit behave as set, including extra time.', [
      ...(tl.on ? [mk({ title: 'Time runs out', summary: `The ${tl.minutes} minute limit ends the assessment.`, candidateId: '246810',
        instructions: ['Open the test link as the candidate', 'Answer the first module, then wait without answering', `Let the ${tl.minutes} minute clock run out`],
        expected: tl.onExpire === 'submit'
          ? 'A warning shows at 5 minutes and 1 minute left\nThe assessment submits the moment time runs out\nAnswers given so far are scored; the rest are marked unanswered'
          : 'A warning shows at 5 minutes and 1 minute left\nThe candidate can finish the item on screen, then the assessment submits\nUnseen items are marked unanswered' }),
      ...(most ? [mk({ title: `${most}× extra time`, summary: 'An approved accommodation stretches the limit and item timers.', candidateId: '112358',
        instructions: [`Grant ${most}× extra time to the test candidate`, 'Open the test link as the candidate', 'Check the clock and an item timer'],
        expected: `The limit shows ${Math.round(tl.minutes * most)} minutes\nItem timers are stretched by the same amount` })] : [])] : []),
      ...(timedMods.length ? [mk({ title: 'Item timer expires', summary: `An item in ${timedMods[0].name} times out.`, candidateId: '789789',
        instructions: [`Start ${timedMods[0].name}`, 'Leave the first item unanswered until its timer ends'],
        expected: 'The timer is announced to screen readers at 30 and 10 seconds\nThe item moves on and is marked unanswered\nThe candidate can’t go back to it' })] : []),
    ]));
  }

  suites.push(suite('Candidate experience', 'Checks the assessment works for candidates using assistive technology and the supported devices.', [
    mk({ title: 'Keyboard and screen reader only', summary: 'The whole assessment can be completed without a mouse, with a screen reader on.', candidateId: '112358',
      instructions: ['Turn on VoiceOver (Mac: ⌘ F5)', 'Complete the assessment using only the keyboard', 'Note any item you can’t reach, hear or answer'],
      expected: 'Every item, choice and button is reachable with Tab and arrow keys\nImages are described by their alt text; audio and video offer transcripts\nTimers can be paused or extended' }),
  ]));

  return {
    name: `${w.code}_V${w.version}`,
    description: `Validates the ${w.name} online assessment before launch: that the right modules are presented, scores and recommendations are correct at the boundaries, misbehavior is detected and the experience works for every candidate.`,
    created: stamp, suites,
  };
}

/* ---------- Simulated run: what the system did, and the scores ---------- */

function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h; }
function rng(seed: string) { let h = hash(seed); return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }

export interface Presented { name: string; kind: string; presented: boolean; reason: string }
export interface Run {
  steps: Presented[];
  variation: { name: string; isDefault: boolean } | null;
  workflowScores: { label: string; value: string }[];
  moduleScores: { label: string; value: string; reused: boolean }[];
  itemScores: { label: string; value: string }[];
  oaScore: string;
}

export function matchVariation(w: Workflow, c: TestCase): Variation | null {
  const cand = candidate(c.candidateId);
  const value = (cat: string) => cat === 'country' ? [c.country] : cat === 'region' ? [REGION_OF[c.country]] : cat === 'job-level' ? [c.jobLevel] : [cand?.language ?? ''];
  const fits = (v: Variation) => v.rules.every((r) => {
    const hit = value(r.category).some((x) => r.values.includes(x));
    return r.op === 'is' ? hit : !hit;
  });
  const hits = w.scoring.variations.filter(fits);
  return hits.find((v) => !v.isDefault) ?? hits[0] ?? w.scoring.variations.find((v) => v.isDefault) ?? null;
}

export function simulate(w: Workflow, c: TestCase, modules: Module[], workflows: Workflow[]): Run {
  const r = rng(c.id);
  const cand = candidate(c.candidateId);
  const t = c.title.toLowerCase();
  const level = t.includes('all correct') ? 0.96 : t.includes('all incorrect') ? 0.08 : t.includes('just above') ? 0.58 : t.includes('just below') ? 0.48 : 0.45 + r() * 0.4;

  const reusedFrom = (moduleId: string) => {
    const h = cand?.history.find((x) => x.moduleId === moduleId && x.daysAgo <= w.settings.scoreDays && (x.workflowId === w.id || w.settings.equivalent.includes(x.workflowId)));
    return h ? workflows.find((x) => x.id === h.workflowId)?.name ?? 'an equivalent workflow' : null;
  };

  const steps: Presented[] = w.steps.map((s) => {
    if (s.kind === 'id-check') return { name: 'ID verification', kind: 'checkpoint', presented: true, reason: t.includes('id can') ? 'Not verified' : '' };
    if (s.kind === 'proctoring') return { name: 'Proctoring system check', kind: 'checkpoint', presented: true, reason: '' };
    const m = modules.find((x) => x.id === s.moduleId);
    if (!m) return { name: 'Deleted module', kind: 'module', presented: false, reason: 'Module no longer exists' };
    const from = m.kind === 'evaluative' ? reusedFrom(m.id) : null;
    return { name: m.name, kind: m.kind === 'evaluative' ? 'evaluation' : 'content', presented: !from, reason: from ? `Score re-used from ${from}` : '' };
  });

  const v = matchVariation(w, c);
  const vals: Record<string, number | string> = {};
  const moduleScores: Run['moduleScores'] = [];
  inputsFor(w.steps, modules).forEach((inp) => {
    const m = modules.find((x) => x.name === inp.source);
    const reused = !!(m && reusedFrom(m.id));
    const scaled = Math.max(0, Math.min(1, level + (r() - 0.5) * 0.08));
    let value: number | string;
    if (inp.name.endsWith('_scaled')) value = +scaled.toFixed(4);
    else if (inp.name.endsWith('_raw')) value = Math.round(scaled * (m ? m.items.reduce((s, i) => s + (typeInfo(i.type).scored ? i.points : 0), 0) : 10));
    else if (inp.name.endsWith('_missing_audio')) value = 'FALSE';
    else if (inp.name === 'id_verified') value = t.includes('id can') ? 'FALSE' : 'TRUE';
    else value = t.includes('frame') || t.includes('tab') ? 3 : 0;
    vals[inp.name] = value;
    moduleScores.push({ label: inp.name, value: String(value), reused });
  });

  const workflowScores: Run['workflowScores'] = [];
  const z = (level - 0.5) / 0.2;
  const band = z < -1.65 ? 'Strongly not recommended' : z < -0.85 ? 'Not recommended' : z < 1.22 ? 'Moderately recommended' : 'Recommended';
  let oa = '';
  for (const s of w.scoring.scores) {
    if (v && s.variationId && s.variationId !== v.id) continue;
    if (s.kind === 'r') {
      s.outputs.forEach((o) => {
        const isLabel = /recommend|result|band|outcome/.test(o.name);
        const value = isLabel ? band : o.name.startsWith('z_') ? (z + (r() - 0.5) * 0.2).toFixed(4) : (level + (r() - 0.5) * 0.05).toFixed(4);
        vals[o.name] = value;
        workflowScores.push({ label: o.name, value });
        if (isLabel) oa = value;
      });
      continue;
    }
    let value: string;
    if (s.type === 'reference') value = String(vals[s.reference] ?? '—');
    else if (s.type === 'weighted') value = s.weights.reduce((sum, x) => sum + (Number(vals[x.input]) || 0) * (Number(x.weight) || 0), 0).toFixed(4);
    else if (s.mode === 'band') {
      const src = Number(vals[s.bandSource]);
      const b = s.bands.find((x) => (x.min === '' || src >= Number(x.min)) && (x.max === '' || src < Number(x.max)));
      value = b?.label ?? 'No band';
      oa = value;
    } else {
      const hold = (cond: string, op: string, val: string) => {
        const a = vals[cond]; const bv = val === 'TRUE' || val === 'FALSE' ? val : Number(val);
        const na = typeof bv === 'number' ? Number(a) : a;
        return op === '=' ? na === bv : op === '!=' ? na !== bv : op === '>' ? na > bv : op === '>=' ? na >= bv : op === '<' ? na < bv : na <= bv;
      };
      const hit = s.mappings.find((m) => m.expressions.reduce((acc, x, i) => {
        const h = hold(x.condition, x.operand, x.value);
        return i === 0 ? h : x.join === 'AND' ? acc && h : acc || h;
      }, true));
      value = hit ? String(vals[hit.reference] ?? '—') : 'No mapping held';
    }
    vals[s.name] = value;
    workflowScores.push({ label: s.name, value });
  }
  if (!oa) oa = band;

  const itemScores: Run['itemScores'] = [];
  w.steps.forEach((s) => {
    if (s.kind !== 'module') return;
    const m = modules.find((x) => x.id === s.moduleId);
    if (!m || m.kind !== 'evaluative' || reusedFrom(m.id)) return;
    m.items.forEach((it, i) => {
      if (!typeInfo(it.type).scored) return;
      itemScores.push({ label: `${scoreKey(m)}_item${i + 1}`, value: String(Math.round(Math.min(1, level + (r() - 0.5) * 0.3) * it.points)) });
    });
  });

  return { steps, variation: v ? { name: v.name, isDefault: v.isDefault } : null, workflowScores, moduleScores, itemScores, oaScore: oa };
}

/* ---------- Download ---------- */

export function toCsv(w: Workflow) {
  const plan = w.testPlan!;
  const rows = [['Suite', 'Reason', 'Case', 'Scenario', 'Candidate', 'Country', 'Job code', 'Job family', 'Job level', 'Job classification', 'Status', 'Result', 'Tester', 'Date entered', 'Notes', 'Test link']];
  plan.suites.forEach((s, si) => s.cases.forEach((c, ci) => rows.push([
    `Test suite ${si + 1}`, s.reason, `${si + 1}.${ci + 1}`, c.title, candidateLabel(c.candidateId), c.country, c.jobCode, c.jobFamily,
    c.jobLevel, c.jobClass, STATUS_TEXT[caseStatus(c)], OUTCOME_TEXT[c.result.outcome], c.result.tester, c.result.entered?.at.slice(0, 10) ?? '', c.result.notes, c.link ?? '',
  ])));
  return rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export const newCaseId = () => uid('tc');
export const newSuiteId = () => uid('ts');

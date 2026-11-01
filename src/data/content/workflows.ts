import { peek, put, useStored } from '../store';
import { fmtSeconds, moduleTime, now } from './store';
import { SEED_WORKFLOWS } from './seedWorkflows';
import type { Activity, CommentTarget, Misbehavior, Module, PersonId, Thread, TestCase, TestPlan, TestSuite, Score, Stage, Step, Variation, Workflow, WorkflowSettings } from './types';
import { checkR, checkScratch, inputsFor, outputsOf } from './scoring';
import { NO_VIDEO_DEVICES, defaultMisbehavior } from './misbehavior';

// v5: workflows gained composite scores, misbehavior settings and test plans.
const KEY = 'content:v7:workflows'; // v7: time limits
const all = () => peek<Workflow[]>(KEY) ?? SEED_WORKFLOWS;
export const useWorkflows = () => useStored<Workflow[]>(KEY, () => SEED_WORKFLOWS)[0];

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'program-review', label: 'Program review' },
  { id: 'e2e', label: 'End-to-end testing' },
  { id: 'signoff', label: 'Final sign-off' },
  { id: 'launch-ready', label: 'Launch ready' },
  { id: 'live', label: 'Live' },
];
export const stageIndex = (s: Stage) => STAGES.findIndex((x) => x.id === s);
export const stageLabel = (s: Stage) => STAGES[stageIndex(s)].label;

function log(history: Activity[], action: string): Activity[] {
  const entry = { ...now(), action };
  const last = history[0];
  if (last && last.by === entry.by && last.action === action && Date.parse(entry.at) - Date.parse(last.at) < 10 * 60_000) {
    return [entry, ...history.slice(1)];
  }
  return [entry, ...history];
}

/** Change a workflow. Edits mark it as having unsaved changes. */
function patch(id: string, fn: (w: Workflow) => Workflow, action?: string, markDirty = true) {
  put(KEY, all().map((w) => {
    if (w.id !== id) return w;
    const next = fn(w);
    return {
      ...next,
      dirty: markDirty ? true : next.dirty,
      edited: now(),
      history: action ? log(next.history, action) : next.history,
    };
  }));
}

export function createWorkflow(name: string): Workflow {
  const stamp = now();
  const code = `${name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')}_${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
  const w: Workflow = {
    id: uid('w'), name: name.trim(), code, type: 'Candidate', stage: 'build', version: 1, dirty: true, steps: [],
    scoring: { variations: [], scores: [] },
    misbehavior: defaultMisbehavior(),
    testPlan: null,
    reviews: [],
    comments: [],
    settings: { ...SEED_WORKFLOWS[0].settings, ats: [], devices: ['desktop'], equivalent: [],
      reviewers: { ops: [], program: [], e2e: null, signoff: [], launch: null } },
    created: stamp, edited: stamp, history: [{ ...stamp, action: 'Created the workflow' }],
  };
  put(KEY, [w, ...all()]);
  return w;
}

export function deleteWorkflow(id: string) {
  put(KEY, all().filter((w) => w.id !== id).map((w) => ({ ...w, settings: { ...w.settings, equivalent: w.settings.equivalent.filter((e) => e !== id) } })));
}

/** Insert a step at a position. Returns the new step's id. */
export function insertStep(id: string, index: number, step: Omit<Step, 'id'>, label: string): string {
  const stepId = uid('s');
  patch(id, (w) => {
    const steps = [...w.steps];
    steps.splice(index, 0, { ...step, id: stepId } as Step);
    // Checkpoints added on the graph switch on the settings behind them.
    const mb = w.misbehavior;
    if (step.kind === 'id-check') return { ...w, steps, misbehavior: { ...mb, selfie: { ...mb.selfie, on: true } } };
    if (step.kind === 'proctoring' && !mb.image.on && !mb.video.on) {
      const videoOk = !w.settings.devices.some((d) => NO_VIDEO_DEVICES.includes(d));
      return { ...w, steps, misbehavior: { ...mb, selfie: { ...mb.selfie, on: true }, [videoOk ? 'video' : 'image']: { ...mb[videoOk ? 'video' : 'image'], on: true } } as Misbehavior };
    }
    return { ...w, steps };
  }, `Added ${label}`);
  return stepId;
}

export function moveStep(id: string, stepId: string, toIndex: number, label: string) {
  patch(id, (w) => {
    const steps = [...w.steps];
    const from = steps.findIndex((s) => s.id === stepId);
    if (from < 0) return w;
    const [s] = steps.splice(from, 1);
    steps.splice(toIndex > from ? toIndex - 1 : toIndex, 0, s);
    return { ...w, steps };
  }, `Moved ${label}`);
}

export function removeStep(id: string, stepId: string, label: string) {
  patch(id, (w) => {
    const step = w.steps.find((s) => s.id === stepId);
    const steps = w.steps.filter((s) => s.id !== stepId);
    // The proctoring check is where camera proctoring starts; without it, there's none.
    if (step?.kind === 'proctoring') {
      return { ...w, steps, misbehavior: { ...w.misbehavior, image: { ...w.misbehavior.image, on: false }, video: { ...w.misbehavior.video, on: false } } };
    }
    return { ...w, steps };
  }, `Removed ${label}`);
}

/* ---------- Test plan: testing doesn't change the workflow, so it never marks it unsaved ---------- */

function patchPlan(id: string, fn: (p: TestPlan) => TestPlan, action: string) {
  patch(id, (w) => (w.testPlan ? { ...w, testPlan: { ...fn(w.testPlan), modified: { by: now().by, at: now().at } } } : w), action, false);
}
export function createTestPlan(id: string, plan: TestPlan) {
  patch(id, (w) => ({ ...w, testPlan: plan }), 'Created the test plan', false);
}
export function addSuite(id: string, suite: TestSuite) {
  patchPlan(id, (p) => ({ ...p, suites: [...p.suites, suite] }), `Added test suite: ${suite.reason}`);
}
export function deleteSuite(id: string, suiteId: string, reason: string) {
  patchPlan(id, (p) => ({ ...p, suites: p.suites.filter((s) => s.id !== suiteId) }), `Deleted test suite: ${reason}`);
}
function patchCases(id: string, suiteId: string, fn: (cs: TestCase[]) => TestCase[], action: string) {
  patchPlan(id, (p) => ({ ...p, suites: p.suites.map((s) => (s.id === suiteId ? { ...s, cases: fn(s.cases) } : s)) }), action);
}
export function addCase(id: string, suiteId: string, c: TestCase, after?: string) {
  patchCases(id, suiteId, (cs) => {
    if (!after) return [...cs, c];
    const i = cs.findIndex((x) => x.id === after);
    return [...cs.slice(0, i + 1), c, ...cs.slice(i + 1)];
  }, `Added test case: ${c.title}`);
}
export function updateCase(id: string, suiteId: string, c: TestCase, action: string) {
  patchCases(id, suiteId, (cs) => cs.map((x) => (x.id === c.id ? c : x)), action);
}
export function deleteCase(id: string, suiteId: string, caseId: string, title: string) {
  patchCases(id, suiteId, (cs) => cs.filter((x) => x.id !== caseId), `Deleted test case: ${title}`);
}

/* ---------- Misbehavior settings ---------- */

/** Where a checkpoint goes: after the opening content modules, before the first evaluation module. */
function checkpointIndex(w: Workflow, modules: Module[], kind: 'id-check' | 'proctoring') {
  const firstEval = w.steps.findIndex((s) => s.kind === 'module' && modules.find((m) => m.id === s.moduleId)?.kind === 'evaluative');
  let at = firstEval < 0 ? w.steps.length : firstEval;
  if (kind === 'id-check') {
    const p = w.steps.findIndex((s) => s.kind === 'proctoring');
    if (p >= 0 && p < at) at = p;
  }
  return at;
}

export function updateMisbehavior(id: string, fn: (m: Misbehavior) => Misbehavior, action: string) {
  patch(id, (w) => ({ ...w, misbehavior: fn(w.misbehavior) }), action);
}

/** ID validation and verification: adds or removes the ID verification step, and turns on selfie capture it depends on. */
export function setIdVerification(id: string, on: boolean, modules: Module[]) {
  patch(id, (w) => {
    if (on) {
      if (w.steps.some((s) => s.kind === 'id-check')) return w;
      const steps = [...w.steps];
      steps.splice(checkpointIndex(w, modules, 'id-check'), 0, { id: uid('s'), kind: 'id-check' });
      return { ...w, steps, misbehavior: { ...w.misbehavior, selfie: { ...w.misbehavior.selfie, on: true } } };
    }
    return { ...w, steps: w.steps.filter((s) => s.kind !== 'id-check') };
  }, on ? 'Turned on ID validation and verification' : 'Turned off ID validation and verification');
}

/** Image or video proctoring: keeps the proctoring check on the graph while either is on. */
export function setCameraProctoring(id: string, kind: 'image' | 'video', on: boolean, modules: Module[]) {
  patch(id, (w) => {
    const mb = { ...w.misbehavior, [kind]: { ...w.misbehavior[kind], on } } as Misbehavior;
    if (on) mb.selfie = { ...mb.selfie, on: true };
    const anyCamera = mb.image.on || mb.video.on;
    let steps = w.steps;
    if (anyCamera && !steps.some((s) => s.kind === 'proctoring')) {
      steps = [...steps];
      steps.splice(checkpointIndex(w, modules, 'proctoring'), 0, { id: uid('s'), kind: 'proctoring' });
    }
    if (!anyCamera) steps = steps.filter((s) => s.kind !== 'proctoring');
    return { ...w, steps, misbehavior: mb };
  }, `${on ? 'Turned on' : 'Turned off'} ${kind} proctoring`);
}

/** Video proctoring can't run on phones, tablets or TVs. */
export function dropNonVideoDevices(id: string) {
  patch(id, (w) => ({ ...w, settings: { ...w.settings, devices: w.settings.devices.filter((d) => !NO_VIDEO_DEVICES.includes(d)) } }), 'Limited devices to desktop and laptop for video proctoring');
}

export function updateWorkflow(id: string, p: Partial<Pick<Workflow, 'name'>>, action = 'Renamed the workflow') {
  patch(id, (w) => ({ ...w, ...p }), action);
}

export function updateSettings(id: string, p: Partial<WorkflowSettings>, action = 'Edited settings') {
  patch(id, (w) => ({ ...w, settings: { ...w.settings, ...p } }), action);
}

/** Save the current draft as a new version. */
export function saveVersion(id: string) {
  const w = all().find((x) => x.id === id);
  if (!w) return;
  const version = w.dirty ? w.version + 1 : w.version;
  patch(id, (x) => ({ ...x, version, dirty: false }), `Saved version ${version}`, false);
}

export function setStage(id: string, stage: Stage, action: string) {
  patch(id, (w) => ({ ...w, stage }), action, false);
}

/* ---------- Composite scores ---------- */

export const newId = uid;

export function addScore(id: string, score: Score, action: string) {
  patch(id, (w) => ({ ...w, scoring: { ...w.scoring, scores: [...w.scoring.scores, score] } }), action);
}
export function replaceScore(id: string, score: Score, action: string) {
  patch(id, (w) => ({ ...w, scoring: { ...w.scoring, scores: w.scoring.scores.map((x) => (x.id === score.id ? score : x)) } }), action);
}
export function removeScore(id: string, scoreId: string, action: string) {
  patch(id, (w) => ({ ...w, scoring: { ...w.scoring, scores: w.scoring.scores.filter((x) => x.id !== scoreId) } }), action);
}
export function moveScore(id: string, scoreId: string, d: -1 | 1) {
  patch(id, (w) => {
    const list = [...w.scoring.scores];
    const i = list.findIndex((x) => x.id === scoreId);
    const j = i + d;
    if (i < 0 || j < 0 || j >= list.length) return w;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...w, scoring: { ...w.scoring, scores: list } };
  }, 'Reordered scores');
}
export function saveVariation(id: string, v: Variation, action: string) {
  patch(id, (w) => {
    const others = w.scoring.variations.filter((x) => x.id !== v.id).map((x) => (v.isDefault ? { ...x, isDefault: false } : x));
    return { ...w, scoring: { ...w.scoring, variations: [...others, v] } };
  }, action);
}
export function deleteVariation(id: string, variationId: string, name: string) {
  patch(id, (w) => ({
    ...w,
    scoring: {
      variations: w.scoring.variations.filter((x) => x.id !== variationId),
      scores: w.scoring.scores.map((x) => (x.variationId === variationId ? { ...x, variationId: null } : x)),
    },
  }), `Deleted variation ${name}`);
}

/** Every score name available to conditions and references: inputs, then outputs of other scores. */
export function knownScores(w: Workflow, modules: Module[], exceptScoreId?: string) {
  const inputs = inputsFor(w.steps, modules).map((x) => x.name);
  const outputs = w.scoring.scores.filter((x) => x.id !== exceptScoreId).flatMap(outputsOf);
  return { inputs, outputs, all: [...inputs, ...outputs] };
}

/** Workflows that use a module, for the module's "Used in". */
export const workflowsUsing = (moduleId: string, list: Workflow[]) =>
  list.filter((w) => w.steps.some((s) => s.kind === 'module' && s.moduleId === moduleId));

/* ---------- Validation ---------- */

export interface Issue { text: string; stepId?: string }

/** Seconds of timed items across the workflow's modules, and how many scored items are untimed. */
export function timedTotal(w: Workflow, modules: Module[]) {
  let seconds = 0; let untimed = 0;
  for (const s of w.steps) {
    if (s.kind !== 'module') continue;
    const m = modules.find((x) => x.id === s.moduleId);
    if (!m) continue;
    const t = moduleTime(m);
    seconds += t.seconds; untimed += t.untimed;
  }
  return { seconds, untimed };
}

export function validate(w: Workflow, modules: Module[]): Issue[] {
  const out: Issue[] = [];
  const mods = w.steps.map((s) => s.kind === 'module' ? modules.find((m) => m.id === s.moduleId) : undefined);
  w.steps.forEach((s, i) => {
    if (s.kind !== 'module') return;
    const m = mods[i];
    if (!m) out.push({ text: `Step ${i + 1} points to a module that was deleted.`, stepId: s.id });
    else if (m.status !== 'published') out.push({ text: `“${m.name}” isn’t published yet.`, stepId: s.id });
  });
  const seen = new Set<string>();
  w.steps.forEach((s) => {
    if (s.kind !== 'module') return;
    if (seen.has(s.moduleId)) out.push({ text: `“${modules.find((m) => m.id === s.moduleId)?.name ?? 'A module'}” appears more than once.`, stepId: s.id });
    seen.add(s.moduleId);
  });
  if (!mods.some((m) => m?.kind === 'evaluative')) out.push({ text: 'Add at least one evaluative module.' });
  const firstEval = mods.findIndex((m) => m?.kind === 'evaluative');
  const pIdx = w.steps.findIndex((s) => s.kind === 'proctoring');
  const idIdx = w.steps.findIndex((s) => s.kind === 'id-check');
  if (pIdx >= 0 && firstEval >= 0 && pIdx > firstEval) out.push({ text: 'Move the proctoring check above the first evaluative module, so every scored item is recorded.', stepId: w.steps[pIdx].id });
  if (pIdx >= 0 && idIdx > pIdx) out.push({ text: 'Put ID verification before the proctoring check.', stepId: w.steps[idIdx].id });
  if (w.steps.length && w.steps[0].kind !== 'module') out.push({ text: 'Start with a module, such as consent, before any checkpoint.', stepId: w.steps[0].id });
  if (!w.scoring.scores.length) out.push({ text: 'Add at least one composite score.' });
  w.scoring.scores.forEach((sc) => {
    const k = knownScores(w, modules, sc.id);
    if (sc.kind === 'r') {
      const n = checkR(sc.formula, k.all).errors.length;
      if (n) out.push({ text: `The R formula has ${n} error${n === 1 ? '' : 's'}. Check it on Composite scores.` });
    } else {
      const taken = w.scoring.scores.filter((x) => x.id !== sc.id).flatMap(outputsOf);
      if (checkScratch(sc, taken, k.all).length) out.push({ text: `Score ${sc.name} needs fixing on Composite scores.` });
    }
  });
  const mb = w.misbehavior;
  const hasProctorStep = w.steps.some((s) => s.kind === 'proctoring');
  if (hasProctorStep && !mb.image.on && !mb.video.on) out.push({ text: 'The proctoring check is on the graph, but image and video proctoring are both off. Turn one on in Misbehavior settings, or remove the check.', stepId: w.steps.find((s) => s.kind === 'proctoring')!.id });
  if (mb.video.on && w.settings.devices.some((d) => NO_VIDEO_DEVICES.includes(d))) out.push({ text: 'Video proctoring only works on desktop and laptop. Remove the other supported devices, or turn video off.' });
  if (w.steps.some((s) => s.kind === 'id-check') && !mb.id.documents.length) out.push({ text: 'Choose at least one ID document candidates can show.' });
  if (w.steps.some((s) => s.kind === 'id-check') && !mb.selfie.on) out.push({ text: 'ID verification compares the ID photo with a selfie. Turn on selfie capture.' });
  const tl = w.settings.timeLimit;
  if (tl.on) {
    const t = timedTotal(w, modules);
    if (!(tl.minutes > 0)) out.push({ text: 'Set how many minutes candidates have for the whole assessment.' });
    else if (t.seconds > tl.minutes * 60) out.push({ text: `Timed items add up to ${fmtSeconds(t.seconds)}, longer than the ${tl.minutes} min time limit. Raise the limit or shorten item timers.` });
  }
  if (!(w.settings.linkDays > 0)) out.push({ text: 'Set how many days the workflow link stays open.' });
  if (!(w.settings.scoreDays > 0)) out.push({ text: 'Set how many days scores stay valid.' });
  if (!w.settings.ats.length) out.push({ text: 'Choose at least one supported ATS.' });
  if (!w.settings.devices.length) out.push({ text: 'Choose at least one supported device.' });
  return out;
}

/* ---------- Program review ---------- */

/** The open review round, if the workflow is waiting on one. */
export const openRound = (w: Workflow) => {
  const r = w.reviews[w.reviews.length - 1];
  return w.stage === 'program-review' && r && !r.decision && !r.withdrawn ? r : undefined;
};
/** The last finished round, e.g. to show that changes were requested. */
export const lastDecision = (w: Workflow) => [...w.reviews].reverse().find((r) => r.decision)?.decision;

const thread = (target: CommentTarget, body: string): Thread => {
  const n = now();
  return { id: uid('th'), target, comments: [{ id: uid('c'), by: n.by, at: n.at, body }] };
};
const WHOLE: CommentTarget = { kind: 'workflow', label: 'Whole workflow', tab: 'builder' };

export function requestReview(id: string, reviewers: PersonId[], message: string) {
  patch(id, (w) => ({
    ...w,
    stage: 'program-review',
    reviews: [...w.reviews, { n: w.reviews.length + 1, requested: now(), reviewers, message: message.trim() }],
    comments: message.trim() ? [thread(WHOLE, message.trim()), ...w.comments] : w.comments,
  }), `Requested Program review from ${reviewers.length} reviewer${reviewers.length === 1 ? '' : 's'}`, false);
}

export function withdrawReview(id: string) {
  patch(id, (w) => ({
    ...w, stage: 'build',
    reviews: w.reviews.map((r, i) => (i === w.reviews.length - 1 ? { ...r, withdrawn: now() } : r)),
  }), 'Withdrew the review request', false);
}

/** Approve (locks the workflow and moves it to End-to-end testing) or request changes (back to Build). */
export function decideReview(id: string, outcome: 'approved' | 'changes', note: string) {
  patch(id, (w) => ({
    ...w,
    stage: outcome === 'approved' ? 'e2e' : 'build',
    reviews: w.reviews.map((r, i) => (i === w.reviews.length - 1 ? { ...r, decision: { ...now(), outcome, note: note.trim() } } : r)),
    comments: note.trim()
      ? [thread({ ...WHOLE, label: outcome === 'approved' ? 'Review: approved' : 'Review: changes requested' }, note.trim()), ...w.comments]
      : w.comments,
  }), outcome === 'approved' ? 'Approved in Program review; locked for testing' : 'Requested changes in Program review', false);
}

/** Unlock an approved workflow for edits. It goes back to Build and needs Program review again. */
export function unlockWorkflow(id: string) {
  patch(id, (w) => ({ ...w, stage: 'build' }), 'Unlocked for edits; needs Program review again', false);
}

/* ---------- Comments: never mark the workflow unsaved ---------- */

export function addThread(id: string, target: CommentTarget, body: string) {
  patch(id, (w) => ({ ...w, comments: [thread(target, body), ...w.comments] }), undefined, false);
}
export function replyThread(id: string, threadId: string, body: string) {
  const n = now();
  patch(id, (w) => ({
    ...w,
    comments: w.comments.map((t) => (t.id === threadId ? { ...t, resolved: undefined, comments: [...t.comments, { id: uid('c'), by: n.by, at: n.at, body }] } : t)),
  }), undefined, false);
}
export function resolveThread(id: string, threadId: string, resolved: boolean) {
  patch(id, (w) => ({ ...w, comments: w.comments.map((t) => (t.id === threadId ? { ...t, resolved: resolved ? now() : undefined } : t)) }), undefined, false);
}
export function deleteComment(id: string, threadId: string, commentId: string) {
  patch(id, (w) => ({
    ...w,
    comments: w.comments
      .map((t) => (t.id === threadId ? { ...t, comments: t.comments.filter((c) => c.id !== commentId) } : t))
      .filter((t) => t.comments.length),
  }), undefined, false);
}

import { peek, put, useStored } from '../store';
import { now } from './store';
import { SEED_WORKFLOWS } from './seedWorkflows';
import type { Activity, Module, Score, Stage, Step, Variation, Workflow, WorkflowSettings } from './types';
import { checkR, checkScratch, inputsFor, outputsOf } from './scoring';

// v3: workflows gained composite scores.
const KEY = 'content:v3:workflows';
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
  patch(id, (w) => ({ ...w, steps: w.steps.filter((s) => s.id !== stepId) }), `Removed ${label}`);
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
  if (!(w.settings.linkDays > 0)) out.push({ text: 'Set how many days the workflow link stays open.' });
  if (!(w.settings.scoreDays > 0)) out.push({ text: 'Set how many days scores stay valid.' });
  if (!w.settings.ats.length) out.push({ text: 'Choose at least one supported ATS.' });
  if (!w.settings.devices.length) out.push({ text: 'Choose at least one supported device.' });
  return out;
}

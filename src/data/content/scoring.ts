import type { Module, Score, ScratchScore, Step } from './types';

/* ---------- Input scores: what the workflow's steps produce ---------- */

export interface InputScore { name: string; source: string; type: 'Module' | 'Flag' | 'Checkpoint' | 'Proctoring'; about: string }

/** Short, stable score keys for the sample modules; new modules get one from their name. */
const KEYS: Record<string, string> = {
  'm-pilot': 'pilot_spatial', 'm-customer-judgement': 'mission_focus', 'm-leadership': 'squadron_lead',
  'm-written': 'written_comm', 'm-spoken': 'spoken_comm', 'm-numerical': 'numerical',
  'm-starship': 'starship_maint', 'm-intel': 'intel_analysis', 'm-medical': 'medical_triage', 'm-quartermaster': 'quartermaster',
};
export const scoreKey = (m: Module) =>
  KEYS[m.id] ?? (m.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 28) || m.id.replace(/\W/g, '_'));

export function inputsFor(steps: Step[], modules: Module[]): InputScore[] {
  const out: InputScore[] = [];
  steps.forEach((s) => {
    if (s.kind === 'id-check') out.push({ name: 'id_verified', source: 'ID verification', type: 'Checkpoint', about: 'TRUE when the candidate’s ID was confirmed' });
    if (s.kind === 'proctoring') out.push({ name: 'proctoring_flags', source: 'Proctoring system check', type: 'Proctoring', about: 'Number of events flagged during the recording' });
    if (s.kind !== 'module') return;
    const m = modules.find((x) => x.id === s.moduleId);
    if (!m || m.kind !== 'evaluative') return;
    const k = scoreKey(m);
    out.push({ name: `${k}_raw`, source: m.name, type: 'Module', about: 'Points earned' });
    out.push({ name: `${k}_scaled`, source: m.name, type: 'Module', about: 'Points earned ÷ points possible (0 to 1)' });
    if (m.items.some((i) => i.type === 'spoken' || i.type === 'listen-write')) {
      out.push({ name: `${k}_missing_audio`, source: m.name, type: 'Flag', about: 'TRUE when a recording or playback failed' });
    }
  });
  return out;
}

/** Names a score produces. */
export const outputsOf = (s: Score) => (s.kind === 'r' ? s.outputs.map((o) => o.name) : [s.name]);

/* ---------- R formula checks ---------- */

export interface RError { start: number; end: number; token: string; message: string }
export interface RResult { errors: RError[]; outputs: { name: string; type: 'Conditional' | 'Formula' }[]; inputsUsed: string[] }

type Tok = { t: 'id' | 'num' | 'str' | 'op' | 'assign' | 'p'; s: string; a: number; b: number };

const KEYWORDS = new Set(['if', 'else', 'TRUE', 'FALSE', 'NA', 'NULL']);
const FUNCTIONS = new Set(['round', 'abs', 'max', 'min', 'sqrt', 'log', 'exp', 'ifelse', 'mean', 'sum', 'is.na', 'pmin', 'pmax']);
const BINARY = new Set(['+', '-', '*', '/', '^', '>', '<', '>=', '<=', '==', '!=', '&&', '||', '&', '|']);

function tokenize(src: string, errors: RError[]): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
    const rest = src.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^"[^"\n]*"/))) { out.push({ t: 'str', s: m[0], a: i, b: i + m[0].length }); i += m[0].length; continue; }
    if ((m = rest.match(/^(\d+\.?\d*|\.\d+)/))) { out.push({ t: 'num', s: m[0], a: i, b: i + m[0].length }); i += m[0].length; continue; }
    if ((m = rest.match(/^[A-Za-z_][A-Za-z0-9_.]*/))) { out.push({ t: 'id', s: m[0], a: i, b: i + m[0].length }); i += m[0].length; continue; }
    if (rest.startsWith('<-')) { out.push({ t: 'assign', s: '<-', a: i, b: i + 2 }); i += 2; continue; }
    if ((m = rest.match(/^(>=|<=|==|!=|&&|\|\|)/))) { out.push({ t: 'op', s: m[0], a: i, b: i + 2 }); i += 2; continue; }
    if ('+-*/^<>!&|='.includes(c)) { out.push({ t: 'op', s: c, a: i, b: i + 1 }); i++; continue; }
    if ('(){}[];,'.includes(c)) { out.push({ t: 'p', s: c, a: i, b: i + 1 }); i++; continue; }
    errors.push({ start: i, end: i + 1, token: c, message: 'Unexpected character' });
    i++;
  }
  return out;
}

function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

/** Check an R scoring formula against the workflow's input scores. */
export function checkR(src: string, inputs: string[]): RResult {
  const errors: RError[] = [];
  const toks = tokenize(src, errors);
  const inputSet = new Set(inputs);

  // Square brackets aren't allowed.
  toks.filter((t) => t.s === '[' || t.s === ']').forEach((t) =>
    errors.push({ start: t.a, end: t.b, token: t.s, message: 'No square brackets allowed' }));

  // Two operators in a row, e.g. "**" or "+*". A minus or ! after an operator is fine (it's a sign).
  for (let i = 1; i < toks.length; i++) {
    const p = toks[i - 1], t = toks[i];
    if ((p.t === 'op' || p.t === 'assign') && t.t === 'op' && BINARY.has(t.s) && t.s !== '-' && !(t.s === '!')) {
      errors.push({ start: p.a, end: t.b, token: src.slice(p.a, t.b), message: 'Two operators can’t be placed together' });
    }
  }

  // Brackets must balance.
  const stack: Tok[] = [];
  const pairs: Record<string, string> = { ')': '(', '}': '{' };
  toks.forEach((t) => {
    if (t.s === '(' || t.s === '{') stack.push(t);
    else if (t.s === ')' || t.s === '}') {
      if (stack.length && stack[stack.length - 1].s === pairs[t.s]) stack.pop();
      else errors.push({ start: t.a, end: t.b, token: t.s, message: t.s === ')' ? 'Extra closing parenthesis' : 'Extra closing brace' });
    }
  });
  stack.forEach((t) => errors.push({ start: t.a, end: t.b, token: t.s, message: t.s === '(' ? 'Additional opening parenthesis' : 'Brace is never closed' }));

  // Statements: "name <- …;". Track what's assigned, and that each statement ends.
  const assigned: string[] = [];
  const outputs: RResult['outputs'] = [];
  const used = new Set<string>();
  const reported = new Set<string>();
  let depth = 0;
  let current: { name: string; hasIf: boolean } | null = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const prev = toks[i - 1];
    // Only braces count here, so one unclosed parenthesis doesn't hide every statement after it.
    if (t.s === '{') depth++;
    if (t.s === '}') depth = Math.max(0, depth - 1);

    if (depth === 0 && t.t === 'id' && toks[i + 1]?.t === 'assign') {
      if (current && prev && prev.s !== ';' && prev.s !== '}') {
        errors.push({ start: prev.b, end: prev.b + 1, token: ';', message: 'Missing at the end of the statement before this one' });
      }
      current = { name: t.s, hasIf: false };
      if (!assigned.includes(t.s)) { assigned.push(t.s); outputs.push({ name: t.s, type: 'Formula' }); }
      i++;
      continue;
    }
    if (t.s === ';' && depth === 0) {
      if (current) outputs.find((o) => o.name === current!.name)!.type = current.hasIf ? 'Conditional' : 'Formula';
      current = null;
      continue;
    }
    if (t.t === 'id') {
      if (t.s === 'if' && current) current.hasIf = true;
      if (KEYWORDS.has(t.s)) continue;
      if (toks[i + 1]?.s === '(' && FUNCTIONS.has(t.s)) continue;
      if (inputSet.has(t.s)) { used.add(t.s); continue; }
      if (assigned.includes(t.s) && t.s !== current?.name) continue;
      if (assigned.includes(t.s) && t.s === current?.name) continue; // self-reference: rescaling an earlier value
      const later = toks.slice(i + 1).some((x, k) => x.t === 'id' && x.s === t.s && toks[i + 2 + k]?.t === 'assign');
      if (later) { errors.push({ start: t.a, end: t.b, token: t.s, message: 'Used before it’s defined' }); continue; }
      if (reported.has(t.s)) continue;
      reported.add(t.s);
      const near = [...inputs, ...assigned].map((n) => [n, distance(n, t.s)] as const).sort((a, b) => a[1] - b[1])[0];
      errors.push({ start: t.a, end: t.b, token: t.s, message: near && near[1] <= 3 ? `Variable does not exist. Did you mean ${near[0]}?` : 'Variable does not exist' });
    }
  }
  if (current) {
    const last = toks[toks.length - 1];
    if (last && last.s !== ';' && last.s !== '}') errors.push({ start: last.b, end: last.b + 1, token: ';', message: 'Missing at the end of the last statement' });
    else outputs.find((o) => o.name === current!.name)!.type = current.hasIf ? 'Conditional' : 'Formula';
  }
  if (!toks.length) errors.push({ start: 0, end: 0, token: '', message: 'The formula is empty' });
  else if (!outputs.length) errors.push({ start: 0, end: Math.min(1, src.length), token: '', message: 'No scores are assigned. Use name <- expression;' });

  errors.sort((a, b) => a.start - b.start);
  return { errors, outputs, inputsUsed: [...used] };
}

/* ---------- From-scratch checks ---------- */

export interface FieldError { field: string; message: string }

export function checkScratch(s: ScratchScore, taken: string[], known: string[]): FieldError[] {
  const e: FieldError[] = [];
  const have = new Set(known);
  if (!s.name.trim()) e.push({ field: 'name', message: 'Give the score a name.' });
  else if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(s.name)) e.push({ field: 'name', message: 'Use letters, numbers and underscores, starting with a letter.' });
  else if (taken.includes(s.name)) e.push({ field: 'name', message: `Another score is already called ${s.name}.` });

  if (s.type === 'reference' && !s.reference) e.push({ field: 'reference', message: 'Choose the reference score.' });
  if (s.type === 'weighted') {
    if (!s.weights.length) e.push({ field: 'weights', message: 'Add at least one weighted score.' });
    s.weights.forEach((w, i) => {
      if (!w.input) e.push({ field: `w-${w.id}-input`, message: `Row ${i + 1}: choose a score.` });
      if (w.weight === '' || Number.isNaN(Number(w.weight))) e.push({ field: `w-${w.id}-weight`, message: `Row ${i + 1}: the weight must be a number.` });
    });
  }
  if (s.type === 'conditional' && s.mode === 'reference') {
    if (!s.mappings.length) e.push({ field: 'mappings', message: 'Add at least one score mapping.' });
    s.mappings.forEach((m, mi) => {
      if (!m.reference) e.push({ field: `m-${m.id}-ref`, message: `Mapping ${mi + 1}: choose the reference score.` });
      m.expressions.forEach((x, xi) => {
        const at = `Mapping ${mi + 1}, line ${xi + 1}`;
        if (!x.condition) e.push({ field: `x-${x.id}-cond`, message: `${at}: choose a condition.` });
        else if (!have.has(x.condition)) e.push({ field: `x-${x.id}-cond`, message: `${at}: ${x.condition} no longer exists.` });
        if (!x.operand) e.push({ field: `x-${x.id}-op`, message: `${at}: choose an operand.` });
        if (x.value.trim() === '') e.push({ field: `x-${x.id}-val`, message: `${at}: enter a value.` });
        else if (Number.isNaN(Number(x.value)) && !['TRUE', 'FALSE'].includes(x.value.trim())) e.push({ field: `x-${x.id}-val`, message: `${at}: the value must be a number, TRUE or FALSE.` });
      });
    });
  }
  if (s.type === 'conditional' && s.mode === 'band') {
    if (!s.bandSource) e.push({ field: 'bandSource', message: 'Choose the score to band.' });
    if (s.bands.length < 2) e.push({ field: 'bands', message: 'Add at least two bands.' });
    s.bands.forEach((b, i) => {
      const lo = b.min === '' ? -Infinity : Number(b.min);
      const hi = b.max === '' ? Infinity : Number(b.max);
      if (!b.label.trim()) e.push({ field: `b-${b.id}-label`, message: `Band ${i + 1}: add a label.` });
      if (Number.isNaN(lo) || Number.isNaN(hi)) e.push({ field: `b-${b.id}-min`, message: `Band ${i + 1}: limits must be numbers.` });
      else if (lo >= hi) e.push({ field: `b-${b.id}-min`, message: `Band ${i + 1}: the lower limit must be below the upper one.` });
    });
  }
  return e;
}

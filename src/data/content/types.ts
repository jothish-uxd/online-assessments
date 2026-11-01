/* Assessment content: assets, modules and the items inside them. */

export type PersonId = 'leia' | 'mon' | 'jyn' | 'cassian' | 'hera' | 'wedge';

/** Who did something, and when (ISO timestamp). */
export interface Stamp { by: PersonId; at: string }

export interface Activity extends Stamp { action: string }

/* ---------- Assets ---------- */

export type AssetKind = 'image' | 'video' | 'audio' | 'document' | 'chart';

/* Charts are drawn from data, in the a11y-charts style: patterns, dash styles and marker shapes, never colour. */
export type ChartType = 'vbar' | 'hbar' | 'stacked' | 'donut' | 'line' | 'scatter';
export interface ChartSpec {
  type: ChartType;
  /** Bar labels, slice labels, or x-axis labels for lines. Unused for scatter. */
  categories: string[];
  /** One series for bars and donuts; several for segmented bars and lines. */
  series: { name: string; values: number[] }[];
  /** Scatter only */
  points?: { group: string; x: number; y: number }[];
  xLabel?: string;
  yLabel?: string;
  /** Shown after values, e.g. "%" or " crates" */
  unit?: string;
}

export interface Asset {
  id: string;
  kind: AssetKind;
  title: string;
  fileName: string;
  mime: string;
  /** bytes */
  size: number;
  width?: number;
  height?: number;
  /** seconds, for audio and video */
  duration?: number;
  /** Images: describes the image for people who can't see it */
  alt: string;
  caption: string;
  /** Audio and video: the words spoken */
  transcript: string;
  tags: string[];
  created: Stamp;
  edited: Stamp;
  history: Activity[];
  /** true when the file itself is stored in this browser (uploaded here) */
  hasFile: boolean;
  /** Charts: the data they're drawn from */
  chart?: ChartSpec;
}

/* ---------- Modules and items ---------- */

export type ModuleKind = 'evaluative' | 'non-evaluative';
export type ModuleStatus = 'draft' | 'in-review' | 'published';

export type ItemType =
  | 'single' | 'multi' | 'paragraph' | 'spoken' | 'listen-write' | 'chart' | 'content'
  | 'inbox' | 'ai-conversation';

/** A single-select question about a chart. A chart item holds one to three. */
export interface ChartQuestion { id: string; prompt: string; choices: Choice[]; points: number }

/** How a module times its items. */
export interface ModuleTiming { mode: 'off' | 'each' | 'per-item'; seconds: number }

export type ContentPurpose = 'terms' | 'privacy' | 'consent' | 'instructions' | 'type-instructions';

export interface Choice { id: string; text: string; correct: boolean }

export interface ItemSettings {
  /** single / multi */
  shuffle?: boolean;
  /** multi: score only when every correct choice, and no wrong one, is picked */
  allOrNothing?: boolean;
  /** paragraph / listen-write */
  minWords?: number;
  maxWords?: number;
  /** paragraph / listen-write / spoken: what reviewers score against */
  guidance?: string;
  /** spoken */
  prepSeconds?: number;
  maxSeconds?: number;
  attempts?: number;
  /** listen-write */
  plays?: number;
  /** Time limit for this item, in seconds, when the module times items one by one */
  timeSeconds?: number;
  /** content */
  purpose?: ContentPurpose;
  requireAck?: boolean;
  ackLabel?: string;
}

export interface Item {
  id: string;
  type: ItemType;
  /** Content blocks: the heading candidates see */
  title?: string;
  /** Item stem, the passage to read aloud, or the body of a content block */
  prompt: string;
  /** Media shown or played with the prompt */
  assetId?: string;
  choices?: Choice[];
  /** Chart items: the questions about the chart */
  questions?: ChartQuestion[];
  points: number;
  required: boolean;
  settings: ItemSettings;
  created: Stamp;
  edited: Stamp;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  kind: ModuleKind;
  status: ModuleStatus;
  items: Item[];
  timing: ModuleTiming;
  created: Stamp;
  edited: Stamp;
  history: Activity[];
  /** While a published module is being edited as a draft: the published version candidates still get. */
  live?: LiveModule;
}

export type LiveModule = Pick<Module, 'name' | 'description' | 'items' | 'timing' | 'edited'>;

/* ---------- OA workflows ---------- */

export type Stage = 'build' | 'program-review' | 'e2e' | 'signoff' | 'launch-ready' | 'live';

/** One stop in a workflow: a module, or a checkpoint the candidate passes through. */
export type Step =
  | { id: string; kind: 'module'; moduleId: string }
  | { id: string; kind: 'id-check' }
  | { id: string; kind: 'proctoring' };

/** Who reviews each stage. null means the stage needs no reviewers. */
export type Reviewers = Record<'ops' | 'program' | 'e2e' | 'signoff' | 'launch', PersonId[] | null>;

export interface WorkflowSettings {
  linkDays: number;
  scoreDays: number;
  ats: string[];
  devices: string[];
  /** Other workflows whose scores count as equivalent */
  equivalent: string[];
  reviewers: Reviewers;
  inviteSubject: string;
  inviteBody: string;
  reminderDays: number;
  /** Time for the whole assessment */
  timeLimit: { on: boolean; minutes: number; onExpire: 'submit' | 'finish-item'; extraTime: number[] };
}

export interface Workflow {
  id: string;
  name: string;
  /** Stable ID used by ATS integrations */
  code: string;
  type: 'Candidate';
  stage: Stage;
  version: number;
  /** Changed since the last saved version */
  dirty: boolean;
  steps: Step[];
  settings: WorkflowSettings;
  scoring: Scoring;
  misbehavior: Misbehavior;
  testPlan: TestPlan | null;
  reviews: ReviewRound[];
  comments: Thread[];
  created: Stamp;
  edited: Stamp;
  history: Activity[];
}

/* ---------- Composite scores ---------- */

export type VariationCategory = 'country' | 'job-level' | 'region' | 'language';
export interface VariationRule { category: VariationCategory; op: 'is' | 'is-not'; values: string[] }
/** A slice of candidates that can get their own scores, e.g. Outer Rim applicants. */
export interface Variation { id: string; name: string; isDefault: boolean; rules: VariationRule[]; created: Stamp }

export type Operand = '=' | '!=' | '>' | '>=' | '<' | '<=';
export interface Expression { id: string; join: 'AND' | 'OR'; condition: string; operand: Operand | ''; value: string }
/** Use `reference` when every expression holds. The first mapping that holds wins. */
export interface Mapping { id: string; reference: string; expressions: Expression[] }
export interface Band { id: string; min: string; max: string; label: string }
export interface Weight { id: string; input: string; weight: string }

export interface ScratchScore {
  id: string;
  kind: 'scratch';
  name: string;
  pc: boolean;
  sendToAts: boolean;
  type: 'conditional' | 'reference' | 'weighted';
  /** conditional: map to reference scores, or band one score into labels */
  mode: 'reference' | 'band';
  mappings: Mapping[];
  bandSource: string;
  bands: Band[];
  reference: string;
  weights: Weight[];
  /** null = applies to every candidate */
  variationId: string | null;
  created: Stamp;
  edited: Stamp;
}

export interface ROutput { name: string; type: 'Conditional' | 'Formula'; pc: boolean; sendToAts: boolean }
export interface RScore {
  id: string;
  kind: 'r';
  name: string;
  formula: string;
  outputs: ROutput[];
  variationId: string | null;
  created: Stamp;
  edited: Stamp;
}

export type Score = ScratchScore | RScore;

export interface Scoring { variations: Variation[]; scores: Score[] }

/* ---------- Misbehavior settings ---------- */

export type FlagAction = 'flag' | 'warn';
export interface Detection { on: boolean; action: FlagAction }

export interface Misbehavior {
  /** ID validation and verification is on when the workflow has an ID verification step. */
  id: { documents: string[]; attempts: number; onFail: 'block' | 'review' };
  selfie: { on: boolean; badge: boolean; onsite: boolean; retentionDays: number };
  image: { on: boolean; perHour: number; faceMatch: boolean };
  video: { on: boolean; audio: boolean; retentionDays: number };
  camera: Record<string, Detection>;
  browser: Record<string, Detection>;
  review: { threshold: number; holdResults: boolean };
}

/* ---------- Test plan ---------- */

export type CaseOutcome = 'pass' | 'fail' | 'retest' | 'not-tested';
export type TestStatus = 'not-started' | 'in-progress' | 'passed' | 'failed';

export interface TestCase {
  id: string;
  title: string;
  summary: string;
  /** Workflow version the link was (or will be) generated for */
  version: number;
  candidateId: string;
  country: string;
  jobCode: string;
  jobFamily: string;
  jobLevel: string;
  jobClass: string;
  instructions: string[];
  expected: string;
  link?: string;
  linkCreated?: Stamp;
  result: { tester: string; outcome: CaseOutcome; notes: string; entered?: Stamp };
  created: Stamp;
}

export interface TestSuite { id: string; reason: string; description: string; cases: TestCase[]; created: Stamp }

export interface TestPlan { name: string; description: string; created: Stamp; modified?: Stamp; suites: TestSuite[] }

/* ---------- Review and comments ---------- */

export interface ReviewRound {
  n: number;
  requested: Stamp;
  reviewers: PersonId[];
  message: string;
  decision?: Stamp & { outcome: 'approved' | 'changes'; note: string };
  withdrawn?: Stamp;
}

export type CommentTab = 'builder' | 'scores' | 'misbehavior' | 'test-plan' | 'history';
export type TargetKind = 'workflow' | 'step' | 'score' | 'setting' | 'suite' | 'case';
/** What a comment thread is about. The label is kept so threads still read well if the thing is deleted. */
export interface CommentTarget { kind: TargetKind; id?: string; label: string; tab: CommentTab }
export interface Comment { id: string; by: PersonId; at: string; body: string }
export interface Thread { id: string; target: CommentTarget; comments: Comment[]; resolved?: Stamp }

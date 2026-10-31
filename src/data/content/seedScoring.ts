import type { Expression, PersonId, RScore, ScratchScore, Scoring, Stamp, Variation, VariationCategory } from './types';
import { st } from './seedAssets';

/* Variation metadata: who a variation applies to. */
export const VARIATION_CATEGORIES: { value: VariationCategory; label: string; values: string[] }[] = [
  { value: 'country', label: 'Home system', values: ['Chandrila', 'Corellia', 'Naboo', 'Mon Cala', 'Lothal', 'Bespin', 'Dantooine', 'Jakku'] },
  { value: 'region', label: 'Region', values: ['Core Worlds', 'Colonies', 'Mid Rim', 'Outer Rim', 'Unknown Regions'] },
  { value: 'job-level', label: 'Job level', values: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'] },
  { value: 'language', label: 'Language', values: ['Galactic Basic', 'Shyriiwook', 'Mon Calamarian', 'Huttese', 'Binary'] },
];
export const categoryLabel = (c: VariationCategory) => VARIATION_CATEGORIES.find((x) => x.value === c)!.label;

let n = 0;
const id = (p: string) => `${p}${++n}`;
const ex = (condition: string, operand: Expression['operand'], value: string, join: Expression['join'] = 'AND'): Expression =>
  ({ id: id('x'), join, condition, operand, value });

const PILOT_R = `# Starfighter Pilot L4: composite scores
mission_comp <- 0.5 * mission_focus_scaled +
    0.5 * squadron_lead_scaled;

pilot_comp <- 0.6 * pilot_spatial_scaled +
    0.4 * written_comm_scaled;

z_mission_comp <- (mission_comp - 0.5126) / 0.2174;
z_pilot_comp <- (pilot_comp - 0.4870) / 0.1985;

total_pilot_l4 <- {
  if (squadron_lead_missing_audio == TRUE) {
    z_pilot_comp
  } else {
    z_pilot_comp + z_mission_comp
  }
};

recommendation <- if (total_pilot_l4 < -1.65) {
  "Strongly not recommended"
} else if (total_pilot_l4 < -0.85) {
  "Not recommended"
} else if (total_pilot_l4 < 1.22) {
  "Moderately recommended"
} else {
  "Recommended"
};
`;

const r = (formula: string, by: PersonId, at: string, outputs: RScore['outputs']): RScore => {
  const stamp: Stamp = st(by, at);
  return { id: id('sc'), kind: 'r', name: 'R formula', formula, outputs, variationId: null, created: stamp, edited: stamp };
};

const scratch = (p: Partial<ScratchScore> & Pick<ScratchScore, 'name' | 'type'>, by: PersonId, at: string): ScratchScore => {
  const stamp = st(by, at);
  return {
    id: id('sc'), kind: 'scratch', pc: false, sendToAts: true, mode: 'reference', mappings: [], bandSource: '', bands: [],
    reference: '', weights: [], variationId: null, created: stamp, edited: stamp, ...p,
  };
};

export const SEED_SCORING: Record<string, Scoring> = {
  'w-pilot': {
    variations: [],
    scores: [
      r(PILOT_R, 'leia', '2026-10-29T15:15', [
        { name: 'mission_comp', type: 'Formula', pc: false, sendToAts: true },
        { name: 'pilot_comp', type: 'Formula', pc: false, sendToAts: true },
        { name: 'z_mission_comp', type: 'Formula', pc: true, sendToAts: true },
        { name: 'z_pilot_comp', type: 'Formula', pc: true, sendToAts: true },
        { name: 'total_pilot_l4', type: 'Conditional', pc: false, sendToAts: true },
        { name: 'recommendation', type: 'Conditional', pc: false, sendToAts: true },
      ]),
    ],
  },
  'w-mechanic': {
    variations: [],
    scores: [
      scratch({
        name: 'mechanic_total', type: 'weighted',
        weights: [
          { id: id('w'), input: 'starship_maint_scaled', weight: '0.6' },
          { id: id('w'), input: 'numerical_scaled', weight: '0.25' },
          { id: id('w'), input: 'mission_focus_scaled', weight: '0.15' },
        ],
      }, 'cassian', '2026-10-27T10:40'),
      scratch({
        name: 'mechanic_band', type: 'conditional', mode: 'band', bandSource: 'mechanic_total', pc: true,
        bands: [
          { id: id('b'), min: '', max: '0.45', label: 'Not recommended' },
          { id: id('b'), min: '0.45', max: '0.7', label: 'Recommended with training' },
          { id: id('b'), min: '0.7', max: '', label: 'Recommended' },
        ],
      }, 'cassian', '2026-10-27T10:55'),
    ],
  },
  'w-analyst': {
    variations: [
      { id: 'v-global', name: 'Global', isDefault: true, created: st('jyn', '2026-10-01T09:00'), rules: [
        { category: 'region', op: 'is', values: ['Core Worlds', 'Colonies', 'Mid Rim'] },
        { category: 'job-level', op: 'is', values: ['L5'] },
      ] },
      { id: 'v-outer', name: 'Outer Rim', isDefault: false, created: st('jyn', '2026-10-01T09:20'), rules: [
        { category: 'region', op: 'is', values: ['Outer Rim', 'Unknown Regions'] },
      ] },
    ] as Variation[],
    scores: [
      scratch({ name: 'intel_score', type: 'reference', reference: 'intel_analysis_scaled', pc: true }, 'jyn', '2026-10-02T11:00'),
      scratch({
        name: 'intel_result', type: 'conditional', mode: 'reference', variationId: 'v-global',
        mappings: [
          { id: id('m'), reference: 'intel_analysis_scaled', expressions: [ex('id_verified', '=', 'TRUE'), ex('proctoring_flags', '<', '3')] },
          { id: id('m'), reference: 'mission_focus_scaled', expressions: [ex('proctoring_flags', '>=', '3')] },
        ],
      }, 'jyn', '2026-10-02T11:30'),
      scratch({
        name: 'intel_result_outer_rim', type: 'conditional', mode: 'reference', variationId: 'v-outer',
        mappings: [
          { id: id('m'), reference: 'intel_analysis_scaled', expressions: [ex('id_verified', '=', 'TRUE')] },
        ],
      }, 'jyn', '2026-10-02T11:45'),
    ],
  },
  'w-medic': { variations: [], scores: [] },
};

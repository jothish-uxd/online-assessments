import type { ChartSpec } from '../content/types';

/*
  The sample assessment a candidate takes on the candidate website:
  Starfighter Pilot L4, ten items of different kinds. Some items are timed,
  the whole assessment is timed, and it is proctored.
*/

export type QKind = 'single' | 'multi' | 'chart' | 'written' | 'numeric' | 'order' | 'listen' | 'spatial';

interface Base {
  id: string;
  kind: QKind;
  /** Short name of the section, shown above the question */
  section: string;
  prompt: string;
  /** Extra context shown above the prompt */
  context?: string;
  /** Seconds allowed for this item, or undefined when untimed */
  seconds?: number;
}

export interface Choice { id: string; text: string }

export interface SingleQ extends Base { kind: 'single' | 'chart' | 'listen' | 'spatial'; choices: Choice[]; chart?: { title: string; spec: ChartSpec }; clip?: { title: string; script: string } }
export interface MultiQ extends Base { kind: 'multi'; choices: Choice[]; pick: number }
export interface WrittenQ extends Base { kind: 'written'; minWords: number; maxWords: number }
export interface NumericQ extends Base { kind: 'numeric'; unit: string }
export interface OrderQ extends Base { kind: 'order'; steps: Choice[] }
export type Question = SingleQ | MultiQ | WrittenQ | NumericQ | OrderQ;

const c = (...texts: string[]): Choice[] => texts.map((text, i) => ({ id: String.fromCharCode(97 + i), text }));

export const ASSESSMENT = {
  id: 'w-pilot',
  title: 'Starfighter Pilot L4',
  org: 'Rebel Alliance Starfighter Corps',
  minutes: 30,
  recruiter: { name: 'Hera Syndulla', team: 'Starfighter Corps recruiting' },
  candidate: { name: 'Poe Dameron', initials: 'PD', email: 'p.dameron@resistance.example', id: 'CAND-48213' },
};

export const QUESTIONS: Question[] = [
  {
    id: 'q1', kind: 'single', section: 'Situational judgement', seconds: 60,
    context: 'You’re on a patrol with two wingmates. Your flight lead’s comms go silent mid-mission, and your scanner shows an unknown contact closing fast.',
    prompt: 'What is the most effective first action?',
    choices: c(
      'Break formation and chase the contact before it reaches the others',
      'Take temporary lead, tell your wingmates, and report the contact to base',
      'Hold position and keep trying to reach your flight lead',
      'Return to base so command can decide what to do',
    ),
  },
  {
    id: 'q2', kind: 'multi', section: 'Pre-flight safety', pick: 2,
    prompt: 'Which two checks must be done before every launch, whatever the mission?',
    choices: c(
      'Confirm the astromech has the latest hyperspace charts',
      'Check deflector shield output',
      'Confirm the ejection system is armed',
      'Polish the canopy',
      'Log the starfighter’s paint scheme',
    ),
  },
  {
    id: 'q3', kind: 'chart', section: 'Data interpretation', seconds: 90,
    prompt: 'Which squadron flew more than twice as many sorties as Blue Squadron, but fewer than Rogue?',
    chart: { title: 'Sorties flown by squadron, last cycle', spec: { type: 'vbar', categories: ['Red', 'Gold', 'Rogue', 'Blue', 'Green'], series: [{ name: 'Sorties', values: [42, 31, 55, 18, 27] }], xLabel: 'Squadron', yLabel: 'Sorties' } },
    choices: c('Red', 'Gold', 'Green', 'None of them'),
  },
  {
    id: 'q4', kind: 'chart', section: 'Data interpretation', seconds: 90,
    prompt: 'If Echo Base keeps losing crates at its average weekly rate from W1 to W8, about when will it run out?',
    chart: {
      title: 'Bacta reserves by base',
      spec: {
        type: 'line', categories: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
        series: [
          { name: 'Echo Base', values: [120, 112, 101, 95, 80, 72, 60, 52] },
          { name: 'Home One', values: [90, 92, 95, 93, 98, 101, 104, 106] },
          { name: 'Yavin 4', values: [70, 70, 69, 75, 74, 73, 74, 72] },
        ],
        xLabel: 'Week', yLabel: 'Crates',
      },
    },
    choices: c('Around W11', 'Around W13', 'Around W16', 'It won’t run out'),
  },
  {
    id: 'q5', kind: 'numeric', section: 'Numerical reasoning', seconds: 75,
    context: 'An X-wing burns 14 fuel units per hour of patrol. The tank holds 210 units, and pilots must land with at least 20% left.',
    prompt: 'What is the longest patrol, in hours, a pilot can fly on a full tank?',
    unit: 'hours',
  },
  {
    id: 'q6', kind: 'listen', section: 'Listening',
    prompt: 'Based on the transmission, what should Gold Squadron do next?',
    clip: {
      title: 'Transmission from Home One',
      script: 'Gold Leader, this is Home One. The shield generator on the moon is still up. Do not begin your attack run. Hold at the rally point near the frigate Redemption, and wait for our signal.',
    },
    choices: c('Begin the attack run', 'Hold at the rally point and wait', 'Return to Home One', 'Escort the Redemption to the moon'),
  },
  {
    id: 'q7', kind: 'order', section: 'Procedures',
    prompt: 'Put these emergency landing steps in the right order, first to last.',
    steps: c('Tell the tower you’re declaring an emergency', 'Cut power to non-essential systems', 'Lower the landing gear', 'Line up with the clear landing strip'),
  },
  {
    id: 'q8', kind: 'spatial', section: 'Spatial reasoning', seconds: 60,
    prompt: 'The shape above is turned a quarter turn clockwise. Which option shows the result?',
    choices: c('Option A', 'Option B', 'Option C', 'Option D'),
  },
  {
    id: 'q9', kind: 'single', section: 'Teamwork',
    context: 'A newer pilot in your squadron keeps drifting out of formation in training. They seem embarrassed and haven’t asked for help.',
    prompt: 'What would you most likely do?',
    choices: c(
      'Mention it to the squadron commander so they can handle it',
      'Offer to fly some extra practice runs with them, one to one',
      'Point it out during the group debrief so everyone learns from it',
      'Leave it; they’ll improve with time',
    ),
  },
  {
    id: 'q10', kind: 'written', section: 'Written communication', minWords: 50, maxWords: 200,
    prompt: 'Write a short report to your squadron commander about a mission that didn’t go to plan. Say what happened, what you did, and what you’d do differently.',
  },
];

/** Shapes for the spatial item: an L-tetromino and its four turns. Options are drawn from these. */
export const SPATIAL = {
  source: [[0, 0], [0, 1], [0, 2], [1, 2]] as [number, number][],
  options: [
    [[0, 0], [1, 0], [2, 0], [0, 1]], // A: correct (quarter turn clockwise)
    [[2, 0], [0, 1], [1, 1], [2, 1]], // B: quarter turn anticlockwise
    [[0, 0], [1, 0], [1, 1], [1, 2]], // C: half turn
    [[1, 0], [1, 1], [1, 2], [0, 2]], // D: mirror image
  ] as [number, number][][],
};

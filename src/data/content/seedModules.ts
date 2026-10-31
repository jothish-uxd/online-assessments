import type { Activity, Choice, Item, ItemSettings, ItemType, Module, PersonId, Stamp } from './types';
import { st } from './seedAssets';

let n = 0;
const ch = (text: string, correct = false): Choice => ({ id: `c${++n}`, text, correct });

function item(
  id: string, type: ItemType, prompt: string, created: Stamp,
  more: Partial<Omit<Item, 'id' | 'type' | 'prompt' | 'created'>> & { settings?: ItemSettings } = {},
): Item {
  return {
    id, type, prompt, created,
    points: type === 'content' ? 0 : 1,
    required: true,
    settings: {},
    edited: created,
    ...more,
  };
}

const log = (by: PersonId, at: string, action: string): Activity => ({ ...st(by, at), action });

const sel = (opts: string[], correct: number[] = [0]) => opts.map((t, i) => ch(t, correct.includes(i)));

export const SEED_MODULES: Module[] = [
  /* ---------- Non-evaluative ---------- */
  {
    id: 'm-consent', name: 'Candidate consent and privacy', kind: 'non-evaluative', status: 'published',
    description: 'Terms, privacy notice and consent every Alliance candidate accepts before starting.',
    created: st('hera', '2026-09-02T09:00'), edited: st('hera', '2026-10-01T09:40'),
    history: [
      log('hera', '2026-10-01T09:40', 'Published'),
      log('hera', '2026-10-01T09:20', 'Updated the privacy notice to version 3'),
      log('mon', '2026-09-03T15:10', 'Approved'),
      log('hera', '2026-09-02T09:00', 'Created the module'),
    ],
    items: [
      item('i-terms', 'content', 'By continuing, you agree to complete this assessment on your own, without help from other beings, droids or outside material, and to keep its content confidential.', st('hera', '2026-09-02T09:05'), {
        title: 'Terms and conditions', assetId: 'a-code-of-conduct', settings: { purpose: 'terms', requireAck: true, ackLabel: 'I agree to the terms and conditions' },
      }),
      item('i-privacy', 'content', 'The Alliance Personnel Office collects your responses to evaluate your application. Your data is never shared with the Empire, or anyone else. Read the full notice before you continue.', st('hera', '2026-09-02T09:12'), {
        title: 'Privacy notice', assetId: 'a-privacy-pdf', edited: st('hera', '2026-10-01T09:20'),
        settings: { purpose: 'privacy', requireAck: true, ackLabel: 'I have read the privacy notice' },
      }),
      item('i-consent', 'content', 'You can stop at any time, but your assessment will be submitted as it stands.', st('hera', '2026-09-02T09:18'), {
        title: 'Your consent', settings: { purpose: 'consent', requireAck: true, ackLabel: 'I consent to taking part' },
      }),
    ],
  },
  {
    id: 'm-proctoring', name: 'Camera and recording consent', kind: 'non-evaluative', status: 'in-review',
    description: 'Added only to proctored assessments: camera set-up and consent to be recorded.',
    created: st('hera', '2026-10-15T13:20'), edited: st('mon', '2026-10-19T16:50'),
    history: [
      log('mon', '2026-10-19T16:50', 'Left feedback: link the recording policy from item 2'),
      log('hera', '2026-10-17T10:10', 'Sent for review'),
      log('hera', '2026-10-15T13:20', 'Created the module'),
    ],
    items: [
      item('i-cam-setup', 'content', 'Make sure your face is clearly visible and your room is well lit. Remove datapads, comlinks and holoprojectors from your desk.', st('hera', '2026-10-15T13:25'), {
        title: 'Set up your camera', assetId: 'a-camera-setup', settings: { purpose: 'instructions', requireAck: false },
      }),
      item('i-cam-consent', 'content', 'This assessment records video and audio from your camera and microphone. Reviewers watch recordings only to check the assessment was completed fairly.', st('hera', '2026-10-15T13:32'), {
        title: 'Consent to be recorded', assetId: 'a-proctor-policy', edited: st('mon', '2026-10-19T16:48'),
        settings: { purpose: 'consent', requireAck: true, ackLabel: 'I consent to being recorded' },
      }),
    ],
  },
  {
    id: 'm-instructions', name: 'Assessment instructions', kind: 'non-evaluative', status: 'published',
    description: 'How the assessment works, how long it takes, and what to have ready.',
    created: st('hera', '2026-09-04T12:10'), edited: st('wedge', '2026-10-20T11:02'),
    history: [
      log('wedge', '2026-10-20T11:02', 'Edited item 2'),
      log('hera', '2026-09-30T16:30', 'Published'),
      log('hera', '2026-09-04T12:10', 'Created the module'),
    ],
    items: [
      item('i-welcome', 'content', 'This assessment takes about 45 standard minutes. Find a quiet place, check your holonet connection, and keep this tab open until you finish.', st('hera', '2026-09-04T12:15'), {
        title: 'Before you begin', assetId: 'a-welcome-video', settings: { purpose: 'instructions', requireAck: false },
      }),
      item('i-spoken-howto', 'content', 'For spoken items, you’ll get 30 seconds to prepare, then up to two minutes to record. You can re-record once.', st('hera', '2026-09-04T12:22'), {
        title: 'Recording a spoken answer', assetId: 'a-spoken-demo', edited: st('wedge', '2026-10-20T11:02'),
        settings: { purpose: 'type-instructions', requireAck: false },
      }),
      item('i-multi-howto', 'content', 'Some items ask you to select every answer that applies. You only get full credit when you pick all the right ones and none of the wrong ones.', st('wedge', '2026-10-20T11:00'), {
        title: 'Select all that apply', settings: { purpose: 'type-instructions', requireAck: false },
      }),
    ],
  },

  /* ---------- Evaluative ---------- */
  {
    id: 'm-customer-judgement', name: 'Mission focus: situational judgement', kind: 'evaluative', status: 'published',
    description: 'Scenarios about keeping commitments to allies when plans go wrong.',
    created: st('jyn', '2026-09-10T10:00'), edited: st('mon', '2026-10-06T14:15'),
    history: [
      log('mon', '2026-10-06T14:15', 'Published'),
      log('hera', '2026-10-03T10:40', 'Approved after review'),
      log('jyn', '2026-09-29T16:00', 'Sent for review'),
      log('jyn', '2026-09-10T10:00', 'Created the module'),
    ],
    items: [
      item('i-cj-1', 'single', 'A tibanna gas shipment to Cloud City is three days late because your team routed it through a closed lane. Their quartermaster calls, upset. What do you do first?', st('jyn', '2026-09-10T10:20'), {
        choices: sel([
          'Explain the hyperspace routing rules so they understand why it happened',
          'Apologise, confirm a new arrival date, and say what you’ll do if it slips again',
          'Transfer the call to General Rieekan',
          'Offer a refund straight away and end the call',
        ], [1]),
        settings: { shuffle: true },
      }),
      item('i-cj-2', 'multi', 'Echo Base is short of mechanics during an evacuation drill week. Which actions keep your commitments to the squadrons? Select all that apply.', st('jyn', '2026-09-11T09:05'), {
        assetId: 'a-hangar-floor', points: 2, edited: st('leia', '2026-10-21T14:45'),
        choices: sel([
          'Tell squadron leaders about likely delays before they happen',
          'Fix the oldest repair tickets first without telling anyone',
          'Ask the medical frigate crew to lend two droids for the week',
          'Skip the pre-flight safety checks to save time',
        ], [0, 2]),
        settings: { shuffle: true, allOrNothing: false },
      }),
      item('i-cj-3', 'single', 'A senator who funds the Alliance asks you to move her cargo ahead of the queue “just this once”. Doing so would delay medical supplies for Hoth. What do you do?', st('cassian', '2026-09-24T15:30'), {
        choices: sel([
          'Move it; the senator’s support matters most',
          'Decline, explain why, and offer the fastest option that doesn’t delay medical supplies',
          'Say yes, then quietly leave it in the queue',
        ], [1]),
        settings: { shuffle: true },
      }),
    ],
  },
  {
    id: 'm-written', name: 'Written communication', kind: 'evaluative', status: 'in-review',
    description: 'Short written answers, scored by reviewers against the written response rubric.',
    created: st('mon', '2026-09-18T14:30'), edited: st('leia', '2026-10-28T16:12'),
    history: [
      log('leia', '2026-10-28T16:12', 'Sent for review'),
      log('leia', '2026-10-18T10:30', 'Added item 2'),
      log('mon', '2026-09-18T14:30', 'Created the module'),
    ],
    items: [
      item('i-w-1', 'paragraph', 'Write a short message to your hangar crew explaining the new hyperspace routing rules. Keep it under 150 words.', st('mon', '2026-09-18T14:40'), {
        points: 5,
        settings: { minWords: 50, maxWords: 150, guidance: 'Full marks: states the change, when it starts and what the crew must do differently. Clear, polite, no jargon.' },
      }),
      item('i-w-2', 'listen-write', 'Listen to the call from Cloud City, then write the reply you’d send their quartermaster.', st('leia', '2026-10-18T10:30'), {
        assetId: 'a-customer-call', points: 5,
        settings: { plays: 2, maxWords: 200, guidance: 'Acknowledges the delay, apologises once, gives a new date, and offers a next step.' },
      }),
    ],
  },
  {
    id: 'm-spoken', name: 'Spoken communication', kind: 'evaluative', status: 'draft',
    description: 'Candidates read a short notice, then explain it aloud.',
    created: st('leia', '2026-10-27T15:50'), edited: st('leia', '2026-10-29T09:12'),
    history: [
      log('leia', '2026-10-29T09:12', 'Edited item 1'),
      log('leia', '2026-10-27T15:50', 'Created the module'),
    ],
    items: [
      item('i-s-1', 'spoken', 'Read the hangar shift rota notice. Then, in your own words, explain the change to a crewmate who missed it.', st('leia', '2026-10-27T15:55'), {
        assetId: 'a-cantina-sign', points: 5, edited: st('leia', '2026-10-29T09:12'),
        settings: { prepSeconds: 30, maxSeconds: 120, attempts: 2, guidance: 'Names the cancelled shift, the new time, and who to ask.' },
      }),
      item('i-s-2', 'spoken', '', st('leia', '2026-10-29T09:20'), {
        points: 5, settings: { prepSeconds: 30, maxSeconds: 90, attempts: 1, guidance: '' },
      }),
    ],
  },
  {
    id: 'm-numerical', name: 'Numerical reasoning', kind: 'evaluative', status: 'draft',
    description: 'Reading charts and manifests to make supply decisions.',
    created: st('cassian', '2026-09-15T09:50'), edited: st('cassian', '2026-10-29T11:10'),
    history: [
      log('cassian', '2026-10-29T11:10', 'Added item 3'),
      log('cassian', '2026-10-13T11:00', 'Added item 2'),
      log('cassian', '2026-09-15T09:50', 'Created the module'),
    ],
    items: [
      item('i-n-1', 'single', 'Using the chart, roughly how many times more supply runs went to Bespin than to Jakku?', st('cassian', '2026-09-15T10:00'), {
        assetId: 'a-shipment-chart',
        choices: sel(['About 2 times', 'About 3 times', 'About 5 times', 'About 8 times'], [2]),
        settings: { shuffle: false },
      }),
      item('i-n-2', 'multi', 'If every sector’s supply runs rose by 20%, which sectors would go over 200 runs a week? Select all that apply.', st('cassian', '2026-10-13T11:00'), {
        assetId: 'a-shipment-chart', points: 2,
        choices: sel(['Bespin', 'Hoth', 'Dantooine', 'Jakku'], []),
        settings: { shuffle: false },
      }),
      item('i-n-3', 'single', 'Using the manifest, what is the total mass of the bacta crates bound for the medical deck?', st('cassian', '2026-10-29T11:10'), {
        assetId: 'a-manifest',
        choices: sel(['360 kg', '480 kg', '720 kg', '960 kg'], [2]),
        settings: { shuffle: false },
      }),
    ],
  },
  {
    id: 'm-starship', name: 'Starship maintenance fundamentals', kind: 'evaluative', status: 'published',
    description: 'Technical knowledge for mechanic roles: X-wings, hyperdrives and safe hangar practice.',
    created: st('cassian', '2026-08-28T13:30'), edited: st('mon', '2026-10-09T12:00'),
    history: [
      log('mon', '2026-10-09T12:00', 'Published'),
      log('hera', '2026-10-08T15:30', 'Approved after review'),
      log('wedge', '2026-10-08T09:45', 'Edited item 1'),
      log('cassian', '2026-10-02T10:00', 'Sent for review'),
      log('cassian', '2026-08-28T13:30', 'Created the module'),
    ],
    items: [
      item('i-sm-1', 'single', 'On the X-wing schematic, which callout marks where the astromech droid sits?', st('cassian', '2026-08-28T13:40'), {
        assetId: 'a-xwing-schematic', edited: st('wedge', '2026-10-08T09:45'),
        choices: sel(['1', '2', '3', '5'], [2]), settings: { shuffle: false },
      }),
      item('i-sm-2', 'single', 'The hyperdrive won’t engage. Using the wiring diagram, which coupling should you check first?', st('cassian', '2026-09-03T15:10'), {
        assetId: 'a-hyperdrive', points: 2,
        choices: sel(['Coupling A', 'Coupling B', 'Coupling C', 'Coupling D'], [2]), settings: { shuffle: false },
      }),
      item('i-sm-3', 'multi', 'Before working on a snowspeeder’s power cell, which steps are required? Select all that apply.', st('cassian', '2026-09-03T15:30'), {
        points: 2,
        choices: sel([
          'Power down the cell and wait for it to discharge',
          'Tag the speeder as out of service',
          'Ask an astromech to hold the cell steady while it’s live',
          'Wear insulated gloves',
        ], [0, 1, 3]),
        settings: { shuffle: true, allOrNothing: true },
      }),
      item('i-sm-4', 'listen-write', 'Listen to the R2 unit’s diagnostic readout. Write the repair ticket you’d log, including both faults.', st('wedge', '2026-10-11T15:00'), {
        assetId: 'a-astromech', points: 4,
        settings: { plays: 2, maxWords: 120, guidance: 'Names the port stabiliser fault code 7 and the failed starboard power coupling, and sets the right priority.' },
      }),
    ],
  },
  {
    id: 'm-pilot', name: 'Pilot readiness: spatial reasoning', kind: 'evaluative', status: 'in-review',
    description: 'Route planning and spatial judgement for starfighter pilot roles.',
    created: st('jyn', '2026-10-05T10:40'), edited: st('jyn', '2026-10-22T17:15'),
    history: [
      log('jyn', '2026-10-22T17:15', 'Sent for review'),
      log('jyn', '2026-10-22T17:10', 'Edited item 2'),
      log('jyn', '2026-10-05T10:40', 'Created the module'),
    ],
    items: [
      item('i-p-1', 'single', 'Using the asteroid field plot, which heading gives the widest clear corridor out of the field?', st('jyn', '2026-10-05T10:50'), {
        assetId: 'a-asteroid-field', points: 2,
        choices: sel(['Heading 040', 'Heading 115', 'Heading 220', 'Heading 310'], [1]), settings: { shuffle: false },
      }),
      item('i-p-2', 'single', 'The Hoth to Bespin lane is closed. Using the lane map, what is the shortest open route from Hoth to Bespin?', st('jyn', '2026-10-06T09:00'), {
        assetId: 'a-route-map', points: 2, edited: st('jyn', '2026-10-22T17:10'),
        choices: sel(['Hoth, Dagobah, Bespin', 'Hoth, Ord Mantell, Bespin', 'Hoth, Bespin', 'Hoth, Ord Mantell, Dagobah, Bespin'], [1]),
        settings: { shuffle: true },
      }),
      item('i-p-3', 'paragraph', 'Your wingmate’s targeting computer fails during a trench run. In a few sentences, say what you do and why.', st('jyn', '2026-10-06T09:20'), {
        points: 4,
        settings: { minWords: 40, maxWords: 150, guidance: 'Prioritises the mission and the wingmate’s safety, communicates with the squad leader, and adapts the plan rather than aborting outright.' },
      }),
    ],
  },
  {
    id: 'm-intel', name: 'Intelligence analysis', kind: 'evaluative', status: 'published',
    description: 'Listening and reading comprehension for analyst roles, using intercepted transmissions.',
    created: st('jyn', '2026-09-26T19:30'), edited: st('mon', '2026-10-12T10:20'),
    history: [
      log('mon', '2026-10-12T10:20', 'Published'),
      log('hera', '2026-10-10T14:00', 'Approved after review'),
      log('jyn', '2026-10-01T11:00', 'Sent for review'),
      log('jyn', '2026-09-26T19:30', 'Created the module'),
    ],
    items: [
      item('i-in-1', 'single', 'Listen to the intercepted transmission. Where is the Imperial fleet told to assemble?', st('jyn', '2026-09-26T19:40'), {
        assetId: 'a-intercept',
        choices: sel(['In orbit around Hoth', 'At the edge of the Hoth system', 'At Ord Mantell', 'At the Bespin gas giant'], [1]),
        settings: { shuffle: true },
      }),
      item('i-in-2', 'single', 'From the same transmission, how long does the base have before the fleet assembles?', st('jyn', '2026-09-26T19:45'), {
        assetId: 'a-intercept',
        choices: sel(['Two standard hours', 'Two standard days', 'One standard week', 'It isn’t stated'], [1]),
        settings: { shuffle: false },
      }),
      item('i-in-3', 'listen-write', 'Write a three-line summary of the transmission for General Rieekan.', st('jyn', '2026-09-27T08:20'), {
        assetId: 'a-intercept', points: 3,
        settings: { plays: 1, maxWords: 60, guidance: 'Who: Imperial fleet. What: probe droids found activity; fleet assembling. When: within two standard days. No speculation.' },
      }),
    ],
  },
  {
    id: 'm-leadership', name: 'Squadron leadership', kind: 'evaluative', status: 'in-review',
    description: 'Situational judgement for flight leads and crew chiefs.',
    created: st('mon', '2026-10-26T08:00'), edited: st('wedge', '2026-10-30T09:30'),
    history: [
      log('wedge', '2026-10-30T09:30', 'Left feedback: item 2 has two defensible answers'),
      log('mon', '2026-10-28T15:00', 'Sent for review'),
      log('mon', '2026-10-26T08:00', 'Created the module'),
    ],
    items: [
      item('i-l-1', 'single', 'Two pilots in your squadron argue over who flies lead on tomorrow’s patrol. What do you do?', st('mon', '2026-10-26T08:10'), {
        assetId: 'a-org-chart',
        choices: sel([
          'Let them settle it between themselves',
          'Hear both out, decide, explain why, and move on',
          'Ground them both until they get along',
          'Fly lead yourself to avoid the problem',
        ], [1]),
        settings: { shuffle: true },
      }),
      item('i-l-2', 'single', 'Listen to Red Leader’s briefing. A new pilot looks lost afterwards. What’s the best next step?', st('mon', '2026-10-26T08:25'), {
        assetId: 'a-squad-brief',
        choices: sel([
          'Pair them with an experienced wingmate and walk through the plan together',
          'Tell them to replay the briefing',
          'Leave them off the mission',
        ], [0]),
        settings: { shuffle: true },
      }),
      item('i-l-3', 'spoken', 'You’re briefing Rogue Squadron on a change of plan ten minutes before launch. Record what you’d say.', st('mon', '2026-10-26T08:40'), {
        points: 5,
        settings: { prepSeconds: 45, maxSeconds: 90, attempts: 1, guidance: 'States the change and the reason in the first 20 seconds, gives each pilot a clear role, and checks for questions.' },
      }),
    ],
  },
  {
    id: 'm-medical', name: 'Medical frigate triage', kind: 'evaluative', status: 'draft',
    description: 'Prioritisation under pressure for medic and medical droid handler roles.',
    created: st('hera', '2026-10-24T14:30'), edited: st('hera', '2026-10-30T08:15'),
    history: [
      log('hera', '2026-10-30T08:15', 'Edited item 1'),
      log('hera', '2026-10-24T14:30', 'Created the module'),
    ],
    items: [
      item('i-md-1', 'single', 'Using the triage board, which bay do you send the 2-1B droid to first?', st('hera', '2026-10-24T14:40'), {
        assetId: 'a-triage-board', points: 2, edited: st('hera', '2026-10-30T08:15'),
        choices: sel(['Bay 1', 'Bay 2', 'Bay 3', 'Bay 5'], [2]), settings: { shuffle: false },
      }),
      item('i-md-2', 'paragraph', 'Explain how you’d decide between two patients who arrive at the same time with the same injury.', st('hera', '2026-10-24T14:55'), {
        points: 3, settings: { minWords: 40, maxWords: 200, guidance: '' },
      }),
    ],
  },
  {
    id: 'm-quartermaster', name: 'Quartermaster inventory checks', kind: 'evaluative', status: 'draft',
    description: 'Manifest reading and stock arithmetic for quartermaster roles.',
    created: st('cassian', '2026-10-29T11:20'), edited: st('cassian', '2026-10-29T11:20'),
    history: [log('cassian', '2026-10-29T11:20', 'Created the module')],
    items: [],
  },
];

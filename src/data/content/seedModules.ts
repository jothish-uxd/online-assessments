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

export const SEED_MODULES: Module[] = [
  {
    id: 'm-consent', name: 'Candidate consent and privacy', kind: 'non-evaluative', status: 'published',
    description: 'Terms, privacy notice and consent every candidate accepts before starting.',
    created: st('hera', '2026-09-02T09:00'), edited: st('hera', '2026-10-01T09:40'),
    history: [
      log('hera', '2026-10-01T09:40', 'Published'),
      log('hera', '2026-10-01T09:20', 'Updated the privacy notice to version 3'),
      log('mon', '2026-09-03T15:10', 'Approved'),
      log('hera', '2026-09-02T09:00', 'Created the module'),
    ],
    items: [
      item('i-terms', 'content', 'By continuing, you agree to complete this assessment on your own, without help from other people or outside material, and to keep its content confidential.', st('hera', '2026-09-02T09:05'), {
        title: 'Terms and conditions', settings: { purpose: 'terms', requireAck: true, ackLabel: 'I agree to the terms and conditions' },
      }),
      item('i-privacy', 'content', 'We collect your responses, and for proctored assessments a video recording, to evaluate your application. Read the full notice before you continue.', st('hera', '2026-09-02T09:12'), {
        title: 'Privacy notice', assetId: 'a-privacy-pdf', edited: st('hera', '2026-10-01T09:20'),
        settings: { purpose: 'privacy', requireAck: true, ackLabel: 'I have read the privacy notice' },
      }),
      item('i-consent', 'content', 'Some assessments use your camera and microphone. You can stop at any time, but your assessment will be submitted as it stands.', st('hera', '2026-09-02T09:18'), {
        title: 'Your consent', settings: { purpose: 'consent', requireAck: true, ackLabel: 'I consent to being recorded' },
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
      item('i-welcome', 'content', 'This assessment takes about 45 minutes. Find a quiet place, check your internet connection, and keep this browser tab open until you finish.', st('hera', '2026-09-04T12:15'), {
        title: 'Before you begin', assetId: 'a-welcome-video', settings: { purpose: 'instructions', requireAck: false },
      }),
      item('i-spoken-howto', 'content', 'For spoken questions, you’ll get time to prepare, then up to two minutes to record. You can re-record once.', st('hera', '2026-09-04T12:22'), {
        title: 'Recording a spoken answer', assetId: 'a-spoken-demo', edited: st('wedge', '2026-10-20T11:02'),
        settings: { purpose: 'type-instructions', requireAck: false },
      }),
    ],
  },
  {
    id: 'm-customer-judgement', name: 'Customer focus: situational judgement', kind: 'evaluative', status: 'published',
    description: 'Scenarios about putting the customer first when plans go wrong.',
    created: st('jyn', '2026-09-10T10:00'), edited: st('mon', '2026-10-06T14:15'),
    history: [
      log('mon', '2026-10-06T14:15', 'Published'),
      log('hera', '2026-10-03T10:40', 'Approved after review'),
      log('jyn', '2026-09-29T16:00', 'Sent for review'),
      log('jyn', '2026-09-10T10:00', 'Created the module'),
    ],
    items: [
      item('i-cj-1', 'single', 'A customer’s shipment to Bespin is three days late because of a routing error your team made. They call, upset. What do you do first?', st('jyn', '2026-09-10T10:20'), {
        choices: [
          ch('Explain the routing rules so they understand why it happened'),
          ch('Apologise, confirm a new delivery date, and tell them what you’ll do if it slips again', true),
          ch('Transfer them to your manager'),
          ch('Offer a refund straight away and end the call'),
        ],
        settings: { shuffle: true },
      }),
      item('i-cj-2', 'multi', 'Your hangar is short-staffed during a peak week. Which actions keep commitments to customers? Select all that apply.', st('jyn', '2026-09-11T09:05'), {
        assetId: 'a-hangar-floor', points: 2, edited: st('leia', '2026-10-21T14:45'),
        choices: [
          ch('Tell customers about likely delays before they happen', true),
          ch('Prioritise the oldest orders without telling anyone'),
          ch('Ask a neighbouring team to lend two loaders for the week', true),
          ch('Skip the safety walk-through to save time'),
        ],
        settings: { shuffle: true, allOrNothing: false },
      }),
      item('i-cj-3', 'single', 'A long-time customer asks you to bend a policy “just this once”. Bending it would delay other customers’ orders. What do you do?', st('cassian', '2026-09-24T15:30'), {
        choices: [
          ch('Bend it; long-time customers matter most'),
          ch('Decline, explain why, and offer the fastest option within policy', true),
          ch('Say yes, then quietly don’t do it'),
        ],
        settings: { shuffle: true },
      }),
    ],
  },
  {
    id: 'm-written', name: 'Written communication', kind: 'evaluative', status: 'in-review',
    description: 'Short written answers, scored by reviewers against a rubric.',
    created: st('mon', '2026-09-18T14:30'), edited: st('leia', '2026-10-28T16:12'),
    history: [
      log('leia', '2026-10-28T16:12', 'Sent for review'),
      log('leia', '2026-10-18T10:30', 'Added item 2'),
      log('mon', '2026-09-18T14:30', 'Created the module'),
    ],
    items: [
      item('i-w-1', 'paragraph', 'Write a short email to your team explaining the new routing rules. Keep it under 150 words.', st('mon', '2026-09-18T14:40'), {
        points: 5,
        settings: { minWords: 50, maxWords: 150, guidance: 'Full marks: states the change, when it starts and what the team must do differently. Clear, polite, no jargon.' },
      }),
      item('i-w-2', 'listen-write', 'Listen to the customer call, then write the reply you’d send them.', st('leia', '2026-10-18T10:30'), {
        assetId: 'a-customer-call', points: 5,
        settings: { plays: 2, maxWords: 200, guidance: 'Acknowledges the delay, apologises once, gives a date, and offers a next step.' },
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
      item('i-s-1', 'spoken', 'Read the shift rota notice. Then, in your own words, explain the change to a teammate who missed it.', st('leia', '2026-10-27T15:55'), {
        assetId: 'a-cantina-sign', points: 5, edited: st('leia', '2026-10-29T09:12'),
        settings: { prepSeconds: 30, maxSeconds: 120, attempts: 2, guidance: 'Names the cancelled shift, the new time, and who to ask.' },
      }),
    ],
  },
  {
    id: 'm-numerical', name: 'Numerical reasoning', kind: 'evaluative', status: 'draft',
    description: 'Reading charts and tables to make operational decisions.',
    created: st('cassian', '2026-09-15T09:50'), edited: st('cassian', '2026-10-13T11:00'),
    history: [
      log('cassian', '2026-10-13T11:00', 'Added item 2'),
      log('cassian', '2026-09-15T09:50', 'Created the module'),
    ],
    items: [
      item('i-n-1', 'single', 'Using the chart, roughly how many times more shipments went to Bespin than to Jakku?', st('cassian', '2026-09-15T10:00'), {
        assetId: 'a-shipment-chart',
        choices: [ch('About 2 times'), ch('About 3 times'), ch('About 5 times', true), ch('About 8 times')],
        settings: { shuffle: false },
      }),
      item('i-n-2', 'multi', 'Which sectors would need extra loaders if volume rose by 20%? Select all that apply.', st('cassian', '2026-10-13T11:00'), {
        assetId: 'a-shipment-chart', points: 2,
        choices: [ch('Bespin'), ch('Jakku'), ch('Hoth')],
        settings: { shuffle: false },
      }),
    ],
  },
];

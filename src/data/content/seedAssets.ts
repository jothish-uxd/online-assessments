import type { Activity, Asset, PersonId, Stamp } from './types';

export const st = (by: PersonId, at: string): Stamp => ({ by, at: new Date(at).toISOString() });
const act = (by: PersonId, at: string, action: string): Activity => ({ ...st(by, at), action });

type Seed = Omit<Asset, 'history' | 'hasFile' | 'edited'> & { edited?: Stamp; extra?: Activity[] };

function asset(s: Seed): Asset {
  const { extra = [], ...a } = s;
  const edited = s.edited ?? s.created;
  const history = [
    { ...a.created, action: 'Uploaded' },
    ...extra,
    ...(s.edited && s.edited.at !== s.created.at && !extra.length ? [{ ...edited, action: 'Edited details' }] : []),
  ].sort((x, y) => y.at.localeCompare(x.at));
  return { ...a, edited, history, hasFile: false };
}

/*
  Sample library for the Alliance Personnel Office, which hires pilots,
  mechanics, analysts, medics and quartermasters across the fleet.
  These have no file behind them: previews are drawn placeholders.
*/
export const SEED_ASSETS: Asset[] = [
  /* ---------- Images ---------- */
  asset({
    id: 'a-hangar-floor', kind: 'image', title: 'Echo Base hangar floor', fileName: 'echo-base-hangar-floor.jpg', mime: 'image/jpeg',
    size: 2_412_880, width: 2400, height: 1600,
    alt: 'The Echo Base hangar: snowspeeders being refuelled, stacked supply crates, and a transport docked at the back.',
    caption: 'Used in the situational judgement items.', transcript: '', tags: ['scenario', 'hoth'],
    created: st('jyn', '2026-09-08T10:12'), edited: st('leia', '2026-10-21T14:40'),
  }),
  asset({
    id: 'a-shipment-chart', kind: 'image', title: 'Weekly supply runs by sector', fileName: 'supply-runs-by-sector.png', mime: 'image/png',
    size: 184_220, width: 1600, height: 900,
    alt: 'Bar chart of weekly supply runs across five sectors. Bespin is highest at 420, then Hoth 260, Dantooine 190, Yavin 150, and Jakku lowest at 85.',
    caption: '', transcript: '', tags: ['chart', 'numerical'],
    created: st('cassian', '2026-09-15T09:30'), edited: st('cassian', '2026-09-15T09:44'),
  }),
  asset({
    id: 'a-org-chart', kind: 'image', title: 'Rogue Squadron chain of command', fileName: 'rogue-squadron-chain-of-command.png', mime: 'image/png',
    size: 96_404, width: 1400, height: 800,
    alt: '', caption: '', transcript: '', tags: ['scenario', 'leadership'],
    created: st('wedge', '2026-10-02T16:05'),
  }),
  asset({
    id: 'a-console-screen', kind: 'image', title: 'Comms officer console', fileName: 'comms-console.png', mime: 'image/png',
    size: 642_118, width: 1920, height: 1080,
    alt: 'A comms console showing six incoming transmissions; two from Red Leader are marked urgent.',
    caption: 'Reference for the inbox simulation, once it’s designed.', transcript: '', tags: ['inbox', 'scenario'],
    created: st('mon', '2026-10-12T11:20'), edited: st('mon', '2026-10-14T08:02'),
  }),
  asset({
    id: 'a-cantina-sign', kind: 'image', title: 'Hangar shift rota notice', fileName: 'hangar-shift-rota.jpg', mime: 'image/jpeg',
    size: 1_028_330, width: 1200, height: 1500,
    alt: 'A notice listing hangar shifts for the week. The Thursday night shift is crossed out and moved to Friday at 0400, ask Chief Mechanic Ackbar.',
    caption: '', transcript: '', tags: ['reading', 'spoken'],
    created: st('leia', '2026-10-27T15:48'),
  }),
  asset({
    id: 'a-xwing-schematic', kind: 'image', title: 'T-65 X-wing schematic', fileName: 't65-xwing-schematic.png', mime: 'image/png',
    size: 1_884_002, width: 2600, height: 1400,
    alt: 'Top-down schematic of a T-65 X-wing with numbered callouts: 1 laser cannons, 2 S-foils, 3 astromech socket, 4 cockpit, 5 proton torpedo launcher, 6 engines.',
    caption: 'From the Incom maintenance manual.', transcript: '', tags: ['mechanics', 'diagram'],
    created: st('cassian', '2026-08-28T13:15'), edited: st('wedge', '2026-10-08T09:40'),
  }),
  asset({
    id: 'a-hyperdrive', kind: 'image', title: 'Hyperdrive motivator wiring', fileName: 'hyperdrive-motivator-wiring.png', mime: 'image/png',
    size: 512_660, width: 1600, height: 1200,
    alt: 'Wiring diagram of a hyperdrive motivator. Coupling C is disconnected; couplings A, B and D are connected.',
    caption: '', transcript: '', tags: ['mechanics', 'diagram'],
    created: st('cassian', '2026-09-03T15:02'),
  }),
  asset({
    id: 'a-asteroid-field', kind: 'image', title: 'Hoth asteroid field plot', fileName: 'hoth-asteroid-field-plot.png', mime: 'image/png',
    size: 742_190, width: 1800, height: 1200,
    alt: '', caption: 'Spatial reasoning: find the clearest route.', transcript: '', tags: ['pilot', 'spatial'],
    created: st('jyn', '2026-10-05T10:30'),
  }),
  asset({
    id: 'a-route-map', kind: 'image', title: 'Outer Rim hyperspace lanes', fileName: 'outer-rim-hyperspace-lanes.png', mime: 'image/png',
    size: 1_204_744, width: 2000, height: 1300,
    alt: 'Map of hyperspace lanes linking Ord Mantell, Bespin, Hoth and Dagobah. The Hoth to Bespin lane is marked closed by Imperial patrols.',
    caption: '', transcript: '', tags: ['pilot', 'map'],
    created: st('mon', '2026-09-20T08:55'), edited: st('jyn', '2026-10-22T17:10'),
  }),
  asset({
    id: 'a-triage-board', kind: 'image', title: 'Medical frigate triage board', fileName: 'medical-frigate-triage-board.jpg', mime: 'image/jpeg',
    size: 980_330, width: 1600, height: 1000,
    alt: 'Triage board listing five patients by bay, injury and status. Bay 3 is marked critical.',
    caption: '', transcript: '', tags: ['medical', 'scenario'],
    created: st('hera', '2026-10-24T14:20'),
  }),
  asset({
    id: 'a-manifest', kind: 'image', title: 'Cargo manifest: Home One', fileName: 'cargo-manifest-home-one.png', mime: 'image/png',
    size: 256_118, width: 1400, height: 1800,
    alt: 'Cargo manifest table with four columns: item, crates, mass per crate in kilograms, and destination deck.',
    caption: '', transcript: '', tags: ['numerical', 'quartermaster'],
    created: st('cassian', '2026-10-29T11:05'),
  }),
  asset({
    id: 'a-protocol-droid', kind: 'image', title: 'Protocol droid at the front desk', fileName: 'protocol-droid-front-desk.jpg', mime: 'image/jpeg',
    size: 1_660_002, width: 1800, height: 1200,
    alt: '', caption: 'Hero image for the candidate welcome screen.', transcript: '', tags: ['branding'],
    created: st('wedge', '2026-10-30T09:12'),
  }),

  /* ---------- Audio ---------- */
  asset({
    id: 'a-customer-call', kind: 'audio', title: 'Call from Cloud City: late shipment', fileName: 'cloud-city-late-shipment.mp3', mime: 'audio/mpeg',
    size: 3_204_112, duration: 134,
    alt: '', caption: 'Lando’s quartermaster calls about tibanna gas that’s three days late.',
    transcript: 'Quartermaster: Our tibanna shipment was due Tuesday and it still hasn’t reached Bespin. I’ve called twice already…',
    tags: ['listening', 'customer'],
    created: st('jyn', '2026-09-22T13:10'), edited: st('leia', '2026-10-18T10:25'),
  }),
  asset({
    id: 'a-voicemail', kind: 'audio', title: 'Message from the night shift lead', fileName: 'night-shift-lead-message.m4a', mime: 'audio/mp4',
    size: 1_402_550, duration: 58,
    alt: '', caption: '', transcript: '', tags: ['listening'],
    created: st('cassian', '2026-10-09T17:36'),
  }),
  asset({
    id: 'a-briefing', kind: 'audio', title: 'Briefing: new hyperspace routing', fileName: 'briefing-hyperspace-routing.wav', mime: 'audio/wav',
    size: 9_880_300, duration: 212,
    alt: '', caption: '', transcript: 'Starting next cycle, all freight bound for the Outer Rim routes through Ord Mantell first. The Hoth to Bespin lane is closed until further notice…',
    tags: ['listening', 'operations'],
    created: st('mon', '2026-10-16T09:05'), edited: st('mon', '2026-10-16T09:31'),
  }),
  asset({
    id: 'a-astromech', kind: 'audio', title: 'R2 unit diagnostic readout', fileName: 'r2-diagnostic-readout.wav', mime: 'audio/wav',
    size: 2_120_440, duration: 41,
    alt: '', caption: 'Beeps with a protocol droid translating each fault code.',
    transcript: 'Protocol droid: He says the port stabiliser is reading fault code 7, and, oh dear, the starboard power coupling has failed entirely.',
    tags: ['listening', 'mechanics', 'droids'],
    created: st('wedge', '2026-10-11T14:48'),
  }),
  asset({
    id: 'a-intercept', kind: 'audio', title: 'Intercepted Imperial transmission', fileName: 'intercepted-imperial-transmission.mp3', mime: 'audio/mpeg',
    size: 4_402_118, duration: 96,
    alt: '', caption: 'Decrypted. Background static is intentional.',
    transcript: 'Imperial officer: Probe droids report activity in the Hoth system. Fleet to assemble at the edge of the system within two standard days…',
    tags: ['listening', 'intelligence'],
    created: st('jyn', '2026-09-26T19:20'), edited: st('jyn', '2026-09-27T08:15'),
  }),
  asset({
    id: 'a-squad-brief', kind: 'audio', title: 'Red Leader pre-flight briefing', fileName: 'red-leader-preflight.mp3', mime: 'audio/mpeg',
    size: 3_010_220, duration: 118,
    alt: '', caption: '', transcript: '', tags: ['listening', 'pilot', 'leadership'],
    created: st('mon', '2026-10-26T07:45'),
  }),

  /* ---------- Video ---------- */
  asset({
    id: 'a-welcome-video', kind: 'video', title: 'Welcome to your Alliance assessment', fileName: 'welcome-alliance-assessment.mp4', mime: 'video/mp4',
    size: 48_210_400, width: 1920, height: 1080, duration: 96,
    alt: '', caption: 'Plays before the instructions module.',
    transcript: 'Hello, and thank you for applying to serve with the Alliance. This assessment takes about 45 minutes…',
    tags: ['instructions'],
    created: st('hera', '2026-09-04T12:00'), edited: st('hera', '2026-09-30T16:20'),
  }),
  asset({
    id: 'a-spoken-demo', kind: 'video', title: 'How spoken responses work', fileName: 'spoken-response-demo.mp4', mime: 'video/mp4',
    size: 22_904_118, width: 1280, height: 720, duration: 64,
    alt: '', caption: '', transcript: '', tags: ['instructions', 'spoken'],
    created: st('wedge', '2026-10-20T10:44'),
  }),
  asset({
    id: 'a-camera-setup', kind: 'video', title: 'Setting up your camera', fileName: 'camera-setup-proctoring.mp4', mime: 'video/mp4',
    size: 31_220_904, width: 1920, height: 1080, duration: 82,
    alt: '', caption: 'For proctored assessments only.',
    transcript: 'Before you begin, make sure your face is clearly visible and the room behind you is well lit. Remove datapads and comlinks from your desk…',
    tags: ['instructions', 'proctoring'],
    created: st('hera', '2026-10-15T13:30'), edited: st('hera', '2026-10-17T10:02'),
  }),
  asset({
    id: 'a-hangar-safety', kind: 'video', title: 'Hangar safety walkthrough', fileName: 'hangar-safety-walkthrough.mp4', mime: 'video/mp4',
    size: 64_880_210, width: 1920, height: 1080, duration: 245,
    alt: '', caption: '', transcript: '', tags: ['mechanics', 'scenario'],
    created: st('cassian', '2026-10-30T08:40'),
  }),

  /* ---------- Documents ---------- */
  asset({
    id: 'a-privacy-pdf', kind: 'document', title: 'Candidate privacy notice', fileName: 'candidate-privacy-notice-v3.pdf', mime: 'application/pdf',
    size: 312_004,
    alt: '', caption: 'Version 3, approved by the Alliance legal office.', transcript: '', tags: ['legal'],
    created: st('hera', '2026-09-02T08:30'), edited: st('hera', '2026-10-01T09:15'),
    extra: [act('hera', '2026-10-01T09:15', 'Replaced file with version 3')],
  }),
  asset({
    id: 'a-rubric', kind: 'document', title: 'Written response rubric', fileName: 'written-response-rubric.pdf', mime: 'application/pdf',
    size: 128_640,
    alt: '', caption: 'Reviewer guidance for paragraph answers.', transcript: '', tags: ['rubric'],
    created: st('mon', '2026-09-18T14:22'),
  }),
  asset({
    id: 'a-code-of-conduct', kind: 'document', title: 'Alliance code of conduct', fileName: 'alliance-code-of-conduct.pdf', mime: 'application/pdf',
    size: 488_900,
    alt: '', caption: '', transcript: '', tags: ['legal'],
    created: st('hera', '2026-08-20T11:00'),
  }),
  asset({
    id: 'a-proctor-policy', kind: 'document', title: 'Proctoring and recording policy', fileName: 'proctoring-recording-policy.pdf', mime: 'application/pdf',
    size: 205_412,
    alt: '', caption: 'Linked from the camera consent item.', transcript: '', tags: ['legal', 'proctoring'],
    created: st('hera', '2026-10-15T13:10'), edited: st('mon', '2026-10-19T16:45'),
  }),
  asset({
    id: 'a-spoken-rubric', kind: 'document', title: 'Spoken response rubric', fileName: 'spoken-response-rubric.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 64_220,
    alt: '', caption: 'Draft, waiting on Mon’s review.', transcript: '', tags: ['rubric', 'spoken'],
    created: st('leia', '2026-10-28T10:20'),
  }),
];

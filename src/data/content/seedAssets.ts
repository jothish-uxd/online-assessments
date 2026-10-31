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

/* Sample library. These have no file behind them: previews are drawn placeholders. */
export const SEED_ASSETS: Asset[] = [
  asset({
    id: 'a-hangar-floor', kind: 'image', title: 'Hangar loading floor', fileName: 'hangar-loading-floor.jpg', mime: 'image/jpeg',
    size: 2_412_880, width: 2400, height: 1600,
    alt: 'A busy hangar floor with stacked cargo crates, two loaders and a ship docked at the back.',
    caption: 'Used for the safety-scenario questions.', transcript: '', tags: ['scenario', 'operations'],
    created: st('jyn', '2026-09-08T10:12'), edited: st('leia', '2026-10-21T14:40'),
  }),
  asset({
    id: 'a-shipment-chart', kind: 'image', title: 'Weekly shipments by sector', fileName: 'shipments-by-sector.png', mime: 'image/png',
    size: 184_220, width: 1600, height: 900,
    alt: 'Bar chart of weekly shipments across five sectors. Bespin is highest at 420; Jakku is lowest at 85.',
    caption: '', transcript: '', tags: ['chart', 'numerical'],
    created: st('cassian', '2026-09-15T09:30'), edited: st('cassian', '2026-09-15T09:44'),
  }),
  asset({
    id: 'a-org-chart', kind: 'image', title: 'Freight team org chart', fileName: 'freight-org-chart.png', mime: 'image/png',
    size: 96_404, width: 1400, height: 800,
    alt: '', caption: '', transcript: '', tags: ['scenario'],
    created: st('wedge', '2026-10-02T16:05'),
  }),
  asset({
    id: 'a-console-screen', kind: 'image', title: 'Dispatch console screen', fileName: 'dispatch-console.png', mime: 'image/png',
    size: 642_118, width: 1920, height: 1080,
    alt: 'Dispatch console showing six open delivery requests, two marked overdue.',
    caption: 'Inbox simulation reference.', transcript: '', tags: ['inbox', 'scenario'],
    created: st('mon', '2026-10-12T11:20'), edited: st('mon', '2026-10-14T08:02'),
  }),
  asset({
    id: 'a-cantina-sign', kind: 'image', title: 'Shift rota notice', fileName: 'shift-rota-notice.jpg', mime: 'image/jpeg',
    size: 1_028_330, width: 1200, height: 1500,
    alt: 'A printed notice listing shift times for the week, with Thursday night crossed out.',
    caption: '', transcript: '', tags: ['reading'],
    created: st('leia', '2026-10-27T15:48'),
  }),
  asset({
    id: 'a-customer-call', kind: 'audio', title: 'Customer call: delayed delivery', fileName: 'customer-call-delayed.mp3', mime: 'audio/mpeg',
    size: 3_204_112, duration: 134,
    alt: '', caption: 'A customer calls about a shipment three days late.',
    transcript: 'Customer: My order was due on Tuesday and it still hasn’t arrived. I’ve called twice already…',
    tags: ['listening', 'customer'],
    created: st('jyn', '2026-09-22T13:10'), edited: st('leia', '2026-10-18T10:25'),
  }),
  asset({
    id: 'a-voicemail', kind: 'audio', title: 'Voicemail from the night shift lead', fileName: 'voicemail-night-lead.m4a', mime: 'audio/mp4',
    size: 1_402_550, duration: 58,
    alt: '', caption: '', transcript: '', tags: ['listening'],
    created: st('cassian', '2026-10-09T17:36'),
  }),
  asset({
    id: 'a-briefing', kind: 'audio', title: 'Team briefing: new routing rules', fileName: 'briefing-routing-rules.wav', mime: 'audio/wav',
    size: 9_880_300, duration: 212,
    alt: '', caption: '', transcript: 'Starting next cycle, all freight bound for the Outer Rim routes through Ord Mantell first…',
    tags: ['listening', 'operations'],
    created: st('mon', '2026-10-16T09:05'), edited: st('mon', '2026-10-16T09:31'),
  }),
  asset({
    id: 'a-welcome-video', kind: 'video', title: 'Welcome to your assessment', fileName: 'welcome-to-your-assessment.mp4', mime: 'video/mp4',
    size: 48_210_400, width: 1920, height: 1080, duration: 96,
    alt: '', caption: 'Plays before the instructions module.',
    transcript: 'Hello, and thank you for applying. This assessment takes about 45 minutes…',
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
    id: 'a-privacy-pdf', kind: 'document', title: 'Candidate privacy notice', fileName: 'candidate-privacy-notice-v3.pdf', mime: 'application/pdf',
    size: 312_004,
    alt: '', caption: 'Version 3, approved by legal.', transcript: '', tags: ['legal'],
    created: st('hera', '2026-09-02T08:30'), edited: st('hera', '2026-10-01T09:15'),
    extra: [act('hera', '2026-10-01T09:15', 'Replaced file with version 3')],
  }),
  asset({
    id: 'a-rubric', kind: 'document', title: 'Written response rubric', fileName: 'written-response-rubric.pdf', mime: 'application/pdf',
    size: 128_640,
    alt: '', caption: 'Reviewer guidance for paragraph answers.', transcript: '', tags: ['rubric'],
    created: st('mon', '2026-09-18T14:22'),
  }),
];

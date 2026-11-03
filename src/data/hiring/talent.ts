import { peek, put, useStored } from '../store';

/*
  Talent: people in the ATS a recruiter might reach out to, whether or not
  they've applied yet. One sample profile for now, built to show what a
  recruiter needs at a glance.
*/

export type AppStage = 'Applied' | 'Screening' | 'Assessment' | 'Interviewing' | 'Offer' | 'Hired' | 'Not selected' | 'Withdrew' | 'Added by recruiter' | 'Invited to apply';

export interface Application { reqId: string; title: string; stage: AppStage; date: string; recruiter: string }
export interface Education { school: string; credential: string; field: string; years: string }
export interface Experience { org: string; title: string; start: string; end?: string; location: string }
export interface OaResult {
  workflow: string; version: number; taken: string; validUntil: string;
  /** Recommendation band from the composite score */
  band: 'Strong' | 'Recommended' | 'Borderline' | 'Not recommended';
  score: number; outOf: number;
  proctoring: 'Cleared' | 'Under review' | 'Misconduct confirmed';
  /** Workflows this result counts for without retaking */
  reusableFor: string[];
}
export interface Message { at: string; from: 'recruiter' | 'candidate' | 'system'; by: string; channel: 'Email' | 'SMS' | 'Portal'; subject?: string; body: string }

export interface Talent {
  id: string;
  name: string;
  pronouns?: string;
  headline: string;
  location: string;
  timezone: string;
  email: string;
  phone: string;
  preferredContact: 'Email' | 'SMS' | 'Portal';
  source: string;
  owner: string;
  added: string;
  lastActivity: string;
  applications: Application[];
  education: Education[];
  experience: Experience[];
  oa: OaResult[];
  considerations: { label: string; value: string; flag?: boolean }[];
  skills: string[];
  messages: Message[];
}

export const OPEN_JOBS = [
  { reqId: 'REQ-4471', title: 'Starfighter Pilot L4', workflow: 'Starfighter Pilot L4' },
  { reqId: 'REQ-4533', title: 'Flight Instructor L5', workflow: 'Starfighter Pilot L4' },
  { reqId: 'REQ-4502', title: 'Hangar Mechanic L3', workflow: 'Hangar Mechanic L3' },
  { reqId: 'REQ-4519', title: 'Intelligence Analyst L5', workflow: 'Intelligence Analyst L5' },
  { reqId: 'REQ-4560', title: 'Squadron Leader L6', workflow: 'Starfighter Pilot L4' },
];

const WEDGE: Talent = {
  id: 'TAL-20417',
  name: 'Wedge Antilles',
  pronouns: 'he/him',
  headline: 'Starfighter pilot and flight leader · 9 years in combat squadrons',
  location: 'Coronet City, Corellia',
  timezone: 'Corellian Standard Time',
  email: 'wedge.antilles@corellia.example',
  phone: '+1 (555) 014-2271',
  preferredContact: 'Email',
  source: 'Referral from Hera Syndulla',
  owner: 'Hera Syndulla',
  added: '2026-09-12',
  lastActivity: '2026-10-29',
  applications: [
    { reqId: 'REQ-4471', title: 'Starfighter Pilot L4', stage: 'Interviewing', date: '2026-10-18', recruiter: 'Hera Syndulla' },
    { reqId: 'REQ-4390', title: 'Flight Operations Lead L5', stage: 'Not selected', date: '2026-08-02', recruiter: 'Mon Mothma' },
    { reqId: 'REQ-4216', title: 'Starfighter Pilot L3', stage: 'Withdrew', date: '2026-03-21', recruiter: 'Hera Syndulla' },
  ],
  education: [
    { school: 'Imperial Academy, Skystrike', credential: 'Flight officer commission', field: 'Advanced starfighter tactics', years: '2017–2019' },
    { school: 'Corellian Polytechnic', credential: 'Diploma', field: 'Starship systems engineering', years: '2014–2017' },
  ],
  experience: [
    { org: 'Rogue Squadron, Alliance Starfighter Corps', title: 'Flight Leader', start: '2022-04', location: 'Hoth and fleet postings' },
    { org: 'Red Squadron, Alliance Starfighter Corps', title: 'Starfighter Pilot', start: '2019-06', end: '2022-03', location: 'Yavin 4' },
  ],
  oa: [
    {
      workflow: 'Starfighter Pilot L4', version: 5, taken: '2026-10-21', validUntil: '2027-04-19', band: 'Strong', score: 88, outOf: 100,
      proctoring: 'Cleared', reusableFor: ['Flight Instructor L5', 'Squadron Leader L6'],
    },
  ],
  considerations: [
    { label: 'Work authorization', value: 'Authorized for New Republic postings; no sponsorship needed' },
    { label: 'Relocation', value: 'Open to relocating within the Core Worlds' },
    { label: 'Availability', value: 'Can start with 30 days’ notice' },
    { label: 'Also in process', value: 'Interviewing for Starfighter Pilot L4 with Hera Syndulla', flag: true },
    { label: 'Contact consent', value: 'Agreed to recruiter outreach on Sep 12, 2026' },
  ],
  skills: ['X-wing', 'Formation leadership', 'Trench runs', 'Flight instruction', 'Astromech coordination'],
  messages: [
    { at: '2026-09-12T16:05:00Z', from: 'recruiter', by: 'Hera Syndulla', channel: 'Email', subject: 'Starfighter Corps roles', body: 'Hi Wedge, Hera here. A few of your old wingmates speak highly of you. We have a Starfighter Pilot L4 opening that fits your flight-lead experience. Open to a chat?' },
    { at: '2026-09-13T09:42:00Z', from: 'candidate', by: 'Wedge Antilles', channel: 'Email', body: 'Thanks, Hera. Yes, happy to talk. Weekday mornings work best for me.' },
    { at: '2026-10-18T14:20:00Z', from: 'system', by: 'Internal ATS', channel: 'Email', subject: 'Your online assessment', body: 'Invitation sent for Starfighter Pilot L4 (version 5). Link open for 180 days.' },
    { at: '2026-10-29T11:10:00Z', from: 'recruiter', by: 'Hera Syndulla', channel: 'Email', subject: 'Next steps', body: 'Great result on the assessment. I’ve set up a panel interview for next week; details to follow.' },
  ],
};

const KEY = 'hiring:v1:talent';
export const useTalent = () => useStored<Talent[]>(KEY, () => [WEDGE])[0];
const all = () => peek<Talent[]>(KEY) ?? [WEDGE];
const patch = (id: string, fn: (t: Talent) => Talent) => put(KEY, all().map((t) => (t.id === id ? fn(t) : t)));
const today = () => new Date().toISOString().slice(0, 10);

/** Add to a job without asking them to apply: the recruiter puts them in the pipeline. */
export function addToJob(id: string, reqId: string, by: string) {
  const job = OPEN_JOBS.find((j) => j.reqId === reqId)!;
  patch(id, (t) => ({
    ...t, lastActivity: today(),
    applications: [{ reqId, title: job.title, stage: 'Added by recruiter', date: today(), recruiter: by }, ...t.applications.filter((a) => a.reqId !== reqId)],
  }));
}

export function inviteToApply(id: string, reqId: string, by: string, body: string) {
  const job = OPEN_JOBS.find((j) => j.reqId === reqId)!;
  patch(id, (t) => ({
    ...t, lastActivity: today(),
    applications: [{ reqId, title: job.title, stage: 'Invited to apply', date: today(), recruiter: by }, ...t.applications.filter((a) => a.reqId !== reqId)],
    messages: [...t.messages, { at: new Date().toISOString(), from: 'recruiter', by, channel: t.preferredContact, subject: `Invitation to apply: ${job.title}`, body }],
  }));
}

export function sendOa(id: string, workflow: string, by: string) {
  patch(id, (t) => ({
    ...t, lastActivity: today(),
    messages: [...t.messages, { at: new Date().toISOString(), from: 'system', by: 'Internal ATS', channel: 'Email', subject: 'Your online assessment', body: `Invitation sent for ${workflow} by ${by}. Link open for 180 days.` }],
  }));
}

export function sendMessage(id: string, by: string, body: string) {
  patch(id, (t) => ({ ...t, lastActivity: today(), messages: [...t.messages, { at: new Date().toISOString(), from: 'recruiter', by, channel: t.preferredContact, body }] }));
}

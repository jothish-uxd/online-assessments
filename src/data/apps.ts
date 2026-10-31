/**
 * The four apps in Online Assessments. Each opens in its own browser frame,
 * under its own host, because each is a separate product its users visit.
 * Summaries are placeholders until the overview copy is written.
 */
export type AppId = 'content' | 'candidate' | 'hiring' | 'proctoring';

export interface AppInfo {
  id: AppId;
  /** Route in this site */
  path: string;
  name: string;
  /** Host shown in the browser frame's address bar */
  host: string;
  /** Who uses it, one line */
  audience: string;
  summary: string;
  status: 'coming-soon';
}

export const APPS: AppInfo[] = [
  {
    id: 'content',
    path: '/assessment-content',
    name: 'Assessment content',
    host: 'content.onlineassessments.app',
    audience: 'Assessment authors',
    summary: 'Where assessments and their questions are written, reviewed and published.',
    status: 'coming-soon',
  },
  {
    id: 'candidate',
    path: '/candidate-website',
    name: 'Candidate website',
    host: 'assess.onlineassessments.app',
    audience: 'Candidates',
    summary: 'Where candidates sign in, take their assessments and see what comes next.',
    status: 'coming-soon',
  },
  {
    id: 'hiring',
    path: '/hiring-system',
    name: 'Hiring system',
    host: 'hire.onlineassessments.app',
    audience: 'Recruiters and hiring managers',
    summary: 'Where recruiters send assessments to candidates and read their results.',
    status: 'coming-soon',
  },
  {
    id: 'proctoring',
    path: '/proctoring-report',
    name: 'Proctoring report',
    host: 'proctor.onlineassessments.app',
    audience: 'Proctoring reviewers',
    summary: 'Where each assessment session is reviewed for integrity before results are trusted.',
    status: 'coming-soon',
  },
];

export const appById = (id: AppId) => APPS.find((a) => a.id === id)!;

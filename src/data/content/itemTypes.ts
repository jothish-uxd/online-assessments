import type { ContentPurpose, ItemType, ModuleKind } from './types';

export interface ItemTypeInfo {
  type: ItemType;
  label: string;
  /** Short label for tags and rows */
  short: string;
  about: string;
  /** Scored items need an evaluative module */
  scored: boolean;
  /** Not designed yet: shown, but can't be added */
  later?: boolean;
  /** Media the item can show with its prompt */
  media?: 'any' | 'audio' | 'chart';
}

export const ITEM_TYPES: ItemTypeInfo[] = [
  { type: 'single', label: 'Single select', short: 'Single select', scored: true, media: 'any',
    about: 'Candidates pick one answer. Mark the one correct choice.' },
  { type: 'multi', label: 'Multi select', short: 'Multi select', scored: true, media: 'any',
    about: 'Candidates pick every answer that applies. Mark all the correct choices.' },
  { type: 'paragraph', label: 'Paragraph response', short: 'Paragraph', scored: true, media: 'any',
    about: 'Candidates write an answer. Reviewers score it against your guidance.' },
  { type: 'spoken', label: 'Spoken response', short: 'Spoken', scored: true, media: 'any',
    about: 'Candidates read content, then record an audio answer.' },
  { type: 'listen-write', label: 'Listen and write', short: 'Listen and write', scored: true, media: 'audio',
    about: 'Candidates play an audio clip, then write a response.' },
  { type: 'chart', label: 'Chart interpretation', short: 'Chart', scored: true, media: 'chart',
    about: 'Candidates read a chart, then answer one to three single-select questions about it.' },
  { type: 'content', label: 'Content block', short: 'Content', scored: false, media: 'any',
    about: 'Not scored: terms, privacy notices, consent and instructions.' },
  { type: 'inbox', label: 'Inbox simulation', short: 'Inbox', scored: true, later: true,
    about: 'Candidates work through a simulated inbox of emails and tasks.' },
  { type: 'ai-conversation', label: 'AI conversation', short: 'AI conversation', scored: true, later: true,
    about: 'Candidates talk with an AI agent; competencies are rated from the transcript.' },
];

export const typeInfo = (t: ItemType) => ITEM_TYPES.find((x) => x.type === t)!;

/** Which item types a module of this kind can hold. */
export const allowedIn = (t: ItemTypeInfo, kind: ModuleKind) => kind === 'evaluative' || !t.scored;

export const PURPOSES: { value: ContentPurpose; label: string }[] = [
  { value: 'instructions', label: 'Assessment instructions' },
  { value: 'type-instructions', label: 'Item-type instructions' },
  { value: 'terms', label: 'Terms and conditions' },
  { value: 'privacy', label: 'Privacy notice' },
  { value: 'consent', label: 'Candidate consent' },
];
export const purposeLabel = (p?: ContentPurpose) => PURPOSES.find((x) => x.value === p)?.label ?? 'Content';

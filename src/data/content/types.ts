/* Assessment content: assets, modules and the items inside them. */

export type PersonId = 'leia' | 'mon' | 'jyn' | 'cassian' | 'hera' | 'wedge';

/** Who did something, and when (ISO timestamp). */
export interface Stamp { by: PersonId; at: string }

export interface Activity extends Stamp { action: string }

/* ---------- Assets ---------- */

export type AssetKind = 'image' | 'video' | 'audio' | 'document';

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
}

/* ---------- Modules and items ---------- */

export type ModuleKind = 'evaluative' | 'non-evaluative';
export type ModuleStatus = 'draft' | 'in-review' | 'published';

export type ItemType =
  | 'single' | 'multi' | 'paragraph' | 'spoken' | 'listen-write' | 'content'
  | 'inbox' | 'ai-conversation';

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
  /** Question text, the passage to read aloud, or the body of a content block */
  prompt: string;
  /** Media shown or played with the prompt */
  assetId?: string;
  choices?: Choice[];
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
  created: Stamp;
  edited: Stamp;
  history: Activity[];
}

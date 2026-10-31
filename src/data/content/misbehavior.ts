import type { Detection, Misbehavior } from './types';

/* What each misbehavior setting watches for. Text here is shown to scientists in the settings tab. */

export interface DetectionInfo { id: string; label: string; about: string; needs: 'video' | 'image' | 'camera' | 'browser'; mobile?: boolean }

/** Seen by the camera. Most need video; a few work from image proctoring snapshots too. */
export const CAMERA_DETECTIONS: DetectionInfo[] = [
  { id: 'face-mismatch', label: 'Different person', needs: 'camera', about: 'The face on camera doesn’t match the starting selfie.' },
  { id: 'no-face', label: 'Candidate leaves the frame', needs: 'camera', about: 'No face is visible for more than a few seconds.' },
  { id: 'extra-person', label: 'Another person in frame', needs: 'camera', about: 'A second face appears behind or beside the candidate.' },
  { id: 'phone', label: 'Phone or second device', needs: 'camera', about: 'A phone, datapad or comlink is held up or used in view.' },
  { id: 'material', label: 'Book, notes or other material', needs: 'video', about: 'Printed or handwritten material is picked up or read from.' },
  { id: 'looking-away', label: 'Repeatedly looking away', needs: 'video', about: 'The candidate’s gaze leaves the screen often, in a pattern that suggests reading something.' },
  { id: 'talking', label: 'Talking to another person', needs: 'video', about: 'Conversation is heard, with or without a second face in frame.' },
  { id: 'speaking', label: 'Speaking when not expected', needs: 'video', about: 'The candidate speaks outside spoken-response items, for example reading items aloud to someone.' },
];

/** Seen by the browser. Work on every device, with or without a camera. */
export const BROWSER_DETECTIONS: DetectionInfo[] = [
  { id: 'left-tab', label: 'Navigated away from the assessment', needs: 'browser', mobile: true, about: 'The candidate switched tab, window or app while a scored module was open.' },
  { id: 'paste', label: 'Pasted text into an answer', needs: 'browser', mobile: true, about: 'Text was pasted into a paragraph or listen-and-write answer instead of typed.' },
  { id: 'fullscreen', label: 'Exited full screen', needs: 'browser', about: 'Desktop and laptop only. The candidate left full screen during a scored module.' },
  { id: 'second-screen', label: 'Second display connected', needs: 'browser', about: 'Desktop and laptop only. A second monitor was detected at the start or during the assessment.' },
];

const d = (on: boolean, action: Detection['action'] = 'flag'): Detection => ({ on, action });

export function defaultMisbehavior(over: Partial<Misbehavior> = {}): Misbehavior {
  return {
    id: { documents: ['passport', 'national-id', 'alliance-card'], attempts: 2, onFail: 'review' },
    selfie: { on: false, badge: false, onsite: false, retentionDays: 365 },
    image: { on: false, perHour: 6, faceMatch: true },
    video: { on: false, audio: true, retentionDays: 90 },
    camera: Object.fromEntries(CAMERA_DETECTIONS.map((x) => [x.id, d(true)])),
    browser: Object.fromEntries(BROWSER_DETECTIONS.map((x) => [x.id, d(x.id !== 'second-screen', x.id === 'left-tab' ? 'warn' : 'flag')])),
    review: { threshold: 3, holdResults: true },
    ...over,
  };
}

export const ID_DOCUMENTS = [
  { value: 'passport', label: 'Galactic passport' },
  { value: 'national-id', label: 'Planetary ID card' },
  { value: 'license', label: 'Starship pilot’s licence' },
  { value: 'alliance-card', label: 'Alliance service card' },
];

/** Devices video proctoring can't run on. */
export const NO_VIDEO_DEVICES = ['mobile', 'tablet', 'smart-tv'];

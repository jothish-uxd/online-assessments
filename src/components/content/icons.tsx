import type { ReactNode } from 'react';
import type { AssetKind, ItemType } from '../../data/content/types';

/* Monochrome line icons on a 24px grid; decorative, so the text beside them carries the meaning. */
const Svg = ({ children, className = 'icon' }: { children: ReactNode; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
);

export const UploadIcon = () => <Svg><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M4.5 14.5V19a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4.5" /></Svg>;
export const SearchIcon = () => <Svg><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Svg>;
export const GridIcon = () => <Svg><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></Svg>;
export const ListIcon = () => <Svg><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth={2.6} /></Svg>;
export const CloseIcon = () => <Svg><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const TrashIcon = () => <Svg><path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 12.5a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l1-12.5M9.5 7V4.5h5V7" /></Svg>;
export const TagIcon = () => <Svg><path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z" /><path d="M8 8h.01" strokeWidth={2.6} /></Svg>;
export const DownloadIcon = () => <Svg><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4.5 19.5h15" /></Svg>;
export const PlusIcon = () => <Svg><path d="M12 5v14M5 12h14" /></Svg>;
export const UpIcon = () => <Svg><path d="m6 14 6-6 6 6" /></Svg>;
export const DownIcon = () => <Svg><path d="m6 10 6 6 6-6" /></Svg>;
export const CopyIcon = () => <Svg><rect x="8.5" y="8.5" width="11" height="11" rx="1.5" /><path d="M15.5 8.5v-3a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" /></Svg>;
export const LockIcon = () => <Svg><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></Svg>;
export const AlertIcon = () => <Svg><path d="M12 4 2.5 20h19z" /><path d="M12 10v4.5M12 17.2v.01" /></Svg>;
export const CheckIcon = () => <Svg><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const LinkIcon = () => <Svg><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Svg>;
export const ImageIcon = () => <Svg><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><circle cx="9" cy="9.5" r="1.5" /><path d="m4 17 5-5 4 4 2.5-2.5L20 18" /></Svg>;
export const VideoIcon = () => <Svg><rect x="3.5" y="6" width="12.5" height="12" rx="1.5" /><path d="m16 10.5 4.5-2.5v8L16 13.5" /></Svg>;
export const AudioIcon = () => <Svg><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" /></Svg>;
export const DocIcon = () => <Svg><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" /><path d="M14 3v4h4M9 12h6M9 16h4" /></Svg>;

export function KindIcon({ kind }: { kind: AssetKind }) {
  switch (kind) {
    case 'image': return <ImageIcon />;
    case 'video': return <VideoIcon />;
    case 'audio': return <AudioIcon />;
    case 'document': return <DocIcon />;
  }
}

export function TypeIcon({ type }: { type: ItemType }) {
  switch (type) {
    case 'single': return <Svg><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.2" fill="currentColor" /></Svg>;
    case 'multi': return <Svg><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 12.5 3 3 5-6" /></Svg>;
    case 'paragraph': return <Svg><path d="M4 6h16M4 10h16M4 14h16M4 18h9" /></Svg>;
    case 'spoken': return <Svg><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></Svg>;
    case 'listen-write': return <Svg><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3.5" y="13" width="4" height="6.5" rx="1.5" /><rect x="16.5" y="13" width="4" height="6.5" rx="1.5" /></Svg>;
    case 'content': return <Svg><path d="M5 4.5h10l4 4V19.5H5z" /><path d="M8.5 11h7M8.5 14.5h7M8.5 8h3" /></Svg>;
    case 'inbox': return <Svg><path d="M3.5 13.5 6 5h12l2.5 8.5V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" /><path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5" /></Svg>;
    case 'ai-conversation': return <Svg><path d="M4 5h16v11h-9l-4 3.5V16H4z" /><path d="m12 8 .9 2.1L15 11l-2.1.9L12 14l-.9-2.1L9 11l2.1-.9z" /></Svg>;
  }
}

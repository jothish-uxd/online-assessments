import type { ModuleKind, ModuleStatus } from '../../data/content/types';

export const KIND_TEXT: Record<ModuleKind, string> = { evaluative: 'Evaluative', 'non-evaluative': 'Non-evaluative' };

export const STATUS_TEXT: Record<ModuleStatus, string> = { draft: 'Draft', 'in-review': 'In review', published: 'Published' };

/** Status shown with shape as well as words: dashed for draft, half for review, solid for published. */
export function StatusBadge({ status }: { status: ModuleStatus }) {
  return (
    <span className={`status status--${status}`}>
      <span className="status__dot" aria-hidden="true" />
      {STATUS_TEXT[status]}
    </span>
  );
}

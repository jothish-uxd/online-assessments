import { CheckIcon, CloseIcon } from '../../../../components/content/icons';
import { ROLLUP_TEXT, STATUS_TEXT, OUTCOME_TEXT } from '../../../../data/content/testplan';
import type { CaseOutcome, TestStatus } from '../../../../data/content/types';

/* Status badges: shape and an icon carry the state, not colour. */
type Roll = TestStatus | 'complete';
const cls = (s: Roll) => (s === 'complete' ? 'passed' : s);

export function RollupBadge({ status }: { status: Roll }) {
  return <span className={`tbadge tbadge--${cls(status)}`}><Glyph s={cls(status)} />{ROLLUP_TEXT[status]}</span>;
}
export function StatusBadge({ status }: { status: TestStatus }) {
  return <span className={`tbadge tbadge--${status}`}><Glyph s={status} />{STATUS_TEXT[status]}</span>;
}
export function OutcomeBadge({ outcome }: { outcome: CaseOutcome }) {
  const s: TestStatus = outcome === 'pass' || outcome === 'retest' ? 'passed' : outcome === 'fail' ? 'failed' : 'not-started';
  return <span className={`tbadge tbadge--${s}`}><Glyph s={s} />{OUTCOME_TEXT[outcome]}</span>;
}
function Glyph({ s }: { s: string }) {
  if (s === 'passed') return <CheckIcon />;
  if (s === 'failed') return <CloseIcon />;
  return <span className={`tstatus tstatus--${s}`} aria-hidden="true" />;
}

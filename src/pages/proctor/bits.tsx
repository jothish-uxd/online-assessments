import { RISK_TEXT, type Risk } from '../../data/proctor/sessions';

export const BASE = '/proctoring-report';
export const sessionPath = (id: string) => `${BASE}/sessions/${id}`;

/** Risk carried by shape and words: solid, half, outline. */
export function RiskBadge({ risk }: { risk: Risk }) {
  return <span className={`risk risk--${risk}`}><span className="risk__mark" aria-hidden="true" />{RISK_TEXT[risk]}</span>;
}

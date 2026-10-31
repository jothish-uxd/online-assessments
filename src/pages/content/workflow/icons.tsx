/* Icons that travel with the checkpoint colours, so colour is never the only cue. */
const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
);

export const IdIcon = () => (
  <Svg><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></Svg>
);
export const ProctorIcon = () => (
  <Svg><rect x="3.5" y="6.5" width="12" height="11" rx="2" /><path d="m15.5 10.5 5-2.5v8l-5-2.5" /><circle cx="9.5" cy="12" r="1.8" fill="currentColor" stroke="none" /></Svg>
);
export const GripIcon = () => (
  <Svg><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth={2.6} /></Svg>
);

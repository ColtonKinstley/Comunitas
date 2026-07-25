/**
 * Induction-only keyframes. They live here rather than in `index.css` because
 * nothing else in the app needs them — and the induction is the one screen
 * where motion is doing real work (showing that the profile is filling in).
 */
const CSS = `
@keyframes induction-rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
@keyframes induction-pop {
  0%   { opacity: 0; transform: scale(0.6); }
  60%  { opacity: 1; transform: scale(1.12); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes induction-ripple {
  0%   { opacity: 0.55; transform: scale(0.85); }
  100% { opacity: 0;    transform: scale(1.9); }
}
.induction-rise { animation: induction-rise 380ms cubic-bezier(0.2, 0.7, 0.3, 1) both; }
.induction-pop  { animation: induction-pop 420ms cubic-bezier(0.2, 0.7, 0.3, 1) both; }
.induction-ripple { animation: induction-ripple 1.8s ease-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .induction-rise, .induction-pop, .induction-ripple { animation: none; opacity: 1; transform: none; }
}
`;

export const InductionStyles = () => <style>{CSS}</style>;

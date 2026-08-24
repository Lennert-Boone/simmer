/**
 * Laadindicator met het Simmer-potje: de stoom pruttelt door terwijl er gewacht
 * wordt. Bewust rustig — het is een wachtsignaal, geen animatiefeest.
 */
export default function Laadscherm({ tekst = "Even geduld…" }: { tekst?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50dvh] flex-col items-center justify-center gap-4"
    >
      <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="var(--color-kruid)" />
        <g className="stoom">
          <path
            d="M25 13c-3.4 3 2.6 5.4-.8 8.4"
            fill="none"
            stroke="var(--color-saffraan)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
        <g className="stoom stoom-traag">
          <path
            d="M39 13c-3.4 3 2.6 5.4-.8 8.4"
            fill="none"
            stroke="var(--color-saffraan)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
        <rect x="11" y="26" width="42" height="6" rx="3" fill="#fff" />
        <rect x="5" y="35" width="10" height="5" rx="2.5" fill="#fff" />
        <rect x="49" y="35" width="10" height="5" rx="2.5" fill="#fff" />
        <path d="M14 34h36v9.5A8.5 8.5 0 0 1 41.5 52h-19A8.5 8.5 0 0 1 14 43.5z" fill="#fff" />
      </svg>
      <p className="text-sm text-inkt-zacht">{tekst}</p>
    </div>
  );
}

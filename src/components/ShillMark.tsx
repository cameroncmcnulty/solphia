export function ShillMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="shillBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff4fd8" />
          <stop offset="45%" stopColor="#80eaff" />
          <stop offset="100%" stopColor="#14f195" />
        </linearGradient>
        <linearGradient id="shillCone" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#14f195" />
          <stop offset="100%" stopColor="#c9a8ff" />
        </linearGradient>
        <filter id="shillBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#shillBody)" opacity="0.18" />
      <path
        d="M14 28c8-3 14-12 16-20 8 6 16 14 22 26-8 4-16 8-24 9-2 6-4 11-8 15-1-6 0-12 0-18-4 0-8 1-12 3 2-5 4-10 6-15z"
        fill="url(#shillCone)"
      />
      <path d="M18 30c6 2 12 6 16 12" fill="none" stroke="#0b0614" strokeWidth="3" strokeLinecap="round" />
      <circle cx="22" cy="26" r="3" fill="#0b0614" />
      <path d="M46 18c4 2 8 6 10 11" fill="none" stroke="#ff4fd8" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 28c5 1 9 4 12 8" fill="none" stroke="#80eaff" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 38c5 2 8 6 10 11" fill="none" stroke="#14f195" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="18" r="3" fill="#ff4fd8" filter="url(#shillBlur)" />
      <circle cx="54" cy="14" r="2.5" fill="#80eaff" />
      <circle cx="10" cy="48" r="2.2" fill="#14f195" />
    </svg>
  );
}

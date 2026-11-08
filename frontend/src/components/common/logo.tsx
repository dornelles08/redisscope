export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="RedisScope logo" className={className}>
      <rect width="48" height="48" rx="10" fill="#0F766E" />
      {/* Nós conectados */}
      <g fill="none" stroke="#CCFBF1" strokeWidth="2" strokeLinecap="round">
        <path d="M14 14 L24 24 L34 14" />
        <path d="M14 34 L24 24 L34 34" />
        <path d="M14 14 L14 34" />
        <path d="M34 14 L34 34" />
      </g>
      <g fill="#FFFFFF">
        <circle cx="14" cy="14" r="3" />
        <circle cx="34" cy="14" r="3" />
        <circle cx="24" cy="24" r="4" fill="#FFFFFF" />
        <circle cx="14" cy="34" r="3" />
        <circle cx="34" cy="34" r="3" />
      </g>
      <circle cx="24" cy="24" r="2" fill="#0F766E" />
      {/* Acento Redis discreto */}
      <circle cx="24" cy="24" r="1" fill="#DC382D" />
    </svg>
  );
}

interface LogoProps {
  compact?: boolean;
  className?: string;
}

export function Logo({ compact = false, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" fill="#101F35" />
        <path
          d="M7 13h18v9.2a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V13Z"
          fill="#0A1628"
          stroke="#22D3EE"
          strokeWidth="1.4"
        />
        <path
          d="M7 17h18M7 20h18"
          stroke="#22D3EE"
          strokeWidth="1"
          opacity="0.55"
        />
        <path
          d="M12 13v-2.6a4 4 0 0 1 8 0V13"
          stroke="#22D3EE"
          strokeWidth="1.6"
          fill="none"
        />
      </svg>
      {!compact && (
        <span className="font-display text-lg font-semibold tracking-tight text-white">
          Port<span className="text-cyan-400">Syn</span>AI
        </span>
      )}
    </div>
  );
}

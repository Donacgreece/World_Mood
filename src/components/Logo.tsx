export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="World Mood">
      <svg className="brand-mark" viewBox="0 0 64 64" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="wmLogoGradient" x1="7" y1="5" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#79E7FF" />
            <stop offset=".52" stopColor="#8E88FF" />
            <stop offset="1" stopColor="#FF81B7" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="27" fill="url(#wmLogoGradient)" />
        <path d="M16.5 30.5c5.6-4.8 10.7-7.1 15.5-7.1 6.3 0 11.8 3.5 15.8 10.4" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" opacity=".96"/>
        <circle cx="22" cy="23" r="2.8" fill="white"/>
        <circle cx="42.5" cy="25.5" r="2.8" fill="white"/>
        <path d="M21.5 40.2c3.1 3.6 6.7 5.4 10.8 5.4 4.1 0 7.8-1.8 11.1-5.5" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"/>
      </svg>
      {!compact && <div className="brand-copy"><strong>World Mood</strong><span>Feel the planet</span></div>}
    </div>
  )
}

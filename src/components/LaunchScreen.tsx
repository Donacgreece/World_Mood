import { useEffect, useState } from 'react'

function SplashLogo() {
  return (
    <svg className="launch-mark" viewBox="0 0 160 180" aria-hidden="true">
      <defs>
        <linearGradient id="launch-pin" x1="24" y1="18" x2="138" y2="156" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2ED7F2" />
          <stop offset="0.38" stopColor="#4B84FF" />
          <stop offset="0.7" stopColor="#7657FF" />
          <stop offset="1" stopColor="#FF68C8" />
        </linearGradient>
        <linearGradient id="launch-ring" x1="34" y1="142" x2="124" y2="164" gradientUnits="userSpaceOnUse">
          <stop stopColor="#43D7F1" />
          <stop offset=".5" stopColor="#8C67FF" />
          <stop offset="1" stopColor="#FF69C7" />
        </linearGradient>
        <filter id="launch-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#5948D7" floodOpacity=".24" />
        </filter>
      </defs>
      <g filter="url(#launch-shadow)">
        <ellipse cx="80" cy="153" rx="48" ry="12" fill="none" stroke="url(#launch-ring)" strokeWidth="8" opacity=".45" />
        <path d="M80 12c-35.9 0-65 29.1-65 65 0 47.5 65 84 65 84s65-36.5 65-84c0-35.9-29.1-65-65-65Z" fill="url(#launch-pin)" />
        <circle cx="80" cy="74" r="43" fill="#fff" fillOpacity=".96" />
        <path d="M52 68c4.6-8.5 14.5-8.5 19 0" fill="none" stroke="#172039" strokeWidth="6" strokeLinecap="round" />
        <path d="M89 68c4.6-8.5 14.5-8.5 19 0" fill="none" stroke="#172039" strokeWidth="6" strokeLinecap="round" />
        <path d="M58 86c8 17 36 17 44 0" fill="#FF74B7" stroke="#172039" strokeWidth="5.5" strokeLinejoin="round" />
        <path d="M65 95c8 5.5 22 5.5 30 0" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".86" />
        <circle cx="49" cy="82" r="4.5" fill="#FF9AC7" opacity=".68" />
        <circle cx="111" cy="82" r="4.5" fill="#FF9AC7" opacity=".68" />
      </g>
      <g strokeLinecap="round" fill="none" strokeWidth="7">
        <path d="M22 38l-11-6" stroke="#7657FF" />
        <path d="M31 19l-5-12" stroke="#4B84FF" />
        <path d="M131 20l6-12" stroke="#2ED7F2" />
        <path d="M143 42l11-4" stroke="#2ED7F2" />
      </g>
    </svg>
  )
}

export function LaunchScreen() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  const [visible, setVisible] = useState(standalone)

  useEffect(() => {
    if (!standalone) return
    const timer = window.setTimeout(() => setVisible(false), 1150)
    return () => window.clearTimeout(timer)
  }, [standalone])

  if (!visible) return null

  return (
    <div className="launch-screen moodaro-launch" aria-hidden="true">
      <div className="launch-glow launch-glow-a" />
      <div className="launch-glow launch-glow-b" />
      <SplashLogo />
      <strong>Moodaro</strong>
      <span>Feel the world together.</span>
      <small>Real people · Real feelings</small>
    </div>
  )
}

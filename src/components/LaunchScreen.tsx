import { useEffect, useState } from 'react'

export function LaunchScreen() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  const [visible, setVisible] = useState(standalone)

  useEffect(() => {
    if (!standalone) return
    const timer = window.setTimeout(() => setVisible(false), 850)
    return () => window.clearTimeout(timer)
  }, [standalone])

  if (!visible) return null

  return (
    <div className="launch-screen" aria-hidden="true">
      <div className="launch-glow launch-glow-a" />
      <div className="launch-glow launch-glow-b" />
      <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" />
      <strong>World Mood</strong>
      <span>Feel the planet. Together.</span>
    </div>
  )
}

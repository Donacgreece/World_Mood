type LogoProps = {
  compact?: boolean
  onClick?: () => void
}

export function Logo({ compact = false, onClick }: LogoProps) {
  return (
    <button type="button" className="brand brand-button" aria-label="Go to World Mood home" onClick={onClick}>
      <img className="brand-mark" src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" aria-hidden="true" />
      {!compact && (
        <span className="brand-copy">
          <strong>World Mood</strong>
          <span>Feel the planet. Together.</span>
        </span>
      )}
    </button>
  )
}

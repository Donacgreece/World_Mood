type LogoProps = {
  compact?: boolean
  onClick?: () => void
}

export function Logo({ compact = false, onClick }: LogoProps) {
  return (
    <button type="button" className="brand brand-button moodaro-brand" aria-label="Go to Moodaro home" onClick={onClick}>
      <span className="moodaro-mark-wrap">
        <img className="brand-mark" src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>Moodaro</strong>
          <span>Feel the world together.</span>
        </span>
      )}
    </button>
  )
}

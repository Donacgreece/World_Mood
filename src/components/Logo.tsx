export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="World Mood">
      <img className="brand-mark" src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" aria-hidden="true" />
      {!compact && (
        <div className="brand-copy">
          <strong>World Mood</strong>
          <span>Feel the planet. Together.</span>
        </div>
      )}
    </div>
  )
}

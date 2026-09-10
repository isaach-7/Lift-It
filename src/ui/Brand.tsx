import { Link } from 'react-router-dom'

export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link className="brand" to={to} aria-label="LiftIt home">
      <BrandMark />
      <span>
        Lift<span className="brand-rise">I</span>t
      </span>
    </Link>
  )
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="9" />
      <path d="M9 20V12M23 20V12M9 16H23M16 21V9M12.5 12.5 16 9l3.5 3.5" />
    </svg>
  )
}

import { useState } from 'react'

export function ExerciseImage({
  name,
  group,
  src,
  compact = false,
}: {
  name: string
  group: string
  src: string
  compact?: boolean
}) {
  const [failed, setFailed] = useState(false)

  return (
    <div className={`exercise-image-frame${compact ? ' compact' : ''}`}>
      <span aria-hidden="true">{group}</span>
      {!failed && (
        <img
          src={src}
          alt={`${name} exercise demonstration`}
          width="850"
          height="567"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

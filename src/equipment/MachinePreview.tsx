import { useState } from 'react'
import type { MachineType } from './presets.ts'
type Vec = [number, number, number]
type Box = { at: Vec; size: Vec; color: string }
const frame = '#728078',
  pad = '#2d6142',
  stack = '#39423c'
function geometry(type: MachineType): Box[] {
  const parts: Box[] = [
    { at: [0, 0, 0], size: [2.5, 0.12, 2], color: frame },
    { at: [0.85, 1.35, 0.6], size: [0.12, 2.7, 0.12], color: frame },
    { at: [-0.85, 1.35, 0.6], size: [0.12, 2.7, 0.12], color: frame },
    { at: [0, 2.65, 0.6], size: [1.8, 0.12, 0.12], color: frame },
    { at: [0.7, 1.1, 0.5], size: [0.35, 1.6, 0.45], color: stack },
    { at: [0, 0.7, -0.15], size: [0.16, 1.4, 0.16], color: frame },
    { at: [0, 0.95, -0.25], size: [0.75, 0.18, 0.7], color: pad },
  ]
  for (let i = 0; i < 10; i++)
    parts.push({
      at: [0.7, 0.4 + i * 0.14, 0.5],
      size: [0.38, 0.025, 0.48],
      color: frame,
    })
  if (type !== 'row' && type !== 'lat')
    parts.push({ at: [0, 1.55, 0.08], size: [0.65, 1, 0.16], color: pad })
  if (type === 'chest' || type === 'shoulder')
    for (const x of [-0.7, 0.7]) {
      parts.push({
        at: [x, type === 'shoulder' ? 2.1 : 1.65, 0],
        size: [0.12, 0.12, 1.25],
        color: frame,
      })
      parts.push({
        at: [x, type === 'shoulder' ? 2.1 : 1.65, -0.65],
        size: [0.38, 0.12, 0.12],
        color: stack,
      })
    }
  if (type === 'lat') {
    parts.push({ at: [0, 2.65, -0.1], size: [0.12, 0.12, 1.5], color: frame })
    parts.push({ at: [0, 2.4, -0.75], size: [1.7, 0.1, 0.1], color: stack })
    parts.push({ at: [0, 1.2, -0.55], size: [1, 0.18, 0.25], color: pad })
  }
  if (type === 'row') {
    parts.push({ at: [0, 1.25, -0.75], size: [0.85, 0.12, 0.12], color: stack })
    parts.push({ at: [0, 0.2, -0.9], size: [1, 0.2, 0.3], color: frame })
  }
  if (type === 'extension' || type === 'curl') {
    parts.push({ at: [0, 0.5, -0.9], size: [0.12, 0.9, 0.12], color: frame })
    parts.push({
      at: [0, type === 'curl' ? 0.95 : 0.25, -0.9],
      size: [1, 0.25, 0.25],
      color: pad,
    })
    if (type === 'curl')
      parts.push({ at: [0, 1.2, -0.5], size: [1, 0.22, 0.22], color: pad })
  }
  return parts
}
// Small original box meshes projected into SVG: no WebGL dependency or idle render loop.
export default function MachinePreview({ type }: { type: MachineType }) {
  const [angle, setAngle] = useState(35)
  const radians = (angle * Math.PI) / 180
  function rotate([x, y, z]: Vec): Vec {
    return [
      x * Math.cos(radians) - z * Math.sin(radians),
      y,
      x * Math.sin(radians) + z * Math.cos(radians),
    ]
  }
  function project([x, y, z]: Vec) {
    return [240 + x * 76, 290 - y * 76 + z * 25]
  }
  const faces = geometry(type)
    .flatMap((box) => {
      const [x, y, z] = box.at
      const [w, h, d] = box.size
      const vertices: Vec[] = []
      for (const dz of [-1, 1])
        for (const dy of [-1, 1])
          for (const dx of [-1, 1])
            vertices.push(
              rotate([x + (dx * w) / 2, y + (dy * h) / 2, z + (dz * d) / 2]),
            )
      return [
        [0, 1, 3, 2],
        [4, 6, 7, 5],
        [0, 4, 5, 1],
        [2, 3, 7, 6],
        [0, 2, 6, 4],
        [1, 5, 7, 3],
      ].map((indices, i) => ({
        points: indices.map((n) => project(vertices[n]!).join(',')).join(' '),
        depth: indices.reduce((sum, n) => sum + vertices[n]![2], 0) / 4,
        color: box.color,
        shade: (i % 3) * 0.1,
      }))
    })
    .sort((a, b) => a.depth - b.depth)
  return (
    <div className="preview-shell">
      <div className="machine-preview">
        <svg
          viewBox="0 0 480 360"
          role="img"
          aria-label={`Rotatable generic ${type} machine model`}
        >
          <ellipse
            cx="240"
            cy="306"
            rx="125"
            ry="20"
            fill="#738078"
            opacity=".12"
          />
          {faces.map((face, i) => (
            <g key={i}>
              <polygon
                points={face.points}
                fill={face.color}
                stroke="#26382c"
                strokeWidth=".5"
              />
              <polygon points={face.points} fill="#000" opacity={face.shade} />
            </g>
          ))}
        </svg>
      </div>
      <label>
        Rotate machine
        <input
          type="range"
          min="0"
          max="360"
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
        />
      </label>
      <p className="muted">
        Generic equipment shape, not an exact branded model or exercise
        demonstration.
      </p>
    </div>
  )
}

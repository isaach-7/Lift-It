export function MachinePoster({
  message = 'Loading interactive preview...',
}: {
  message?: string
}) {
  return (
    <div className="preview-shell">
      <img
        className="machine-preview"
        src="/machine-poster.svg"
        width="480"
        height="360"
        alt="Generic gym machine"
      />
      <label>
        Rotate machine
        <input type="range" disabled value="35" readOnly />
      </label>
      <p className="muted">{message}</p>
    </div>
  )
}

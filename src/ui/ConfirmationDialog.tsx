import { useEffect, useRef } from 'react'

export function ConfirmationDialog({
  open,
  title,
  children,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="confirmation-dialog"
      aria-labelledby="confirmation-title"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onClose={onCancel}
    >
      <p className="eyebrow">Check your session</p>
      <h2 id="confirmation-title">{title}</h2>
      <div className="dialog-copy">{children}</div>
      <div className="dialog-actions">
        <button type="button" onClick={onCancel} autoFocus>
          Continue workout
        </button>
        <button type="button" className="secondary-button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

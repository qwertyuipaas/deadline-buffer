import Modal from './Modal'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-sm text-graphite hover:text-ink px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`text-sm font-medium px-4 py-1.5 rounded-lg text-white transition disabled:opacity-50 ${
              danger ? 'bg-deadline hover:bg-deadline/90' : 'bg-buffer hover:bg-buffer/90'
            }`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      {message}
    </Modal>
  )
}

import { useToast } from '../hooks/useToast'

const variantClass = {
  success: 'toast toast-success',
  error: 'toast toast-error',
  info: 'toast toast-info',
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={variantClass[toast.variant]}>
          <span>{toast.message}</span>
          <button type="button" className="icon-btn" onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

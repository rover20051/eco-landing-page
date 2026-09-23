import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import './Toast.css'

/*
 * Sistema de toasts global de ECO.
 * Uso:  const toast = useToast()
 *       toast.success('Tarea entregada')
 *       toast.error('No se pudo guardar')
 *       toast.info('Guardando…')
 *       const ok = await toast.confirm('¿Eliminar este usuario?')   // reemplaza window.confirm
 */
const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const resolverRef = useRef(null)

  const dismiss = useCallback(id => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const push = useCallback((type, message, duration = 3500) => {
    const id = nextId++
    setToasts(ts => [...ts.slice(-3), { id, type, message }])
    if (duration) setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const confirm = useCallback((message, { okLabel = 'Confirmar', cancelLabel = 'Cancelar' } = {}) => {
    return new Promise(resolve => {
      resolverRef.current = resolve
      setConfirmState({ message, okLabel, cancelLabel })
    })
  }, [])

  const resolveConfirm = value => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setConfirmState(null)
  }

  const api = {
    success: (m, d) => push('success', m, d),
    error: (m, d) => push('error', m, d ?? 5000),
    info: (m, d) => push('info', m, d),
    confirm,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="eco-toast-stack" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`eco-toast eco-toast--${t.type}`} onClick={() => dismiss(t.id)}>
            <span className="eco-toast-icon">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
      {confirmState && (
        <div className="eco-confirm-backdrop" onClick={() => resolveConfirm(false)}>
          <div className="eco-confirm-card" onClick={e => e.stopPropagation()}>
            <p>{confirmState.message}</p>
            <div className="eco-confirm-actions">
              <button className="eco-confirm-cancel" onClick={() => resolveConfirm(false)}>
                {confirmState.cancelLabel}
              </button>
              <button className="eco-confirm-ok" onClick={() => resolveConfirm(true)}>
                {confirmState.okLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

/* Skeleton de carga simple: <Skeleton height={18} width="60%" />  o  <Skeleton lines={3} /> */
export function Skeleton({ height = 16, width = '100%', lines = 1, style }) {
  if (lines > 1) {
    return (
      <div style={style}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="eco-skeleton"
               style={{ height, width: i === lines - 1 ? '70%' : width, marginBottom: 10 }} />
        ))}
      </div>
    )
  }
  return <div className="eco-skeleton" style={{ height, width, ...style }} />
}

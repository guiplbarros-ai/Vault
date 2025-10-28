'use client'

import { createContext, ReactNode, useContext, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    const newToast: Toast = { ...toast, id }
    setToasts((prev) => [...prev, newToast])

    const duration = toast.duration || 5000
    if (duration > 0) {
      setTimeout(() => hideToast(id), duration)
    }
  }

  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success-600" />,
    error: <AlertCircle className="w-5 h-5 text-error-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning-600" />,
    info: <Info className="w-5 h-5 text-info-600" />,
  }

  const styles = {
    success: 'bg-success-100 border-success-600',
    error: 'bg-error-100 border-error-600',
    warning: 'bg-warning-100 border-warning-600',
    info: 'bg-info-100 border-info-600',
  }

  const textColors = {
    success: 'text-success-600',
    error: 'text-error-600',
    warning: 'text-warning-600',
    info: 'text-info-600',
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl2 shadow-card',
        'bg-white dark:bg-graphite-800',
        'border-l-4',
        styles[toast.type],
        'animate-in slide-in-from-right-full'
      )}
    >
      {icons[toast.type]}
      <div className="flex-1">
        {toast.title && (
          <p className="font-semibold text-slate-900 dark:text-graphite-100">
            {toast.title}
          </p>
        )}
        <p className={cn('text-sm', textColors[toast.type])}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-graphite-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400"
      >
        <X className="w-4 h-4 text-slate-600 dark:text-graphite-300" />
      </button>
    </div>
  )
}

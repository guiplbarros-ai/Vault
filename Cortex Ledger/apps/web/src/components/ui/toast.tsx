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
    success: <CheckCircle className="w-5 h-5 text-success-500" />,
    error: <AlertCircle className="w-5 h-5 text-error-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning-500" />,
    info: <Info className="w-5 h-5 text-primary-500" />,
  }

  const borderColors = {
    success: 'border-l-success-500',
    error: 'border-l-error-500',
    warning: 'border-l-warning-500',
    info: 'border-l-primary-500',
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg shadow-lg',
        'bg-white dark:bg-neutral-900',
        'border border-neutral-200 dark:border-neutral-800 border-l-4',
        borderColors[toast.type],
        'animate-in slide-in-from-right-full'
      )}
    >
      {icons[toast.type]}
      <div className="flex-1">
        {toast.title && <p className="font-semibold">{toast.title}</p>}
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

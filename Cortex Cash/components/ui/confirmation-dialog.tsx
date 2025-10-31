'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

export interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  variant?: 'default' | 'destructive'
  loading?: boolean
  isDark?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  variant = 'default',
  loading = false,
  isDark = false,
}: ConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          "rounded-xl shadow-md border",
          isDark ? "!bg-gray-800 !border-gray-700" : "!bg-white !border-gray-200"
        )}
        style={isDark ? {
          background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
          backgroundColor: '#3B5563',
          borderColor: '#374151'
        } : undefined}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={isDark ? "text-white" : ""}>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className={isDark ? "text-white/70" : ""}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={loading}
            className={cn(
              isDark
                ? "!bg-gray-700 !border-gray-600 !text-white hover:!bg-gray-600"
                : ""
            )}
            style={isDark ? {
              backgroundColor: '#374151',
              borderColor: '#4b5563',
              color: '#ffffff'
            } : undefined}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              variant === 'destructive'
                ? '!bg-red-600 !text-white hover:!bg-red-700'
                : isDark
                ? '!bg-primary !text-white hover:!bg-primary/90'
                : ''
            )}
            style={
              variant === 'destructive'
                ? { backgroundColor: '#dc2626', color: '#ffffff' }
                : variant === 'default' && isDark
                ? { backgroundColor: '#18B0A4', color: '#ffffff' }
                : undefined
            }
          >
            {loading ? 'Processando...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

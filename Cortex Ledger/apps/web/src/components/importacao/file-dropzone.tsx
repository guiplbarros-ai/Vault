'use client'

import { useCallback, useState } from 'react'
import { Upload, File, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onClear: () => void
  accept?: string
  disabled?: boolean
}

export function FileDropzone({
  onFileSelect,
  selectedFile,
  onClear,
  accept = '.csv,.ofx',
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrag = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled) return

      if (e.type === 'dragenter' || e.type === 'dragover') {
        setIsDragging(true)
      } else if (e.type === 'dragleave') {
        setIsDragging(false)
      }
    },
    [disabled]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onFileSelect(files[0])
      }
    },
    [disabled, onFileSelect]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        onFileSelect(files[0])
      }
    },
    [onFileSelect]
  )

  if (selectedFile) {
    return (
      <div className="rounded-2xl border-2 border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-graphite-700">
              <File className="h-6 w-6 text-slate-900 dark:text-graphite-100" />
            </div>
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-slate-600 dark:text-graphite-300">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="rounded-lg p-2 text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:bg-graphite-700 hover:text-slate-900 dark:text-graphite-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={cn(
        'relative rounded-2xl border-2 border-dashed transition-all',
        isDragging
          ? 'border-brand-600 bg-white dark:bg-graphite-800'
          : 'border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 hover:border-brand-600',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        disabled={disabled}
        className="absolute inset-0 z-10 cursor-pointer opacity-0"
      />

      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div
          className={cn(
            'mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors',
            isDragging ? 'bg-slate-100 dark:bg-graphite-700' : 'bg-slate-100 dark:bg-graphite-700'
          )}
        >
          <Upload
            className={cn(
              'h-8 w-8 transition-colors',
              isDragging ? 'text-brand-600' : 'text-slate-600 dark:text-graphite-300'
            )}
          />
        </div>

        <h3 className="mb-2 text-lg font-semibold">
          {isDragging ? 'Solte o arquivo aqui' : 'Arraste seu arquivo aqui'}
        </h3>

        <p className="mb-4 text-sm text-slate-600 dark:text-graphite-300">
          ou clique para selecionar
        </p>

        <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-600 dark:text-graphite-300">
          <span className="rounded-full bg-slate-100 dark:bg-graphite-700 px-3 py-1">
            CSV
          </span>
          <span className="rounded-full bg-slate-100 dark:bg-graphite-700 px-3 py-1">
            OFX
          </span>
        </div>
      </div>
    </div>
  )
}

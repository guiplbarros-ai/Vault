'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  acceptedFormats?: string[]
}

export function FileUpload({ onFileSelect, acceptedFormats = ['.csv', '.ofx', '.xlsx'] }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        const file = files[0]
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        const file = files[0]
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleRemove = () => {
    setSelectedFile(null)
  }

  return (
    <div>
      {!selectedFile ? (
        <div
          className={`
            relative
            rounded-lg border-2 border-dashed p-12
            transition-all
            ${
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                : 'border-neutral-300 bg-neutral-50 hover:border-primary-400 dark:border-neutral-600 dark:bg-neutral-800/50'
            }
          `}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept={acceptedFormats.join(',')}
            onChange={handleFileInput}
          />

          <label
            htmlFor="file-upload"
            className="flex cursor-pointer flex-col items-center justify-center gap-4"
          >
            <div className="rounded-full bg-primary-100 p-4 dark:bg-primary-900">
              <Upload className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Arraste o arquivo aqui
              </p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                ou clique para selecionar
              </p>
            </div>

            <p className="text-xs text-neutral-500">
              Formatos aceitos: {acceptedFormats.join(', ').toUpperCase()}
            </p>
          </label>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary-100 p-3 dark:bg-primary-900">
                <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-50">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-neutral-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

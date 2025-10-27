'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileWithPreview extends File {
  preview?: string
  status?: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  maxFiles?: number
  maxSize?: number // em MB
  disabled?: boolean
}

export function FileUploadZone({
  onFilesSelected,
  accept = '.csv,.ofx,.xlsx,.xls',
  maxFiles = 5,
  maxSize = 10,
  disabled = false,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<FileWithPreview[]>([])

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

  const validateFile = (file: File): string | null => {
    // Validar tamanho
    if (file.size > maxSize * 1024 * 1024) {
      return `Arquivo muito grande. Máximo: ${maxSize}MB`
    }

    // Validar extensão
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    const acceptedExtensions = accept.split(',').map((ext) => ext.trim().toLowerCase())

    if (!acceptedExtensions.includes(extension)) {
      return `Formato não suportado. Aceito: ${accept}`
    }

    return null
  }

  const processFiles = (fileList: FileList | File[]) => {
    const newFiles: FileWithPreview[] = []
    const filesArray = Array.from(fileList)

    if (files.length + filesArray.length > maxFiles) {
      alert(`Você pode enviar no máximo ${maxFiles} arquivos de uma vez`)
      return
    }

    filesArray.forEach((file) => {
      const error = validateFile(file)
      const fileWithPreview = Object.assign(file, {
        status: error ? ('error' as const) : ('pending' as const),
        error: error || undefined,
      })
      newFiles.push(fileWithPreview)
    })

    const updatedFiles = [...files, ...newFiles]
    setFiles(updatedFiles)

    // Notificar parent apenas dos arquivos válidos
    const validFiles = newFiles.filter((f) => f.status === 'pending')
    if (validFiles.length > 0) {
      onFilesSelected(validFiles)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const { files: droppedFiles } = e.dataTransfer
      if (droppedFiles && droppedFiles.length > 0) {
        processFiles(droppedFiles)
      }
    },
    [disabled, files, maxFiles, maxSize, accept]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return

    const { files: selectedFiles } = e.target
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles)
    }
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesSelected(newFiles.filter((f) => f.status === 'pending'))
  }

  const clearAll = () => {
    setFiles([])
    onFilesSelected([])
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-200',
          isDragging
            ? 'border-brand bg-surface'
            : 'border-line/25',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          id="file-upload"
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div
            className={cn(
              'rounded-full p-4 mb-4 transition-colors',
              isDragging ? 'bg-elev' : 'bg-elev'
            )}
          >
            <Upload
              className={cn(
                'w-8 h-8 transition-colors',
                isDragging ? 'text-brand' : 'text-muted'
              )}
            />
          </div>

          <h3 className="text-lg font-semibold text-text mb-2">
            {isDragging ? 'Solte os arquivos aqui' : 'Arraste e solte seus arquivos'}
          </h3>

          <p className="text-sm text-muted mb-4">
            ou clique para selecionar do seu computador
          </p>

          <div className="flex items-center gap-4 text-xs text-muted">
            <span>Formatos: {accept.replace(/\./g, '').toUpperCase()}</span>
            <span>•</span>
            <span>Máximo: {maxSize}MB por arquivo</span>
            <span>•</span>
            <span>Até {maxFiles} arquivos</span>
          </div>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-text">
                Arquivos Selecionados ({files.length})
              </h4>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Limpar Todos
              </Button>
            </div>

            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-line/25"
                >
                  <div className="flex-shrink-0">
                    <FileText className="w-8 h-8 text-text" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-text truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted">
                        {formatFileSize(file.size)}
                      </span>
                      {file.status === 'error' && file.error && (
                        <>
                          <span className="text-xs text-muted">•</span>
                          <span className="text-xs text-danger">
                            {file.error}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {file.status === 'success' && (
                      <CheckCircle className="w-5 h-5 text-success" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-danger" />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

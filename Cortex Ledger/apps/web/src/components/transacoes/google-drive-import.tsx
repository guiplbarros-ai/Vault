'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FolderOpen,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  modifiedTime: string
  webViewLink: string
}

interface GoogleDriveImportProps {
  onFilesImport: (files: File[]) => void
}

export function GoogleDriveImport({ onFilesImport }: GoogleDriveImportProps) {
  const [folderUrl, setFolderUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Extrair folder ID da URL do Google Drive
  const extractFolderId = (url: string): string | null => {
    // Suporta URLs como:
    // https://drive.google.com/drive/folders/FOLDER_ID
    // https://drive.google.com/drive/u/0/folders/FOLDER_ID
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  const handleListFiles = async () => {
    setError(null)
    setFiles([])
    setSelectedFiles(new Set())

    const folderId = extractFolderId(folderUrl)
    if (!folderId) {
      setError('URL inválida. Use uma URL de pasta do Google Drive.')
      return
    }

    setIsLoading(true)

    try {
      // Chamar API para listar arquivos da pasta do Google Drive
      const response = await fetch('/api/google-drive/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao listar arquivos do Google Drive')
      }

      // Filtrar apenas arquivos suportados (CSV, OFX, Excel)
      const supportedFiles = data.files.filter((file: DriveFile) =>
        [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/x-ofx',
        ].includes(file.mimeType) ||
        file.name.toLowerCase().endsWith('.csv') ||
        file.name.toLowerCase().endsWith('.ofx') ||
        file.name.toLowerCase().endsWith('.xlsx') ||
        file.name.toLowerCase().endsWith('.xls')
      )

      setFiles(supportedFiles)

      if (supportedFiles.length === 0) {
        setError('Nenhum arquivo suportado encontrado na pasta.')
      }
    } catch (err: any) {
      console.error('Error listing Google Drive files:', err)
      setError(err.message || 'Erro ao conectar com Google Drive')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles)
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId)
    } else {
      newSelection.add(fileId)
    }
    setSelectedFiles(newSelection)
  }

  const selectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)))
    }
  }

  const handleDownloadAndImport = async () => {
    if (selectedFiles.size === 0) {
      alert('Selecione pelo menos um arquivo')
      return
    }

    setIsLoading(true)

    try {
      const selectedFilesList = files.filter((f) => selectedFiles.has(f.id))

      // Download files from Google Drive
      const downloadedFiles: File[] = []

      for (const driveFile of selectedFilesList) {
        const response = await fetch('/api/google-drive/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: driveFile.id }),
        })

        if (!response.ok) {
          throw new Error(`Erro ao baixar ${driveFile.name}`)
        }

        const blob = await response.blob()
        const file = new File([blob], driveFile.name, { type: driveFile.mimeType })
        downloadedFiles.push(file)
      }

      // Pass files to parent component for import
      onFilesImport(downloadedFiles)
    } catch (err: any) {
      console.error('Error downloading files:', err)
      setError(err.message || 'Erro ao baixar arquivos do Google Drive')
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <Card>
        <CardBody className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-text mb-2">
                Conectar ao Google Drive
              </h3>
              <p className="text-sm text-muted">
                Cole o link da pasta do Google Drive que contém seus extratos e faturas
              </p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={folderUrl}
                  onChange={(e) => setFolderUrl(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button onClick={handleListFiles} disabled={!folderUrl || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Listar Arquivos
                  </>
                )}
              </Button>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-surface rounded-xl border border-line/25">
              <p className="text-xs text-muted mb-2">
                <strong>Como obter o link da pasta:</strong>
              </p>
              <ol className="text-xs text-muted space-y-1 list-decimal list-inside">
                <li>Acesse o Google Drive e abra a pasta desejada</li>
                <li>
                  Clique no botão de compartilhamento e configure como "Qualquer pessoa com o link"
                </li>
                <li>Copie o link e cole acima</li>
              </ol>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-surface border border-danger rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-danger">Erro</p>
            <p className="text-sm text-danger mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardBody className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text">
                  Arquivos Disponíveis ({files.length})
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selectedFiles.size === files.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </Button>
                  <Button
                    onClick={handleDownloadAndImport}
                    disabled={selectedFiles.size === 0 || isLoading}
                    size="sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Baixando...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Importar Selecionados ({selectedFiles.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                      selectedFiles.has(file.id)
                        ? 'bg-elev border-brand'
                        : 'bg-surface border-line/25 hover:bg-elev'
                    }`}
                    onClick={() => toggleFileSelection(file.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-neutral-300"
                    />

                    <div className="flex-shrink-0">
                      <FileText className="w-8 h-8 text-text" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-text truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>Modificado: {formatDate(file.modifiedTime)}</span>
                      </div>
                    </div>

                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg hover:bg-elev transition-colors"
                      title="Ver no Google Drive"
                    >
                      <ExternalLink className="w-4 h-4 text-muted" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

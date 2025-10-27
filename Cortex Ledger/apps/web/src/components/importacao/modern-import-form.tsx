'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileDropzone } from './file-dropzone'
import { BankSelector } from './bank-selector'
import { ImportResult } from './import-result'
import { Upload, Info } from 'lucide-react'

interface ImportResultData {
  success: boolean
  transactions?: number
  duplicates?: number
  errors?: string[]
  metadata?: any
}

interface ModernImportFormProps {
  contas: Array<{ id: string; apelido: string }>
}

export function ModernImportForm({ contas }: ModernImportFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [banco, setBanco] = useState<string>('auto')
  const [contaId, setContaId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResultData | null>(null)

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setResult(null)
  }

  const handleClearFile = () => {
    setFile(null)
    setResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !contaId) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('conta_id', contaId)
      if (banco !== 'auto') {
        formData.append('banco', banco)
      }

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        body: formData,
      })

      const data: ImportResultData = await response.json()
      setResult(data)

      if (data.success) {
        // Clear form on success
        setFile(null)
        setBanco('auto')
      }
    } catch (error: any) {
      setResult({
        success: false,
        errors: [error.message || 'Erro ao processar arquivo'],
      })
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = file && contaId && !loading

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted" />
            <label className="text-sm font-medium text-text">
              1. Selecione o arquivo de extrato ou fatura
            </label>
          </div>
          <FileDropzone
            onFileSelect={handleFileSelect}
            selectedFile={file}
            onClear={handleClearFile}
            disabled={loading}
          />
        </div>

        {/* Account Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-text">
            2. Escolha a conta de destino
          </label>
          <Select value={contaId} onValueChange={setContaId} disabled={loading}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecione a conta onde as transações serão importadas" />
            </SelectTrigger>
            <SelectContent>
              {contas.map((conta) => (
                <SelectItem key={conta.id} value={conta.id}>
                  {conta.apelido}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bank Selection */}
        <div>
          <BankSelector selected={banco} onSelect={setBanco} />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full text-base font-semibold"
          size="lg"
        >
          {loading ? (
            <>
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processando arquivo...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Importar Transações
            </>
          )}
        </Button>
      </form>

      {/* Import Result */}
      {result && <ImportResult {...result} />}

      {/* Help Section */}
      <div className="rounded-2xl border border-line/25 bg-surface p-4">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-info" />
          <div className="space-y-2 text-sm text-text">
            <p className="font-semibold">Formatos Suportados:</p>
            <ul className="space-y-1 text-muted">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-info" />
                <span><strong>CSV:</strong> Extratos do Bradesco, Itaú, Inter, etc.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-info" />
                <span><strong>OFX:</strong> Formato padrão de diversos bancos</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-info" />
                <span><strong>Faturas:</strong> CSV de cartões de crédito (AMEX, Aeternum, etc.)</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted">
              💡 O sistema detecta automaticamente duplicatas e evita importações repetidas usando hash de transações.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

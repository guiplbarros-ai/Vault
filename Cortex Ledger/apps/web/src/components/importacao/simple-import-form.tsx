'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ImportResult {
	success: boolean
	transactions?: number
	duplicates?: number
	errors?: string[]
	metadata?: any
}

export function SimpleImportForm({ contas }: { contas: Array<{ id: string; apelido: string }> }) {
	const [file, setFile] = useState<File | null>(null)
	const [banco, setBanco] = useState<string>('auto')
	const [contaId, setContaId] = useState<string>('')
	const [loading, setLoading] = useState(false)
	const [result, setResult] = useState<ImportResult | null>(null)

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0]
		if (selectedFile) {
			setFile(selectedFile)
			setResult(null)
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!file) {
			alert('Selecione um arquivo')
			return
		}

		if (!contaId) {
			alert('Selecione uma conta')
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
				body: formData
			})

			const data: ImportResult = await response.json()
			setResult(data)

			if (data.success) {
				// Limpar formulário após sucesso
				setFile(null)
				// Reset file input
				const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
				if (fileInput) fileInput.value = ''
			}
		} catch (error: any) {
			setResult({
				success: false,
				errors: [error.message || 'Erro ao processar arquivo']
			})
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="space-y-6">
			<form onSubmit={handleSubmit} className="space-y-4">
				{/* Upload de arquivo */}
				<div className="space-y-2">
					<Label htmlFor="file">Arquivo de Extrato ou Fatura</Label>
					<div className="flex items-center gap-2">
						<input
							id="file"
							type="file"
							accept=".csv,.ofx"
							onChange={handleFileChange}
							className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
						/>
						<Upload className="h-5 w-5 text-muted-foreground" />
					</div>
					{file && (
						<p className="text-sm text-muted-foreground">
							Arquivo selecionado: {file.name} ({(file.size / 1024).toFixed(2)} KB)
						</p>
					)}
				</div>

				{/* Seleção de conta */}
				<div className="space-y-2">
					<Label htmlFor="conta">Conta de Destino</Label>
					<Select value={contaId} onValueChange={setContaId}>
						<SelectTrigger id="conta">
							<SelectValue placeholder="Selecione a conta" />
						</SelectTrigger>
						<SelectContent>
							{contas.map(conta => (
								<SelectItem key={conta.id} value={conta.id}>
									{conta.apelido}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Seleção de banco (opcional) */}
				<div className="space-y-2">
					<Label htmlFor="banco">Banco (opcional)</Label>
					<Select value={banco} onValueChange={setBanco}>
						<SelectTrigger id="banco">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="auto">🤖 Detectar automaticamente</SelectItem>
							<SelectItem value="bradesco">🏦 Bradesco</SelectItem>
							<SelectItem value="itau">🏦 Itaú</SelectItem>
							<SelectItem value="nubank">💜 Nubank</SelectItem>
							<SelectItem value="c6">🏦 C6 Bank</SelectItem>
							<SelectItem value="inter">🟠 Inter</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						O sistema detecta automaticamente o banco pelo conteúdo do arquivo
					</p>
				</div>

				{/* Botão de importação */}
				<Button type="submit" disabled={!file || !contaId || loading} className="w-full">
					{loading ? (
						<>
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
							Processando...
						</>
					) : (
						<>
							<Upload className="h-4 w-4 mr-2" />
							Importar Transações
						</>
					)}
				</Button>
			</form>

			{/* Resultado da importação */}
			{result && (
				<div className="space-y-4">
					{result.success ? (
						<Alert className="border-green-500 bg-green-50 dark:bg-green-950">
							<CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
							<AlertDescription className="text-green-800 dark:text-green-200">
								<strong>Importação concluída com sucesso!</strong>
								<div className="mt-2 space-y-1 text-sm">
									<p>✅ {result.transactions} transações importadas</p>
									{(result.duplicates ?? 0) > 0 && (
										<p>⚠️ {result.duplicates} transações duplicadas ignoradas</p>
									)}
									{result.metadata && (
										<div className="mt-2 text-xs text-green-700 dark:text-green-300">
											<p>Banco: {result.metadata.banco}</p>
											<p>Tipo: {result.metadata.tipo}</p>
											<p>Formato: {result.metadata.formato}</p>
											{result.metadata.periodo && (
												<p>Período: {result.metadata.periodo.inicio} a {result.metadata.periodo.fim}</p>
											)}
										</div>
									)}
								</div>
							</AlertDescription>
						</Alert>
					) : (
						<Alert className="border-red-500 bg-red-50 dark:bg-red-950">
							<XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
							<AlertDescription className="text-red-800 dark:text-red-200">
								<strong>Erro na importação</strong>
								{result.errors && result.errors.length > 0 && (
									<ul className="mt-2 space-y-1 text-sm list-disc list-inside">
										{result.errors.map((error, i) => (
											<li key={i}>{error}</li>
										))}
									</ul>
								)}
							</AlertDescription>
						</Alert>
					)}
				</div>
			)}

			{/* Informações */}
			<Alert>
				<AlertCircle className="h-4 w-4" />
				<AlertDescription className="text-sm">
					<strong>Formatos suportados:</strong>
					<ul className="mt-1 space-y-1 text-xs">
						<li>• Extrato CSV (Bradesco, Itaú, etc.)</li>
						<li>• Extrato OFX (formato padrão)</li>
						<li>• Fatura de cartão CSV (AMEX, Aeternum, etc.)</li>
					</ul>
					<p className="mt-2 text-xs text-muted-foreground">
						O sistema detecta automaticamente o formato e evita importações duplicadas.
					</p>
				</AlertDescription>
			</Alert>
		</div>
	)
}

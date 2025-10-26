'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/importacao/file-upload'
import { TemplateSelector } from '@/components/importacao/template-selector'
import { ImportPreview } from '@/components/importacao/import-preview'
import { useImportPreview } from '@/lib/hooks/use-import-preview'

export default function ImportarPage() {
	const [file, setFile] = useState<File | null>(null)
	const [templateId, setTemplateId] = useState<string | null>(null)
	const { preview, status } = useImportPreview(file, templateId)

	const canImport = !!file && !!templateId && status === 'ready'

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Importar</h1>
				<p className="text-neutral-500">Importe transações de arquivos CSV e OFX</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Importação de Arquivos</CardTitle>
					<CardDescription>
						Selecione um arquivo e um template para pré-visualizar os dados antes de importar.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h3 className="text-sm font-semibold mb-2">1) Arquivo</h3>
							<FileUpload onFileSelect={setFile} />
						</div>
						<div>
							<h3 className="text-sm font-semibold mb-2">2) Template</h3>
							<TemplateSelector onSelect={setTemplateId} />
						</div>
					</div>
					<div>
						<h3 className="text-sm font-semibold mb-2">3) Pré-visualização (primeiras 10 linhas)</h3>
						<ImportPreview columns={preview.columns} rows={preview.rows} errors={preview.errors} />
					</div>
				</CardContent>
				<CardFooter className="flex items-center justify-end gap-3">
					<Button variant="outline" onClick={() => { setFile(null); setTemplateId(null) }}>Limpar</Button>
					<Button disabled={!canImport} onClick={() => alert('Importação será integrada ao ETL em seguida.')}>Importar</Button>
				</CardFooter>
			</Card>
		</div>
	)
}

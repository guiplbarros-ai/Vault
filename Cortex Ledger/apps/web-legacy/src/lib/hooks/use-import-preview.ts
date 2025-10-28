import { useEffect, useMemo, useState } from 'react'

export type ImportPreviewRow = Record<string, string>

export interface ImportPreview {
	columns: string[]
	rows: ImportPreviewRow[]
	errors: string[]
}

function detectDelimiter(sample: string): string {
	const semi = (sample.match(/;/g) || []).length
	const comma = (sample.match(/,/g) || []).length
	const tab = (sample.match(/\t/g) || []).length
	if (semi >= comma && semi >= tab) return ';'
	if (comma >= semi && comma >= tab) return ','
	return '\t'
}

function findHeaderLine(lines: string[], delimiter: string): number {
	for (let i = 0; i < Math.min(lines.length, 50); i++) {
		const parts = lines[i].split(delimiter)
		if (parts.length >= 3 && /[A-Za-zÀ-ÿ]/.test(lines[i])) return i
	}
	return 0
}

function parseCsv(text: string): ImportPreview {
	const errors: string[] = []
	const delimiter = detectDelimiter(text)
	const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
	if (rawLines.length === 0) return { columns: [], rows: [], errors: ['Arquivo vazio'] }
	const headerIdx = findHeaderLine(rawLines, delimiter)
	const header = rawLines[headerIdx].split(delimiter).map((h) => h.trim())
	const rows: ImportPreviewRow[] = []
	for (let i = headerIdx + 1; i < rawLines.length && rows.length < 20; i++) {
		const cols = rawLines[i].split(delimiter)
		if (cols.length < 2) continue
		const row: ImportPreviewRow = {}
		header.forEach((h, idx) => {
			row[h || `col_${idx}`] = (cols[idx] ?? '').trim()
		})
		rows.push(row)
	}
	return { columns: header, rows, errors }
}

function parseOfx(text: string): ImportPreview {
	// Very lightweight OFX 1.x parser: extracts STMTTRN blocks
	const errors: string[] = []
	const rows: ImportPreviewRow[] = []
	const regex = /<STMTTRN>[\s\S]*?<\/STMTTRN>/gi
	const matches = text.match(regex) || []
	for (let i = 0; i < Math.min(matches.length, 20); i++) {
		const block = matches[i]
		const get = (tag: string) => block.match(new RegExp(`<${tag}>([^\n\r<]+)`))?.[1]?.trim() || ''
		rows.push({
			DTPOSTED: get('DTPOSTED'),
			TRNAMT: get('TRNAMT'),
			TRNTYPE: get('TRNTYPE'),
			FITID: get('FITID'),
			NAME: get('NAME'),
			MEMO: get('MEMO'),
		})
	}
	const columns = ['DTPOSTED', 'TRNAMT', 'TRNTYPE', 'FITID', 'NAME', 'MEMO']
	if (rows.length === 0) errors.push('Nenhum registro <STMTTRN> encontrado')
	return { columns, rows, errors }
}

export function useImportPreview(file: File | null, templateId: string | null) {
	const [preview, setPreview] = useState<ImportPreview>({ columns: [], rows: [], errors: [] })
	const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

	useEffect(() => {
		let cancelled = false
		async function run() {
			if (!file) {
				setPreview({ columns: [], rows: [], errors: [] })
				setStatus('idle')
				return
			}
			setStatus('loading')
			try {
				const text = await file.text()
				const isOfx = (file.name.toLowerCase().endsWith('.ofx')) || (templateId?.includes('ofx') ?? false)
				const parsed = isOfx ? parseOfx(text) : parseCsv(text)
				if (!cancelled) {
					setPreview(parsed)
					setStatus(parsed.errors.length ? 'error' : 'ready')
				}
			} catch (e: any) {
				if (!cancelled) {
					setPreview({ columns: [], rows: [], errors: [String(e?.message || e)] })
					setStatus('error')
				}
			}
		}
		run()
		return () => {
			cancelled = true
		}
	}, [file, templateId])

	return useMemo(() => ({ preview, status }), [preview, status])
}

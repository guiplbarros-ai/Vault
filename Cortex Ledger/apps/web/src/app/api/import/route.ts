import { NextRequest } from 'next/server'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execPromise = promisify(exec)

export async function POST(req: NextRequest) {
	try {
		const { filePath, templateId, contaId, dryRun } = await req.json()
		if (!filePath || !templateId || !contaId) {
			return Response.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
		}
		const cmd = `pnpm tsx packages/etl/src/cli/import.ts --file "${filePath}" --template "${templateId}" ${dryRun ? '--dry-run' : ''} --conta "${contaId}"`
		const { stdout, stderr } = await execPromise(cmd, { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 })
		if (stderr && !stderr.trim().startsWith('Warning')) {
			return Response.json({ error: stderr }, { status: 500 })
		}
		let parsed: any = null
		try { parsed = JSON.parse(stdout) } catch {
			parsed = { message: stdout }
		}
		return Response.json({ ok: true, result: parsed })
	} catch (e: any) {
		return Response.json({ error: String(e?.message || e) }, { status: 500 })
	}
}

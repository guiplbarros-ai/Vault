import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { ModernImportForm } from '@/components/importacao/modern-import-form'
import { FileSpreadsheet, TrendingUp, Shield } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function ImportarPage() {
	const supabase = await createServerClient()

	// Verificar autenticação
	const { data: { user }, error: authError } = await supabase.auth.getUser()
	if (authError || !user) {
		redirect('/login')
	}

	// Buscar contas do usuário
	const { data: contas, error: contasError } = await supabase
		.from('conta')
		.select('id, apelido, tipo')
		.eq('user_id', user.id)
		.eq('ativa', true)
		.order('apelido')

	if (contasError) {
		console.error('Erro ao buscar contas:', contasError)
	}

	const contasFormatadas = (contas || []).map(c => ({
		id: c.id,
		apelido: c.apelido || 'Sem nome'
	}))

	return (
		<div className="space-y-8">
			{/* Cabeçalho */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-text">Importar Transações</h1>
				<p className="mt-2 text-muted">
					Importe extratos bancários e faturas de cartão de forma rápida e segura
				</p>
			</div>

			{/* Features Grid */}
			<div className="grid gap-4 md:grid-cols-3">
				<div className="rounded-2xl border border-line/25 bg-surface p-4">
					<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
						<FileSpreadsheet className="h-5 w-5 text-text" />
					</div>
					<h3 className="mb-1 font-semibold">Multi-formato</h3>
					<p className="text-sm text-muted">
						Suporte para CSV, OFX e diversos formatos de bancos
					</p>
				</div>

				<div className="rounded-2xl border border-line/25 bg-surface p-4">
					<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
						<TrendingUp className="h-5 w-5 text-text" />
					</div>
					<h3 className="mb-1 font-semibold">Detecção Inteligente</h3>
					<p className="text-sm text-muted">
						Identifica automaticamente banco e formato do arquivo
					</p>
				</div>

				<div className="rounded-2xl border border-line/25 bg-surface p-4">
					<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
						<Shield className="h-5 w-5 text-text" />
					</div>
					<h3 className="mb-1 font-semibold">Anti-duplicatas</h3>
					<p className="text-sm text-muted">
						Sistema inteligente evita transações duplicadas
					</p>
				</div>
			</div>

			{/* Formulário de importação */}
			{contasFormatadas.length > 0 ? (
				<div className="mx-auto max-w-3xl">
					<ModernImportForm contas={contasFormatadas} />
				</div>
			) : (
				<div className="mx-auto max-w-2xl rounded-2xl border-2 border-dashed border-line/25 bg-surface p-12 text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-elev">
						<FileSpreadsheet className="h-8 w-8 text-text" />
					</div>
					<h3 className="mb-2 text-lg font-semibold">Nenhuma conta encontrada</h3>
					<p className="mb-6 text-muted">
						Você precisa criar uma conta antes de importar transações.
					</p>
					<Link href="/contas">
						<Button>Gerenciar Contas</Button>
					</Link>
				</div>
			)}
		</div>
	)
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { parseBradescoFile } from '@/lib/parsers/bradesco-parser'
import { detectBanco } from '@/lib/parsers/banco-detector'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ImportResult {
	success: boolean
	transactions?: number
	duplicates?: number
	errors?: string[]
	metadata?: any
}

/**
 * POST /api/transactions/import
 *
 * Recebe um arquivo (CSV ou OFX) e importa as transações automaticamente.
 * O sistema detecta o banco e o formato automaticamente.
 *
 * Body (multipart/form-data):
 * - file: arquivo CSV ou OFX
 * - banco: (opcional) 'bradesco' | 'itau' | 'nubank' etc.
 * - conta_id: ID da conta para vincular as transações
 */
export async function POST(req: NextRequest): Promise<NextResponse<ImportResult>> {
	try {
		const supabase = await createServerClient()

		// Verificar autenticação
		const { data: { user }, error: authError } = await supabase.auth.getUser()
		if (authError || !user) {
			return NextResponse.json(
				{ success: false, errors: ['Usuário não autenticado'] },
				{ status: 401 }
			)
		}

		// Parse do form data
		const formData = await req.formData()
		const file = formData.get('file') as File
		const bancoHint = formData.get('banco') as string | null
		const contaId = formData.get('conta_id') as string | null

		if (!file) {
			return NextResponse.json(
				{ success: false, errors: ['Arquivo não fornecido'] },
				{ status: 400 }
			)
		}

		// Ler conteúdo do arquivo
		const content = await file.text()

		// Detectar banco automaticamente (ou usar hint)
		const banco = bancoHint || detectBanco(content, file.name)

		if (!banco) {
			return NextResponse.json(
				{ success: false, errors: ['Não foi possível detectar o banco. Tente selecionar manualmente.'] },
				{ status: 400 }
			)
		}

		// Parse baseado no banco
		let parseResult
		switch (banco.toLowerCase()) {
			case 'bradesco':
				parseResult = parseBradescoFile(content)
				break
			default:
				return NextResponse.json(
					{ success: false, errors: [`Banco '${banco}' ainda não suportado`] },
					{ status: 400 }
				)
		}

		// Verificar erros no parsing
		if (parseResult.errors.length > 0) {
			return NextResponse.json(
				{ success: false, errors: parseResult.errors },
				{ status: 400 }
			)
		}

		if (parseResult.transactions.length === 0) {
			return NextResponse.json(
				{ success: false, errors: ['Nenhuma transação encontrada no arquivo'] },
				{ status: 400 }
			)
		}

		// Converter transações para formato do banco
		const transacoesParaInserir = parseResult.transactions.map(t => {
			// Converter data DD/MM/YY para YYYY-MM-DD
			const parseDate = (dateStr: string): string => {
				const parts = dateStr.split('/')
				if (parts.length === 3) {
					let day = parts[0].padStart(2, '0')
					let month = parts[1].padStart(2, '0')
					let year = parts[2]

					// Se ano tem 2 dígitos, converter para 4
					if (year.length === 2) {
						const yearNum = parseInt(year)
						year = yearNum > 50 ? `19${year}` : `20${year}`
					}

					return `${year}-${month}-${day}`
				}
				return dateStr
			}

			const dataFormatada = parseDate(t.data)
			const valorFinal = t.tipo === 'debito' ? -Math.abs(t.valor) : Math.abs(t.valor)

			// Criar hash para deduplicação
			const hashDedupe = `${dataFormatada}|${t.descricao}|${valorFinal}`

			return {
				user_id: user.id,
				conta_id: contaId,
				data: dataFormatada,
				descricao: t.descricao,
				valor: valorFinal,
				tipo: t.tipo,
				id_externo: t.documento,
				moeda_original: t.moeda || 'BRL',
				hash_dedupe: hashDedupe
			}
		})

		// Verificar duplicatas (baseado em hash_dedupe)
		const { data: existingTransactions } = await supabase
			.from('transacao')
			.select('hash_dedupe')
			.eq('user_id', user.id)
			.gte('data', transacoesParaInserir[0].data)
			.lte('data', transacoesParaInserir[transacoesParaInserir.length - 1].data)

		// Filtrar duplicatas
		const existingSet = new Set(
			(existingTransactions || []).map(t => t.hash_dedupe)
		)

		const transacoesNovas = transacoesParaInserir.filter(t =>
			!existingSet.has(t.hash_dedupe)
		)

		const duplicatesCount = transacoesParaInserir.length - transacoesNovas.length

		// Inserir transações novas
		if (transacoesNovas.length > 0) {
			const { error: insertError } = await supabase
				.from('transacao')
				.insert(transacoesNovas)

			if (insertError) {
				console.error('Erro ao inserir transações:', insertError)
				return NextResponse.json(
					{ success: false, errors: [`Erro ao salvar transações: ${insertError.message}`] },
					{ status: 500 }
				)
			}
		}

		return NextResponse.json({
			success: true,
			transactions: transacoesNovas.length,
			duplicates: duplicatesCount,
			metadata: {
				banco,
				tipo: parseResult.metadata.tipo,
				formato: parseResult.metadata.formato,
				total_arquivo: parseResult.transactions.length,
				periodo: parseResult.metadata.periodo
			}
		})

	} catch (error: any) {
		console.error('Erro na importação:', error)
		return NextResponse.json(
			{ success: false, errors: [error.message || 'Erro desconhecido'] },
			{ status: 500 }
		)
	}
}

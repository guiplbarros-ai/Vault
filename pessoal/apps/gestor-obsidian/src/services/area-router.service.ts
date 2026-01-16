import { loadEnv } from '../utils/env.js'
import { getTaxonsDbService } from './taxons-db.service.js'

loadEnv()

export type WorkspaceId = 'pessoal' | 'freelaw'

export interface AreaSuggestion {
  slug: string
  confidence: 'high' | 'medium'
  reason: string
}

function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function extractExplicitAreaSlug(text: string): string | null {
  // Accept "area/<slug>" anywhere in message
  const m = text.match(/\barea\/([a-z0-9\-]+)\b/i)
  return m?.[1] ? m[1].toLowerCase() : null
}

function keywordMatch(content: string, keywords: string[]): boolean {
  return keywords.some((k) => content.includes(k))
}

const KEYWORDS: Record<WorkspaceId, Record<string, string[]>> = {
  pessoal: {
    casa: [
      'casa',
      'reforma',
      'obra',
      'manutencao',
      'conserto',
      'encanador',
      'eletricista',
      'condominio',
      'apartamento',
      'imovel',
    ],
    casamento: ['esposa', 'casamento', 'relacionamento', 'vida a dois', 'nos dois', 'conjuge'],
    familia: [
      'familia',
      'mae',
      'pai',
      'irma',
      'irmao',
      'sogro',
      'sogra',
      'cunhado',
      'cunhada',
      'avo',
      'tia',
      'tio',
      'primo',
    ],
    'financas-pessoais': [
      'financas',
      'cartao',
      'fatura',
      'boleto',
      'pix',
      'banco',
      'investimento',
      'orcamento',
      'gasto',
      'despesa',
      'receita',
      'renda',
    ],
    saude: [
      'saude',
      'medico',
      'consulta',
      'exame',
      'terapia',
      'psicologo',
      'academia',
      'treino',
      'remedio',
    ],
    amigos: ['amigo', 'amigos', 'aniversario', 'encontro', 'jantar', 'churrasco'],
    lazer: ['viagem', 'hobby', 'filme', 'serie', 'livro', 'show', 'passeio'],
    carreira: [
      'carreira',
      'trabalho',
      'promocao',
      'salario',
      'curriculo',
      'cv',
      'entrevista',
      'vaga',
      'mudanca de emprego',
      'lideranca',
    ],
    estudos: [
      'estudos',
      'estudar',
      'curso',
      'aula',
      'certificacao',
      'certificado',
      'faculdade',
      'pos',
      'pós',
      'mentoria',
      'aprender',
    ],
    viagens: [
      'viagem',
      'hotel',
      'passagem',
      'voo',
      'aeroporto',
      'itinerario',
      'roteiro',
      'reserva',
      'airbnb',
    ],
    investimentos: [
      'investimentos',
      'acoes',
      'ações',
      'tesouro',
      'cdb',
      'fii',
      'fundo',
      'carteira',
      'aporte',
      'alocacao',
      'alocação',
    ],
    rotina: [
      'rotina',
      'habito',
      'hábito',
      'checklist',
      'manha',
      'manhã',
      'noite',
      'sono',
      'exercicio',
      'exercício',
    ],
    objetivos: [
      'objetivo',
      'objetivos',
      'meta',
      'metas',
      'trimestre',
      'semanal',
      'mensal',
      'planejamento pessoal',
    ],
    administrativo: [
      'administrativo',
      'documento',
      'documentos',
      'imposto',
      'ir',
      'receita federal',
      'cartorio',
      'cartório',
      'renovar',
      'renovacao',
      'renovação',
    ],
    consumo: [
      'comprar',
      'compra',
      'consumo',
      'produto',
      'comparar',
      'preco',
      'preço',
      'wishlist',
      'lista de desejos',
      'orçamento',
    ],
    eu: [
      'sobre mim',
      'eu',
      'identidade',
      'valores',
      'reflexao',
      'reflexão',
      'decisao',
      'decisão',
      'aprendizado',
    ],
    diario: ['diario', 'diário', 'journaling', 'hoje eu', 'ontem eu', 'registro do dia'],
  },
  freelaw: {
    comunidade: [
      'comunidade',
      'membros',
      'member',
      'discord',
      'grupo',
      'evento',
      'workshop',
      'aula',
      'conteudo',
    ],
    financeiro: [
      'financeiro',
      'faturamento',
      'receita',
      'despesa',
      'nota fiscal',
      'nf',
      'cobranca',
      'pagamento',
      'contas',
    ],
    pessoas: [
      'time',
      'pessoas',
      'contratacao',
      'candidato',
      'onboarding',
      'stakeholder',
      'socio',
      'parceiro',
    ],
    diretoria: [
      'diretoria',
      'board',
      'reuniao de diretoria',
      'pauta',
      'ata',
      'conselho',
      'decisao da diretoria',
    ],
    sociedade: [
      'sociedade',
      'socios',
      'socio',
      'equity',
      'cap table',
      'quotas',
      'participacao',
      'acordo de socios',
      'vesting',
      'diluicao',
    ],
  },
}

class AreaRouterService {
  /**
   * Sugere uma área (tag area/<slug>) DENTRO de um workspace.
   * - Não muda o contexto: só organiza dentro dele.
   */
  async suggest(workspaceId: WorkspaceId, text: string): Promise<AreaSuggestion | null> {
    const raw = text || ''
    const explicit = extractExplicitAreaSlug(raw)
    if (explicit) {
      return { slug: explicit, confidence: 'high', reason: 'explicit area/<slug> in text' }
    }

    const content = normalize(raw)
    const map = KEYWORDS[workspaceId] || {}

    // Prefer strong/unique matches by keyword
    for (const [slug, kws] of Object.entries(map)) {
      const normalizedKws = kws.map(normalize)
      if (keywordMatch(content, normalizedKws)) {
        return { slug, confidence: 'medium', reason: `keyword match for ${slug}` }
      }
    }

    return null
  }

  async listAreas(workspaceId: WorkspaceId): Promise<{ slug: string; title: string }[]> {
    const db = getTaxonsDbService()
    if (!db.enabled()) return []
    const items = await db.listByNamespace(workspaceId, 'area')
    return items.map((t) => ({ slug: t.slug, title: t.title }))
  }
}

let instance: AreaRouterService | null = null

export function getAreaRouterService(): AreaRouterService {
  if (!instance) instance = new AreaRouterService()
  return instance
}

export { AreaRouterService }

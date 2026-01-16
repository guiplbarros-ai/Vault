import type { VaultService } from '../services/vault.service.js'

export function cleanObsidianContent(content: string): string {
  return content
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[path|name]] -> name
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // [[name]] -> name
    .replace(/^---[\s\S]*?---\n/m, '') // Remove frontmatter
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^\p{L}\p{N}\s\-_/]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getStopwords(): Set<string> {
  return new Set([
    'a',
    'o',
    'os',
    'as',
    'um',
    'uma',
    'uns',
    'umas',
    'de',
    'do',
    'da',
    'dos',
    'das',
    'no',
    'na',
    'nos',
    'nas',
    'para',
    'pra',
    'por',
    'com',
    'sem',
    'em',
    'e',
    'ou',
    'que',
    'como',
    'qual',
    'quais',
    'quando',
    'onde',
    'porque',
    'por que',
    'porquê',
    'porquê',
    'meu',
    'minha',
    'meus',
    'minhas',
    'seu',
    'sua',
    'seus',
    'suas',
    'hoje',
    'amanha',
    'amanhã',
    'agora',
    'proximo',
    'próximo',
    'proximos',
    'próximos',
    'preciso',
    'quero',
    'ajuda',
    'ajudar',
    'ver',
    'buscar',
    'procure',
    'encontrar',
  ])
}

function expandSynonyms(tokens: string[]): string[] {
  const out = new Set(tokens)
  const map: Record<string, string[]> = {
    biel: ['gabriel'],
    gabriel: ['biel'],
    avaliacao: ['avaliacao', 'avaliacao', 'avd', 'performance', 'desempenho'],
    avd: ['avaliacao', 'desempenho', 'performance'],
    cards: ['card', 'okrs', 'okr'],
    card: ['cards'],
    mt: ['management', 'team'],
    weekly: ['semanal'],
    q1: ['q1', 'quarter1', 'trimestre1'],
    q2: ['q2', 'quarter2', 'trimestre2'],
    q3: ['q3', 'quarter3', 'trimestre3'],
    q4: ['q4', 'quarter4', 'trimestre4'],
  }

  for (const t of tokens) {
    const add = map[t]
    if (add) add.forEach((a) => out.add(a))
  }
  return Array.from(out)
}

function tokenizeQuery(query: string): string[] {
  const q = normalizeText(query)
  const raw = q.split(/\s+/).filter(Boolean)
  const stop = getStopwords()
  const tokens = raw
    .map((t) => t.replace(/^[#@]/, ''))
    .filter((t) => t.length >= 2)
    .filter((t) => !stop.has(t))
  return expandSynonyms(tokens)
}

function getSearchRootsForQuery(tokens: string[]): string[] {
  const workHints = new Set([
    'freelaw',
    'comunidade',
    'financeiro',
    'financas',
    'avaliacao',
    'avd',
    'performance',
    'cards',
    'card',
    'okr',
    'okrs',
    'mt',
    'weekly',
    'pdi',
    'lideranca',
    'liderancas',
    'biel',
    'gabriel',
    'rik',
    'richardson',
    'julia',
    'bianca',
    'amanda',
  ])

  const isWork = tokens.some((t) => workHints.has(t))
  if (isWork) {
    return ['10-AREAS/Profissional/Freelaw', '10-AREAS/Profissional', '30-PROJECTS']
  }
  return ['00-INBOX', '10-AREAS', '20-RESOURCES', '30-PROJECTS']
}

function scorePath(pathStr: string, tokens: string[]): { score: number; reason: string } {
  const p = normalizeText(pathStr)
  let score = 0
  const reasons: string[] = []

  const inFreelaw = p.includes('10-areas/profissional/freelaw')
  if (inFreelaw) {
    score += 25
    reasons.push('freelaw')
  }
  if (p.includes('30-projects')) {
    score += 12
    reasons.push('projects')
  }
  if (p.includes('20-pessoas') || p.includes('pessoas')) {
    score += 10
    reasons.push('pessoas')
  }

  const file = p.split('/').pop() || p
  let fileMatches = 0
  for (const t of tokens) if (t && file.includes(t)) fileMatches++
  if (fileMatches > 0) {
    const add = Math.min(45, fileMatches * 18)
    score += add
    reasons.push(`nome(${fileMatches})`)
  }

  let pathMatches = 0
  for (const t of tokens) {
    if (!t) continue
    if (p.includes(`/${t}`) || p.includes(`${t}-`) || p.includes(`-${t}`) || p.includes(`_${t}`)) {
      pathMatches++
    }
  }
  if (pathMatches > 0) {
    score += Math.min(25, pathMatches * 6)
    reasons.push(`path(${pathMatches})`)
  }

  const q = tokens.find((t) => /^q[1-4]$/.test(t))
  if (q && p.includes(q)) {
    score += 10
    reasons.push(q)
  }
  const year = tokens.find((t) => /^\d{4}$/.test(t))
  if (year && p.includes(year)) {
    score += 6
    reasons.push(year)
  }

  return { score, reason: reasons.join('+') || 'geral' }
}

export function isAmbiguousSearch(
  results: Array<{ path: string; score: number; reason: string }>
): boolean {
  if (results.length <= 1) return false
  const top = results[0]
  const second = results[1]
  if (top.score < 35) return true
  if (second.score >= top.score - 8) return true
  return false
}

export function searchVaultRanked(
  vault: VaultService,
  query: string
): Array<{ path: string; score: number; reason: string }> {
  const tokens = tokenizeQuery(query)
  const results: Array<{ path: string; score: number; reason: string }> = []
  const roots = getSearchRootsForQuery(tokens)

  const seen = new Set<string>()

  const consider = (filePath: string) => {
    if (seen.has(filePath)) return
    seen.add(filePath)
    const { score, reason } = scorePath(filePath, tokens)
    if (score > 0) results.push({ path: filePath, score, reason })
  }

  const search = (folder: string) => {
    try {
      for (const f of vault.listFiles(folder)) {
        consider(`${folder}/${f}`)
      }
      for (const sub of vault.listFolders(folder)) {
        search(`${folder}/${sub}`)
      }
    } catch {
      // ignore
    }
  }

  roots.forEach(search)
  results.sort((a, b) => b.score - a.score)

  if (results.length === 0) {
    const fallback: string[] = []
    const terms = normalizeText(query).split(/\s+/).filter(Boolean)
    const search2 = (folder: string) => {
      try {
        for (const f of vault.listFiles(folder)) {
          const filePath = `${folder}/${f}`
          const fileName = normalizeText(f)
          if (terms.some((t) => fileName.includes(t))) {
            fallback.push(filePath)
            continue
          }
          if (f.endsWith('.md') && terms.length > 1) {
            const content = vault.readFile(filePath)
            if (content) {
              const cl = normalizeText(content)
              if (terms.every((t) => cl.includes(t))) fallback.push(filePath)
            }
          }
        }
        for (const sub of vault.listFolders(folder)) search2(`${folder}/${sub}`)
      } catch {
        /* ignore */
      }
    }
    ;['00-INBOX', '10-AREAS', '20-RESOURCES', '30-PROJECTS'].forEach(search2)
    return fallback.slice(0, 10).map((p) => ({ path: p, score: 1, reason: 'fallback' }))
  }

  const top = results.slice(0, 8)
  for (const r of top) {
    try {
      const content = vault.readFile(r.path)
      if (!content) continue
      const cl = normalizeText(content)
      let hits = 0
      for (const t of tokens) if (t && cl.includes(t)) hits++
      if (hits > 0) {
        r.score += Math.min(30, hits * 4)
        r.reason += `+conteudo(${hits})`
      }
    } catch {
      /* ignore */
    }
  }
  results.sort((a, b) => b.score - a.score)
  return results.slice(0, 20)
}

import { getGoogleAuthService } from '../../services/google-auth.service.js'
import { getGoogleDriveService } from '../../services/google-drive.service.js'
import type { AgentTool } from '../types.js'
import { resolveGoogleAccounts, resolveGoogleMutatingAccount } from './google-context.js'

const LOCAL_ACCOUNT = '__local__'

function firstNonEmpty(...vals: Array<string | undefined | null>): string {
  for (const v of vals) {
    const s = (v ?? '').toString()
    if (s.trim()) return s.trim()
  }
  return ''
}

function toAccountEmail(account: string): string | null {
  return account === LOCAL_ACCOUNT ? null : account
}

function labelAccount(account: string): string {
  return account === LOCAL_ACCOUNT ? '(local)' : account
}

function normalizeAccountHint(raw: string | undefined | null): string | null {
  const v = (raw || '').toLowerCase().trim()
  if (!v) return null
  if (v === 'local' || v === '(local)' || v === LOCAL_ACCOUNT) return LOCAL_ACCOUNT
  return v
}

async function ensureGoogleAccounts(
  chatId: number
): Promise<{ workspaceId: string; accounts: string[] }> {
  const { workspaceId, accountEmails } = await resolveGoogleAccounts(chatId)
  // Local token file can exist even when Supabase accounts exist.
  let localOk = false
  try {
    const auth = getGoogleAuthService(workspaceId, null)
    localOk = auth.isAuthenticated()
    if (!localOk) {
      await auth.getValidAccessToken()
      localOk = true
    }
  } catch {
    localOk = false
  }

  try {
    await getGoogleAuthService(workspaceId, accountEmails[0]).getValidAccessToken()
  } catch {
    // ignore
  }
  const merged = [...(localOk ? [LOCAL_ACCOUNT] : []), ...accountEmails]
  // de-dup preserve order
  return { workspaceId, accounts: Array.from(new Set(merged)) }
}

async function ensureGoogleMutatingAccount(
  chatId: number,
  override?: string | null
): Promise<{ workspaceId: string; account: string | null; accounts: string[] }> {
  const { workspaceId, accounts } = await ensureGoogleAccounts(chatId)
  if (!accounts.length) return { workspaceId, account: null, accounts: [] }

  // Local mode: there is only one effective account (token file), so it's never ambiguous.
  if (accounts.length === 1 && accounts[0] === LOCAL_ACCOUNT) {
    return { workspaceId, account: LOCAL_ACCOUNT, accounts }
  }

  const o = normalizeAccountHint(override)
  if (o && accounts.includes(o)) return { workspaceId, account: o, accounts }

  const mut = await resolveGoogleMutatingAccount(chatId)
  if (mut.accountEmail)
    return { workspaceId: mut.workspaceId, account: mut.accountEmail, accounts: mut.accountEmails }
  return { workspaceId: mut.workspaceId, account: null, accounts: mut.accountEmails }
}

function normMode(raw: string | undefined): 'dry_run' | 'apply' {
  const v = (raw || '').toLowerCase().trim()
  return v === 'apply' ? 'apply' : 'dry_run'
}

function isFolderMime(mimeType?: string): boolean {
  return mimeType === 'application/vnd.google-apps.folder'
}

export function createDriveListTool(): AgentTool {
  return {
    name: 'DRIVE_LIST',
    description: 'Lista arquivos/pastas no Google Drive. Use query (q) ou folderId.',
    async execute(params, ctx) {
      const maxRaw = firstNonEmpty(params.max, params['max'])
      const max = maxRaw ? Math.max(1, Math.min(200, Number.parseInt(maxRaw, 10))) : 30
      const q0 = firstNonEmpty(params.q, params.query).trim()
      const folderId = firstNonEmpty((params as any).folderId, (params as any).folderid).trim()
      const orderBy =
        firstNonEmpty((params as any).orderBy, (params as any).orderby).trim() ||
        'modifiedTime desc'
      const accountHint = normalizeAccountHint(firstNonEmpty((params as any).account))

      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const q = q0
        ? q0
        : folderId
          ? `'${folderId.replace(/'/g, "\\'")}' in parents and trashed=false`
          : 'trashed=false'

      const targetAccounts = accountHint ? accounts.filter((a) => a === accountHint) : accounts
      if (accountHint && targetAccounts.length === 0) {
        return `Conta inválida para DRIVE_LIST: ${params.account}\nContas disponíveis: ${accounts.map(labelAccount).join(', ')}`
      }

      const perAccount = await Promise.all(
        targetAccounts.map(async (acc) => {
          try {
            const drive = getGoogleDriveService(workspaceId, toAccountEmail(acc))
            const res = await drive.listFiles({
              q,
              pageSize: Math.min(100, max),
              orderBy,
              fields: 'files(id,name,mimeType,parents,trashed,webViewLink)',
            })
            const files = (res.files || []).slice(0, max)
            const lines = files
              .map((f) => {
                const kind = isFolderMime(f.mimeType) ? '📁' : '📄'
                return `• ${kind} ${f.name} | id=${f.id}`
              })
              .join('\n')
            return {
              acc: labelAccount(acc),
              ok: true as const,
              count: files.length,
              lines: lines || '• (nenhum resultado)',
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            return {
              acc: labelAccount(acc),
              ok: false as const,
              count: 0,
              lines: `• ❌ erro: ${msg.slice(0, 280)}`,
            }
          }
        })
      )

      const out = perAccount.map((x) => `=== ${x.acc} ===\n${x.lines}`).join('\n\n')
      ctx.appendInternalData(`DRIVE_LIST(q="${q}")`, out)
      const total = perAccount.reduce((s, x) => s + x.count, 0)
      // Return the list (needed for mapping IDs)
      return `📂 DRIVE LIST (q="${q}", max=${max})\n\n${out}\n\nTotal: ${total}`
    },
  }
}

export function createDriveCreateFolderTool(): AgentTool {
  return {
    name: 'DRIVE_CREATE_FOLDER',
    description:
      'Cria uma pasta no Google Drive (ação mutável). No pool pessoal, exige conta ativa.',
    async execute(params, ctx) {
      const name = firstNonEmpty(params.name).trim()
      const parentId =
        firstNonEmpty((params as any).parentId, (params as any).parentid).trim() || null
      if (!name) return 'Parâmetro obrigatório: name'

      const { workspaceId, account, accounts } = await ensureGoogleMutatingAccount(
        ctx.chatId,
        firstNonEmpty((params as any).account) || null
      )
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'
      if (!account) {
        return `Ação ambígua no modo pessoal (pool).\nDefina a conta ativa: [EXECUTE:GOOGLE_SET_ACCOUNT]email: <conta>[/EXECUTE]`
      }

      const drive = getGoogleDriveService(workspaceId, toAccountEmail(account))
      const folder = await drive.createFolder({ name, parentId })
      ctx.appendInternalData(
        'DRIVE_CREATE_FOLDER',
        `account=${account}\nname=${name}\nfolderId=${folder.id}`
      )
      return `✅ Pasta criada: "${folder.name}" (id: ${folder.id}) via ${labelAccount(account)}`
    },
  }
}

export function createDriveRenameTool(): AgentTool {
  return {
    name: 'DRIVE_RENAME',
    description: 'Renomeia arquivo/pasta por id (ação mutável).',
    async execute(params, ctx) {
      const id = firstNonEmpty(params.id).trim()
      const name = firstNonEmpty(params.name).trim()
      if (!id) return 'Parâmetro obrigatório: id'
      if (!name) return 'Parâmetro obrigatório: name'

      const { workspaceId, account, accounts } = await ensureGoogleMutatingAccount(
        ctx.chatId,
        firstNonEmpty((params as any).account) || null
      )
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'
      if (!account) {
        return `Ação ambígua no modo pessoal (pool).\nDefina a conta ativa: [EXECUTE:GOOGLE_SET_ACCOUNT]email: <conta>[/EXECUTE]`
      }

      const drive = getGoogleDriveService(workspaceId, toAccountEmail(account))
      const before = await drive.getFile(id, 'id,name,mimeType,parents,trashed,webViewLink')
      if (before.trashed)
        return 'Este item está na lixeira (trashed=true). Recupere no Drive antes de renomear.'
      const after = await drive.rename(id, name)
      ctx.appendInternalData(
        'DRIVE_RENAME',
        `account=${account}\nid=${id}\nfrom=${before.name}\nto=${after.name}`
      )
      return `✅ Renomeado: "${before.name}" → "${after.name}"`
    },
  }
}

export function createDriveMoveTool(): AgentTool {
  return {
    name: 'DRIVE_MOVE',
    description:
      'Move arquivo/pasta entre pastas. Requer id e toParentId; fromParentId é recomendado.',
    async execute(params, ctx) {
      const id = firstNonEmpty(params.id).trim()
      const toParentId = firstNonEmpty(
        (params as any).toParentId,
        (params as any).toparentid
      ).trim()
      const fromParentId =
        firstNonEmpty((params as any).fromParentId, (params as any).fromparentid).trim() ||
        undefined
      if (!id) return 'Parâmetro obrigatório: id'
      if (!toParentId) return 'Parâmetro obrigatório: toParentId'

      const { workspaceId, account, accounts } = await ensureGoogleMutatingAccount(
        ctx.chatId,
        firstNonEmpty((params as any).account) || null
      )
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'
      if (!account) {
        return `Ação ambígua no modo pessoal (pool).\nDefina a conta ativa: [EXECUTE:GOOGLE_SET_ACCOUNT]email: <conta>[/EXECUTE]`
      }

      const drive = getGoogleDriveService(workspaceId, toAccountEmail(account))
      const before = await drive.getFile(id, 'id,name,mimeType,parents,trashed,webViewLink')
      if (before.trashed)
        return 'Este item está na lixeira (trashed=true). Recupere no Drive antes de mover.'

      const removeParents = fromParentId
        ? fromParentId
        : before.parents && before.parents.length
          ? before.parents.join(',')
          : undefined

      const after = await drive.move(id, { addParents: toParentId, removeParents })
      ctx.appendInternalData(
        'DRIVE_MOVE',
        `account=${account}\nid=${id}\nname=${before.name}\nparents_before=${(before.parents || []).join(',')}\nparents_after=${(after.parents || []).join(',')}`
      )
      return `✅ Movido: "${before.name}" (id=${id})`
    },
  }
}

export function createDriveReadTextTool(): AgentTool {
  return {
    name: 'DRIVE_READ_TEXT',
    description: 'Lê um Google Doc (exporta para texto) por id e salva no contexto interno.',
    async execute(params, ctx) {
      const id = firstNonEmpty(params.id).trim()
      if (!id) return 'Parâmetro obrigatório: id'

      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'

      // Pool: prefer first account; se falhar, tenta as demais.
      let lastErr: unknown = null
      for (const acc of accounts) {
        try {
          const drive = getGoogleDriveService(workspaceId, toAccountEmail(acc))
          const meta = await drive.getFile(id, 'id,name,mimeType,trashed,webViewLink')
          if (meta.trashed)
            return 'Este item está na lixeira (trashed=true). Recupere no Drive antes de ler.'

          const text = await drive.exportAsText(id)
          const clipped = text.length > 6000 ? `${text.slice(0, 6000)}\n\n[...truncado]` : text
          ctx.appendInternalData(`DRIVE_READ_TEXT("${meta.name}")`, clipped)
          return `✅ Texto carregado: "${meta.name}"`
        } catch (e) {
          lastErr = e
        }
      }
      return `Não consegui ler o documento (talvez não seja um Google Doc exportável como texto). Erro: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
    },
  }
}

export function createDriveCleanEmptyFoldersTool(): AgentTool {
  return {
    name: 'DRIVE_CLEAN_EMPTY_FOLDERS',
    description:
      'Encontra pastas vazias dentro de folderId. Por padrão faz dry-run. Opcionalmente move pastas vazias para uma pasta de quarentena ou coloca na lixeira (apenas pastas).',
    async execute(params, ctx) {
      const folderId = firstNonEmpty((params as any).folderId, (params as any).folderid).trim()
      if (!folderId) return 'Parâmetro obrigatório: folderId (pasta raiz para varrer)'

      const mode = normMode(firstNonEmpty((params as any).mode))
      const maxDepthRaw = firstNonEmpty((params as any).maxDepth, (params as any).maxdepth)
      const maxDepth = maxDepthRaw ? Math.max(0, Math.min(10, Number.parseInt(maxDepthRaw, 10))) : 2
      const quarantineName = firstNonEmpty(
        (params as any).quarantineName,
        (params as any).quarantinename,
        '🧹 _Empty Folders (quarentena)'
      ).trim()
      const trash =
        firstNonEmpty((params as any).trash)
          .toLowerCase()
          .trim() === 'true'

      const { workspaceId, account, accounts } = await ensureGoogleMutatingAccount(
        ctx.chatId,
        firstNonEmpty((params as any).account) || null
      )
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'
      if (!account) {
        return `Ação ambígua no modo pessoal (pool).\nDefina a conta ativa: [EXECUTE:GOOGLE_SET_ACCOUNT]email: <conta>[/EXECUTE]`
      }

      const drive = getGoogleDriveService(workspaceId, toAccountEmail(account))

      // BFS até maxDepth, só por pastas
      const queue: Array<{ id: string; depth: number }> = [{ id: folderId, depth: 0 }]
      const emptyFolders: Array<{ id: string; name: string; parentId?: string }> = []

      while (queue.length) {
        const cur = queue.shift()!
        const children = await drive.listChildren(cur.id, 200)
        const items = children.files || []
        const childFolders = items.filter((f) => isFolderMime(f.mimeType) && !f.trashed)

        // pasta vazia = sem filhos não-trashed
        if (cur.depth > 0 && items.length === 0) {
          const meta = await drive.getFile(cur.id, 'id,name,mimeType,parents,trashed')
          if (isFolderMime(meta.mimeType) && !meta.trashed) {
            emptyFolders.push({ id: meta.id, name: meta.name, parentId: meta.parents?.[0] })
          }
          continue
        }

        if (cur.depth < maxDepth) {
          for (const f of childFolders) queue.push({ id: f.id, depth: cur.depth + 1 })
        }
      }

      if (emptyFolders.length === 0)
        return `✅ Nenhuma pasta vazia encontrada (maxDepth=${maxDepth}).`

      const plan = emptyFolders
        .slice(0, 200)
        .map((f) => `• ${f.name} | id=${f.id}`)
        .join('\n')
      ctx.appendInternalData('DRIVE_CLEAN_EMPTY_FOLDERS(plan)', plan)

      if (mode === 'dry_run') {
        return `🧪 Dry-run: encontrei ${emptyFolders.length} pasta(s) vazia(s). Para aplicar: mode=apply (e opcionalmente trash=true).`
      }

      // Apply: por padrão move pra quarentena; opcionalmente trashed=true (apenas pastas vazias)
      let quarantineId: string | null = null
      if (!trash) {
        // tenta achar quarentena dentro da própria pasta raiz; se não existir, cria
        const existing = await drive.listFiles({
          q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder' and name='${quarantineName.replace(/'/g, "\\'")}'`,
          pageSize: 10,
          fields: 'files(id,name,mimeType,parents)',
        })
        quarantineId = existing.files?.[0]?.id || null
        if (!quarantineId) {
          const created = await drive.createFolder({ name: quarantineName, parentId: folderId })
          quarantineId = created.id
        }
      }

      let moved = 0
      let trashedCount = 0
      for (const f of emptyFolders) {
        // revalida que ainda está vazia antes de agir
        const nowChildren = await drive.listChildren(f.id, 1)
        if ((nowChildren.files || []).length > 0) continue
        const meta = await drive.getFile(f.id, 'id,name,mimeType,parents,trashed')
        if (!isFolderMime(meta.mimeType) || meta.trashed) continue

        if (trash) {
          await drive.trashFolder(f.id)
          trashedCount += 1
          continue
        }

        if (quarantineId) {
          const removeParents = (meta.parents || []).join(',')
          await drive.move(f.id, {
            addParents: quarantineId,
            removeParents: removeParents || undefined,
          })
          moved += 1
        }
      }

      return trash
        ? `✅ Apliquei: ${trashedCount} pasta(s) vazia(s) foram para a lixeira (somente pastas).`
        : `✅ Apliquei: movi ${moved} pasta(s) vazia(s) para "${quarantineName}".`
    },
  }
}

type OrgDecision = { fileId: string; name: string; destFolderName: string; destFolderId?: string }

function normalizeNameForMatch(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickYear(name: string): '2023' | '2024' | '2025' | null {
  const m = name.match(/\b(2023|2024|2025)\b/)
  return (m?.[1] as any) || null
}

function classifyAlluFile(name0: string): { bucket: string; year?: '2023' | '2024' | '2025' } {
  const name = normalizeNameForMatch(name0)

  // Investor-facing models/policies first (avoid falling into generic legal buckets)
  if (name.includes('working model'))
    return { bucket: '50 - Investidores/30 - Modelos Financeiros' }
  if (name.includes('unit economics'))
    return { bucket: '50 - Investidores/30 - Modelos Financeiros' }
  if (name.includes('pitch deck')) return { bucket: '50 - Investidores/10 - Pitch Deck' }
  // Some files come mangled from encoding (ex: "poliÃ__tica"). Catch loosely.
  const looksLikePolitica =
    name.includes('politica') ||
    name.includes('policy') ||
    name.includes('risco') ||
    name.includes('credito') ||
    ((name.includes('pol') || name.includes('poli')) && name.includes('tica'))
  if (looksLikePolitica) return { bucket: '50 - Investidores/20 - Políticas' }

  if (name.endsWith('.zip') || name.includes('clicksign'))
    return { bucket: '20 - Jurídico/20 - Assinaturas (Clicksign)' }

  if (name.includes('organograma'))
    return { bucket: '10 - Societário/30 - Organograma & Governança' }
  if (name.includes('alteracao contratual') || name.includes('jucemg'))
    return { bucket: '10 - Societário/10 - Alterações Contratuais' }
  if (name.includes('cessao') || name.includes('quota') || name.includes('quotas'))
    return { bucket: '10 - Societário/20 - Quotas (Cessões)' }

  if (name.includes('nda')) return { bucket: '20 - Jurídico/30 - Modelos' }
  if (name.includes('contrato') || name.includes('mutuo') || name.includes('termo'))
    return { bucket: '20 - Jurídico/10 - Contratos' }

  if (
    name.includes('balancete') ||
    name.includes('balanco') ||
    name.includes('balanço') ||
    name.includes('dre') ||
    name.includes('demonstrativos') ||
    name.includes('auditoria') ||
    name.includes('kpmg') ||
    name.includes('rsm')
  ) {
    return { bucket: '40 - Contábil', year: pickYear(name) || '2024' }
  }

  if (name.includes('fluxo de caixa')) return { bucket: '30 - Financeiro/10 - Fluxo de Caixa' }
  if (name.includes('faturamento')) return { bucket: '30 - Financeiro/20 - Receitas (Faturamento)' }
  if (name.includes('endividamento') || name.includes('juros') || name.includes('principal'))
    return { bucket: '30 - Financeiro/30 - Dívidas' }
  if (
    name.includes('fechamento') ||
    name.includes('apuracao') ||
    name.includes('apuração') ||
    name.includes('backup sap')
  )
    return { bucket: '30 - Financeiro/40 - Fechamentos' }
  if (name.includes('simulacao') || name.includes('simulação'))
    return { bucket: '50 - Investidores/30 - Modelos Financeiros' }
  if (
    name.includes('bp ') ||
    name.includes('bp-') ||
    name.includes('bp -') ||
    name.includes('financials')
  )
    return { bucket: '50 - Investidores/30 - Modelos Financeiros' }

  if (name.includes('status report')) return { bucket: '60 - Relatórios/10 - Status Reports' }
  if (name.includes('management report'))
    return { bucket: '60 - Relatórios/20 - Management Reports' }
  if (name.includes('report')) return { bucket: '60 - Relatórios/30 - Outros' }

  return { bucket: '00 - Inbox' }
}

async function ensureFolderByName(
  drive: ReturnType<typeof getGoogleDriveService>,
  parentId: string,
  folderName: string
): Promise<string> {
  const nameEsc = folderName.replace(/'/g, "\\'")
  const q = `'${parentId.replace(/'/g, "\\'")}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder' and name='${nameEsc}'`
  const existing = await drive.listFiles({
    q,
    pageSize: 10,
    fields: 'files(id,name,mimeType,parents,trashed)',
  })
  const id = existing.files?.[0]?.id
  if (id) return id
  const created = await drive.createFolder({ name: folderName, parentId })
  return created.id
}

async function ensurePath(
  drive: ReturnType<typeof getGoogleDriveService>,
  rootId: string,
  pathStr: string
): Promise<string> {
  const parts = pathStr
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)
  let cur = rootId
  for (const p of parts) {
    cur = await ensureFolderByName(drive, cur, p)
  }
  return cur
}

export function createDriveOrganizeAlluTool(): AgentTool {
  return {
    name: 'DRIVE_ORGANIZE_ALLU',
    description:
      'Organiza a pasta "Allu" (ou equivalente) criando subpastas e movendo arquivos por regras de nome.',
    async execute(params, ctx) {
      const folderId = firstNonEmpty((params as any).folderId, (params as any).folderid).trim()
      const mode = normMode(firstNonEmpty((params as any).mode))
      if (!folderId) return 'Parâmetro obrigatório: folderId'

      const { workspaceId, account, accounts } = await ensureGoogleMutatingAccount(
        ctx.chatId,
        firstNonEmpty((params as any).account) || null
      )
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'
      if (!account) {
        return `Ação ambígua no modo pessoal (pool).\nDefina a conta ativa: [EXECUTE:GOOGLE_SET_ACCOUNT]email: <conta>[/EXECUTE]`
      }

      const drive = getGoogleDriveService(workspaceId, toAccountEmail(account))

      // List children (files + folders) of the Allu folder.
      const children = await drive.listChildren(folderId, 200)
      const items = (children.files || []).filter((x) => !x.trashed)

      const files = items.filter((x) => !isFolderMime(x.mimeType))
      if (files.length === 0) return 'Nada para organizar (nenhum arquivo encontrado na pasta).'

      const decisions: OrgDecision[] = []
      for (const f of files) {
        const c = classifyAlluFile(f.name || '')
        const destPath = c.bucket === '40 - Contábil' ? `${c.bucket}/${c.year || '2024'}` : c.bucket
        decisions.push({ fileId: f.id, name: f.name, destFolderName: destPath })
      }

      // Ensure destination folders exist and map to ids (cache).
      const folderCache = new Map<string, string>()
      const ensureDest = async (destPath: string) => {
        if (folderCache.has(destPath)) return folderCache.get(destPath)!
        const id = await ensurePath(drive, folderId, destPath)
        folderCache.set(destPath, id)
        return id
      }

      const planLines: string[] = []
      for (const d of decisions) {
        planLines.push(`• ${d.name}  →  ${d.destFolderName}`)
      }
      const plan = planLines.slice(0, 400).join('\n')
      ctx.appendInternalData('DRIVE_ORGANIZE_ALLU(plan)', plan)

      if (mode === 'dry_run') {
        return `🧪 Dry-run: ${decisions.length} arquivo(s) seriam movidos dentro da pasta Allu.\n\n${planLines.slice(0, 60).join('\n')}${decisions.length > 60 ? '\n…' : ''}`
      }

      let moved = 0
      const errors: string[] = []
      for (const d of decisions) {
        try {
          const destId = await ensureDest(d.destFolderName)
          await drive.move(d.fileId, { addParents: destId, removeParents: folderId })
          moved += 1
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          errors.push(`${d.name}: ${msg.slice(0, 200)}`)
        }
      }

      const errBlock = errors.length
        ? `\n\nErros (${errors.length}):\n- ${errors.slice(0, 12).join('\n- ')}${errors.length > 12 ? '\n- …' : ''}`
        : ''
      return `✅ Organizei a pasta Allu: movi ${moved}/${decisions.length} arquivo(s).${errBlock}`
    },
  }
}

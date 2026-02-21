'use client'

/**
 * Pluggy Open Finance Settings Section
 *
 * Connect bank accounts via Pluggy Connect widget and sync data.
 */

import { SettingsCard } from '@/components/settings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  pluggySyncService,
  type FullSyncResult,
  type SyncStatus,
} from '@/lib/services/pluggy-sync.service'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PluggyConnect } from 'react-pluggy-connect'

export function PluggySection() {
  const [itemId, setItemId] = useState('')
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<FullSyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')

  // Pluggy Connect widget state
  const [connectToken, setConnectToken] = useState<string | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(false)
  const [showWidget, setShowWidget] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)

  // Load saved item ID and sync status on mount
  useEffect(() => {
    const savedItemId = pluggySyncService.getItemId()
    if (savedItemId) setItemId(savedItemId)
    setStatus(pluggySyncService.getSyncStatus())
  }, [])

  // Fetch connect token for the widget
  const fetchConnectToken = useCallback(async () => {
    setIsLoadingToken(true)
    setConnectError(null)
    try {
      const response = await fetch('/api/pluggy/connect-token', { method: 'POST' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (data.error === 'PLUGGY_AUTH_ERROR') {
          throw new Error('PLUGGY_AUTH_ERROR')
        }
        throw new Error(data.message || `HTTP ${response.status}`)
      }
      const data = await response.json()
      setConnectToken(data.accessToken)
      setShowWidget(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar token'
      setConnectError(message)
    } finally {
      setIsLoadingToken(false)
    }
  }, [])

  // Widget callbacks
  const handleConnectSuccess = useCallback(async (data: { item: { id: string } }) => {
    const newItemId = data.item.id
    setItemId(newItemId)
    pluggySyncService.setItemId(newItemId)
    setShowWidget(false)
    setConnectToken(null)
    setStatus(pluggySyncService.getSyncStatus())

    // Auto-sync after connecting
    setIsSyncing(true)
    setSyncError(null)
    setSyncResult(null)

    pluggySyncService.setProgressCallback(({ phase }) => {
      setProgress(phase)
    })

    try {
      const result = await pluggySyncService.fullSync(newItemId)
      setSyncResult(result)
      setStatus(pluggySyncService.getSyncStatus())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setSyncError(message)
    } finally {
      setIsSyncing(false)
      setProgress('')
    }
  }, [])

  const handleConnectError = useCallback((error: { message: string }) => {
    setConnectError(error.message)
    setShowWidget(false)
    setConnectToken(null)
  }, [])

  const handleConnectClose = useCallback(() => {
    setShowWidget(false)
    setConnectToken(null)
  }, [])

  const handleSaveItemId = useCallback(() => {
    pluggySyncService.setItemId(itemId.trim())
    setStatus(pluggySyncService.getSyncStatus())
  }, [itemId])

  const handleSync = useCallback(async () => {
    const currentItemId = itemId.trim() || pluggySyncService.getItemId()
    if (!currentItemId) {
      setSyncError('Conecte uma conta bancaria primeiro')
      return
    }

    setIsSyncing(true)
    setSyncError(null)
    setSyncResult(null)

    pluggySyncService.setProgressCallback(({ phase }) => {
      setProgress(phase)
    })

    try {
      const result = await pluggySyncService.fullSync(currentItemId)
      setSyncResult(result)
      setStatus(pluggySyncService.getSyncStatus())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setSyncError(message)
    } finally {
      setIsSyncing(false)
      setProgress('')
    }
  }, [itemId])

  const totalSynced = syncResult
    ? syncResult.accounts.created + syncResult.accounts.updated +
      syncResult.transactions.created + syncResult.transactions.updated +
      syncResult.creditCards.created + syncResult.creditCards.updated +
      syncResult.investments.created + syncResult.investments.updated
    : 0

  const hasConnection = !!itemId.trim()

  return (
    <div className="space-y-6">
      {/* Connect Bank Account */}
      <SettingsCard
        title="Conectar Conta Bancaria"
        description="Conecte suas contas via Open Finance para importar dados automaticamente"
      >
        <div className="space-y-4">
          {hasConnection && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Landmark className="w-3 h-3 mr-1" />
                Conectado
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {itemId.slice(0, 8)}...
              </span>
              {status?.lastSync && (
                <span className="text-xs text-muted-foreground">
                  Sync: {new Date(status.lastSync).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          )}

          <Button
            onClick={fetchConnectToken}
            disabled={isLoadingToken || showWidget}
            variant={hasConnection ? 'outline' : 'default'}
            className="w-full"
          >
            {isLoadingToken ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Preparando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {hasConnection ? 'Conectar Outra Conta' : 'Conectar Conta Bancaria'}
              </>
            )}
          </Button>

          {connectError && (
            connectError.includes('PLUGGY_AUTH_ERROR') || connectError.includes('PLUGGY_TRIAL_EXPIRED') ? (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                    Período de teste do Pluggy expirado
                  </p>
                  <p className="text-muted-foreground">
                    Não é possível conectar novas contas. Seus dados existentes continuam disponíveis.
                  </p>
                  <a
                    href="https://www.pluggy.ai/en/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Ver planos do Pluggy →
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{connectError}</span>
              </div>
            )
          )}

          {/* Manual Item ID fallback */}
          <div>
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${showManualInput ? 'rotate-180' : ''}`} />
              Inserir Item ID manualmente
            </button>

            {showManualInput && (
              <div className="mt-2 space-y-2">
                <Label htmlFor="pluggy-item-id">Item ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="pluggy-item-id"
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    placeholder="Ex: 3b4309ba-7afb-46e5-..."
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={handleSaveItemId}
                    disabled={!itemId.trim()}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* Sync Controls — only show when connected */}
      {hasConnection && (
        <SettingsCard
          title="Sincronizacao"
          description="Buscar dados atualizados das suas contas bancarias"
        >
          <div className="space-y-4">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progress || 'Sincronizando...'}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar Agora
                </>
              )}
            </Button>

            {syncError && (
              syncError.includes('PLUGGY_TRIAL_EXPIRED') ? (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">
                      Período de teste do Pluggy expirado
                    </p>
                    <p className="text-muted-foreground">
                      Seus dados existentes continuam disponíveis normalmente.
                      Para continuar sincronizando dados do banco automaticamente,
                      é necessário contratar um plano.
                    </p>
                    <a
                      href="https://www.pluggy.ai/en/pricing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      Ver planos do Pluggy →
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{syncError}</span>
                </div>
              )
            )}

            {syncResult && (
              <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium">
                    Sync concluido em {(syncResult.duration_ms / 1000).toFixed(1)}s
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <SyncResultRow label="Instituicoes" result={syncResult.institutions} />
                  <SyncResultRow label="Contas" result={syncResult.accounts} />
                  <SyncResultRow label="Transacoes" result={syncResult.transactions} />
                  <SyncResultRow label="Cartoes" result={syncResult.creditCards} />
                  <SyncResultRow label="Investimentos" result={syncResult.investments} />
                </div>

                <p className="text-xs text-muted-foreground">
                  Total: {totalSynced} registros sincronizados
                </p>

                {Object.values(syncResult).some(
                  (r) => typeof r === 'object' && r !== null && 'errors' in r && (r as any).errors?.length > 0
                ) && (
                  <div className="text-xs text-amber-600 space-y-1">
                    <p className="font-medium">Avisos:</p>
                    {[
                      ...syncResult.institutions.errors,
                      ...syncResult.accounts.errors,
                      ...syncResult.transactions.errors,
                      ...syncResult.creditCards.errors,
                      ...syncResult.investments.errors,
                    ].map((err, i) => (
                      <p key={i}>- {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </SettingsCard>
      )}

      {/* Pluggy Connect Widget (renders as modal overlay) */}
      {showWidget && connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox={true}
          onSuccess={handleConnectSuccess}
          onError={handleConnectError}
          onClose={handleConnectClose}
          countries={['BR']}
          language="pt"
        />
      )}
    </div>
  )
}

function SyncResultRow({
  label,
  result,
}: {
  label: string
  result: { created: number; updated: number; skipped: number }
}) {
  const total = result.created + result.updated
  if (total === 0 && result.skipped === 0) return null

  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        {result.created > 0 && <span className="text-green-600">+{result.created}</span>}
        {result.updated > 0 && (
          <span className="text-blue-600 ml-1">{'\u2191'}{result.updated}</span>
        )}
        {result.skipped > 0 && (
          <span className="text-muted-foreground ml-1">({result.skipped} dup)</span>
        )}
      </span>
    </>
  )
}

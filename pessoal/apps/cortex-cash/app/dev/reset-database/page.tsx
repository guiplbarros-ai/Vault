'use client'

/**
 * Página de desenvolvimento para reset completo do banco de dados
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resetDatabase } from '@/lib/db/initialize'
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function ResetDatabasePage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const handleReset = async () => {
    if (!confirmed) {
      setError('Você deve confirmar que deseja resetar o banco')
      return
    }

    setLoading(true)
    setSuccess(false)
    setError(null)

    try {
      console.log('🔄 Iniciando reset completo do banco de dados...')
      await resetDatabase()
      console.log('✅ Reset completado com sucesso!')
      setSuccess(true)
      setConfirmed(false)

      // Redirecionar para home após 2 segundos
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('❌ Erro ao resetar:', message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Reset Completo do Banco</h1>
          <p className="text-slate-400">Limpa todos os dados e reinicializa o banco de dados</p>
        </div>

        {/* Warning Card */}
        <Alert className="border-orange-500/50 bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-500">Atenção!</AlertTitle>
          <AlertDescription className="text-orange-200">
            Esta ação é <strong>irreversível</strong>. Todos os dados serão permanentemente
            deletados:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Contas bancárias</li>
              <li>Transações</li>
              <li>Categorias personalizadas</li>
              <li>Tags</li>
              <li>Regras de classificação</li>
              <li>Tudo mais</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Reset Card */}
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">Confirmar Reset</CardTitle>
            <CardDescription>
              O banco será completamente resetado e reinicializado com dados padrão
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error */}
            {error && (
              <Alert className="border-red-500/50 bg-red-950/20">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertTitle className="text-red-500">Erro</AlertTitle>
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}

            {/* Success */}
            {success && (
              <Alert className="border-green-500/50 bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-500">Sucesso!</AlertTitle>
                <AlertDescription className="text-green-200">
                  Banco resetado com sucesso. Redirecionando para home...
                </AlertDescription>
              </Alert>
            )}

            {/* Confirmation Checkbox */}
            {!success && (
              <div className="flex items-start space-x-3 p-4 bg-red-950/30 rounded-lg border border-red-500/30">
                <input
                  type="checkbox"
                  id="confirm"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1"
                  disabled={loading}
                />
                <label htmlFor="confirm" className="text-sm text-slate-300 cursor-pointer">
                  Eu entendo que isto vai deletar todos os dados permanentemente e desejo continuar
                </label>
              </div>
            )}

            {/* Reset Button */}
            {!success && (
              <Button
                onClick={handleReset}
                disabled={!confirmed || loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Resetando...' : 'Resetar Banco de Dados'}
              </Button>
            )}

            {/* Info Text */}
            <p className="text-xs text-slate-400 text-center">
              O reset limpará o localStorage e todas as tabelas do IndexedDB, depois reinicializará
              com dados padrão.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

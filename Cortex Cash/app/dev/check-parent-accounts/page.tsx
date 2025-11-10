'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { contaService } from '@/lib/services/conta.service'
import type { Conta } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export default function CheckParentAccountsPage() {
  const [accounts, setAccounts] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const data = await contaService.listContas({ incluirInativas: true })
      setAccounts(data)
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Debug: Parent Account Links"
          description="Verificação de vínculos entre contas"
          actions={
            <Button
              onClick={loadAccounts}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recarregar
            </Button>
          }
        />

        <div className="space-y-4">
          {accounts.map((account) => {
            const parentAccount = accounts.find(a => a.id === account.conta_pai_id)

            return (
              <Card
                key={account.id}
                style={{
                  background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                  backgroundColor: '#3B5563',
                }}
              >
                <CardHeader>
                  <CardTitle className="text-white">{account.nome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm font-mono">
                  <div className="text-white/80">
                    <strong className="text-white">ID:</strong> {account.id}
                  </div>
                  <div className="text-white/80">
                    <strong className="text-white">Tipo:</strong> {account.tipo}
                  </div>
                  <div className="text-white/80">
                    <strong className="text-white">Cor:</strong>
                    <span className="ml-2 inline-block w-6 h-6 rounded border border-white/20" style={{ backgroundColor: account.cor || '#gray' }}></span>
                    <span className="ml-2">{account.cor || 'undefined'}</span>
                  </div>
                  <div className="text-white/80">
                    <strong className="text-white">conta_pai_id:</strong> {account.conta_pai_id || 'undefined'}
                  </div>
                  {parentAccount && (
                    <div className="mt-2 p-3 bg-green-500/20 border border-green-500/30 rounded">
                      <strong className="text-green-300">✅ Vinculado a:</strong>
                      <div className="ml-4 mt-1 text-green-200">
                        <div>Nome: {parentAccount.nome}</div>
                        <div>Tipo: {parentAccount.tipo}</div>
                        <div>Cor: {parentAccount.cor}</div>
                      </div>
                    </div>
                  )}
                  {account.conta_pai_id && !parentAccount && (
                    <div className="mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded">
                      <strong className="text-red-300">❌ ERRO:</strong>
                      <span className="text-red-200"> conta_pai_id aponta para conta inexistente</span>
                    </div>
                  )}
                  <div className="text-xs text-white/50 mt-4">
                    <strong className="text-white/70">Objeto completo:</strong>
                    <pre className="mt-1 p-3 bg-[#0B2230]/20 rounded overflow-auto text-white/60 border border-white/10 max-h-64">
                      {JSON.stringify(account, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}

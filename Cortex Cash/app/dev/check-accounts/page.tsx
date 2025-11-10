'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDB } from '@/lib/db/client'
import type { Conta, Instituicao } from '@/lib/types'
import { Button } from '@/components/ui/button'

export default function CheckAccountsPage() {
  const [accounts, setAccounts] = useState<Conta[]>([])
  const [institutions, setInstitutions] = useState<Instituicao[]>([])
  const [fixing, setFixing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const db = getDB()
    const [accountsData, institutionsData] = await Promise.all([
      db.contas.toArray(),
      db.instituicoes.toArray()
    ])
    setAccounts(accountsData)
    setInstitutions(institutionsData)
  }

  const getInstitution = (instId: string) => {
    return institutions.find(i => i.id === instId)
  }

  const handleAutoFix = async () => {
    if (!confirm('Isso vai tentar vincular as contas com as instituições baseado no nome. Continuar?')) {
      return
    }

    setFixing(true)
    const db = getDB()
    let fixed = 0

    try {
      for (const account of accounts) {
        // Tenta encontrar instituição pelo nome da conta
        const accountNameLower = account.nome.toLowerCase()

        // Mapeamento de palavras-chave para códigos de banco
        const bankMap: Record<string, string> = {
          'nubank': '260',
          'inter': '077',
          'itau': '341',
          'itaú': '341',
          'bradesco': '237',
          'brasil': '001',
          'bb': '001',
          'caixa': '104',
          'santander': '033',
          'c6': '336',
          'pagbank': '290',
          'mercado pago': '323',
          'neon': '735',
          'btg': '208',
          'xp': '102',
          'modal': '746',
          'rico': '355',
        }

        let foundInst: Instituicao | undefined

        // Procura pela palavra-chave no nome da conta
        for (const [keyword, codigo] of Object.entries(bankMap)) {
          if (accountNameLower.includes(keyword)) {
            foundInst = institutions.find(i => i.codigo === codigo)
            break
          }
        }

        // Se não encontrou, usa a primeira instituição disponível como fallback
        if (!foundInst && institutions.length > 0) {
          foundInst = institutions[0]
        }

        if (foundInst) {
          await db.contas.update(account.id, {
            instituicao_id: foundInst.id,
            updated_at: new Date()
          })
          fixed++
        }
      }

      alert(`✅ ${fixed} contas foram corrigidas!`)
      loadData() // Recarrega os dados
    } catch (error) {
      console.error('Erro ao corrigir contas:', error)
      alert('❌ Erro ao corrigir contas')
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Debug - Contas e Vínculos</h1>
        <Button
          onClick={handleAutoFix}
          disabled={fixing}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg"
          style={{
            backgroundColor: '#16a34a',
            color: '#ffffff'
          }}
        >
          {fixing ? 'Corrigindo...' : '🔧 Corrigir Vínculos Automaticamente'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total: {accounts.length} contas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.map((account) => {
              const inst = getInstitution(account.instituicao_id)
              return (
                <div key={account.id} className="border p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold">Nome da Conta:</p>
                      <p>{account.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Tipo:</p>
                      <p>{account.tipo}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Instituição ID:</p>
                      <p className="font-mono text-xs break-all">{account.instituicao_id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Instituição Encontrada:</p>
                      {inst ? (
                        <div>
                          <p className="text-green-600">✅ {inst.nome}</p>
                          <p className="text-xs">Logo: {inst.logo_url}</p>
                          <img
                            src={inst.logo_url}
                            alt={inst.nome}
                            className="w-10 h-10 mt-2 bg-white rounded"
                          />
                        </div>
                      ) : (
                        <p className="text-red-600">❌ Não encontrada</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instituições Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {institutions.map(inst => (
              <div key={inst.id} className="flex items-center gap-3 p-2 border rounded">
                <img src={inst.logo_url} alt={inst.nome} className="w-8 h-8 bg-white rounded" />
                <div>
                  <p className="font-semibold">{inst.nome}</p>
                  <p className="text-xs font-mono text-gray-500">{inst.id}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

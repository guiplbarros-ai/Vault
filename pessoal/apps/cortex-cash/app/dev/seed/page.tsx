'use client'

/**
 * Página de desenvolvimento para seed de dados
 * Agent FINANCE: Mock data utilities
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDB } from '@/lib/db/client'
import { seedCartoes, seedCategorias, seedInvestimentos, seedMockData } from '@/lib/db/seed'
import { seedCenarioBase } from '@/lib/db/seed-planejamento'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function SeedPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    categorias: number
    instituicoes: number
    contas: number
    transacoes: number
    investimentos: number
    historico_investimentos: number
    cartoes: number
    faturas: number
    lancamentos: number
  } | null>(null)

  const handleSeedMockData = async () => {
    setLoading(true)
    setSuccess(false)
    setError(null)

    try {
      const db = getDB()

      // IMPORTANTE: Garantir que categorias existam antes de inserir transações
      console.log('🔄 Verificando/inserindo categorias...')
      const categoriasExistentes = await db.categorias.count()
      if (categoriasExistentes === 0) {
        console.log('📦 Nenhuma categoria encontrada. Inserindo categorias padrão...')
        await seedCategorias(db)
      } else {
        console.log(`✅ ${categoriasExistentes} categorias já existem`)
      }

      // Inserir mock data
      await seedMockData(db)

      // Inserir investimentos
      await seedInvestimentos(db)

      // Inserir cartões de crédito
      await seedCartoes(db)

      // Inserir cenário base de planejamento
      await seedCenarioBase()

      // Buscar estatísticas
      const [
        categorias,
        instituicoes,
        contas,
        transacoes,
        investimentos,
        historico_investimentos,
        cartoes,
        faturas,
        lancamentos,
      ] = await Promise.all([
        db.categorias.count(),
        db.instituicoes.count(),
        db.contas.count(),
        db.transacoes.count(),
        db.investimentos.count(),
        db.historico_investimentos.count(),
        db.cartoes_config.count(),
        db.faturas.count(),
        db.faturas_lancamentos.count(),
      ])

      setStats({
        categorias,
        instituicoes,
        contas,
        transacoes,
        investimentos,
        historico_investimentos,
        cartoes,
        faturas,
        lancamentos,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Tem certeza? Isso vai apagar TODOS os dados!')) return

    setLoading(true)
    setError(null)
    setSuccess(false)
    setStats(null)

    try {
      const db = getDB()
      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
          await table.clear()
        }
      })

      alert('Todos os dados foram apagados!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleGetStats = async () => {
    setLoading(true)
    try {
      const db = getDB()
      const [
        categorias,
        instituicoes,
        contas,
        transacoes,
        investimentos,
        historico_investimentos,
        cartoes,
        faturas,
        lancamentos,
      ] = await Promise.all([
        db.categorias.count(),
        db.instituicoes.count(),
        db.contas.count(),
        db.transacoes.count(),
        db.investimentos.count(),
        db.historico_investimentos.count(),
        db.cartoes_config.count(),
        db.faturas.count(),
        db.faturas_lancamentos.count(),
      ])

      setStats({
        categorias,
        instituicoes,
        contas,
        transacoes,
        investimentos,
        historico_investimentos,
        cartoes,
        faturas,
        lancamentos,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Seed de Mock Data</CardTitle>
          <CardDescription>
            Utilitário de desenvolvimento para popular o banco com dados de teste
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botões de ação */}
          <div className="flex gap-3">
            <Button onClick={handleSeedMockData} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inserindo...
                </>
              ) : (
                'Inserir Mock Data'
              )}
            </Button>

            <Button onClick={handleGetStats} disabled={loading} variant="outline">
              Ver Estatísticas
            </Button>

            <Button onClick={handleClearAll} disabled={loading} variant="destructive">
              Limpar Tudo
            </Button>
          </div>

          {/* Mensagens de feedback */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 font-medium">Mock data inserido com sucesso!</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 font-medium">Erro: {error}</p>
            </div>
          )}

          {/* Estatísticas */}
          {stats && (
            <div className="space-y-3 mt-6">
              <h3 className="text-lg font-semibold">Estatísticas do Banco</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Categorias</p>
                  <p className="text-2xl font-bold">{stats.categorias}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Instituições</p>
                  <p className="text-2xl font-bold">{stats.instituicoes}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Contas</p>
                  <p className="text-2xl font-bold">{stats.contas}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Transações</p>
                  <p className="text-2xl font-bold">{stats.transacoes}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Investimentos</p>
                  <p className="text-2xl font-bold">{stats.investimentos}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Histórico</p>
                  <p className="text-2xl font-bold">{stats.historico_investimentos}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Cartões</p>
                  <p className="text-2xl font-bold">{stats.cartoes}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Faturas</p>
                  <p className="text-2xl font-bold">{stats.faturas}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Lançamentos</p>
                  <p className="text-2xl font-bold">{stats.lancamentos}</p>
                </div>
              </div>
            </div>
          )}

          {/* Detalhes do seed */}
          <div className="mt-6 p-4 bg-muted/20 rounded-lg text-sm space-y-2">
            <h4 className="font-semibold">O que será inserido:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>39 categorias padrão (despesas, receitas, transferências)</li>
              <li>3 instituições (Nubank, Bradesco, Inter)</li>
              <li>4 contas bancárias diferentes</li>
              <li>
                <strong>~150+ transações variadas dos últimos 12 meses</strong>
              </li>
              <li>Salários mensais com variação realista</li>
              <li>Despesas recorrentes mensais (aluguel, contas, assinaturas)</li>
              <li>Despesas variáveis (alimentação, transporte, lazer)</li>
              <li>Receitas extras distribuídas ao longo do ano</li>
              <li>Aportes mensais em investimentos</li>
              <li>9 investimentos diversos (Renda Fixa, Variável, Fundos, Cripto)</li>
              <li>Histórico de movimentações dos investimentos</li>
              <li>3 cartões de crédito (Nubank, Bradesco, Inter)</li>
              <li>Faturas atuais e anteriores</li>
              <li>Lançamentos de compras nas faturas</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

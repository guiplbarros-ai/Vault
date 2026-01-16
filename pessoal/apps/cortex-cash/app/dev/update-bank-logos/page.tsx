'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDB } from '@/lib/db/client'
import { INSTITUICOES_PADRAO } from '@/lib/db/seed-instituicoes'
import { useState } from 'react'
import { toast } from 'sonner'

/**
 * Página de desenvolvimento para atualizar logos dos bancos
 */
export default function UpdateBankLogosPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const handleUpdateLogos = async () => {
    setLoading(true)
    setResult('')

    try {
      const db = getDB()

      // Busca todas as instituições
      const instituicoes = await db.instituicoes.toArray()

      let updated = 0

      for (const inst of instituicoes) {
        // Encontra o padrão correspondente pelo código
        const padrao = INSTITUICOES_PADRAO.find((p) => p.codigo === inst.codigo)

        if (padrao) {
          // Atualiza a logo_url
          await db.instituicoes.update(inst.id, {
            logo_url: padrao.logo_url,
            updated_at: new Date(),
          })
          updated++
        }
      }

      setResult(`✅ ${updated} instituições atualizadas com sucesso!`)
      toast.success('Logos atualizadas!', {
        description: `${updated} bancos foram atualizados`,
      })
    } catch (error) {
      console.error('Erro ao atualizar logos:', error)
      setResult(`❌ Erro: ${error}`)
      toast.error('Erro ao atualizar logos')
    } finally {
      setLoading(false)
    }
  }

  const handleResetAllInstitutions = async () => {
    if (
      !confirm(
        'Tem certeza que deseja APAGAR TODAS as instituições e recriar do zero? Contas existentes podem ficar sem referência!'
      )
    ) {
      return
    }

    setLoading(true)
    setResult('')

    try {
      const db = getDB()

      // Apaga todas as instituições
      await db.instituicoes.clear()

      // Recria com os dados atualizados
      const now = new Date()
      const instituicoes = INSTITUICOES_PADRAO.map((inst, index) => ({
        ...inst,
        id: `inst_${Date.now()}_${index}`,
        created_at: now,
        updated_at: now,
      }))

      await db.instituicoes.bulkAdd(instituicoes)

      setResult(
        `✅ ${instituicoes.length} instituições recriadas com sucesso!\n\n⚠️ IMPORTANTE: Você precisa editar suas contas existentes e re-selecionar a instituição!`
      )
      toast.success('Instituições recriadas!', {
        description: `${instituicoes.length} bancos foram recriados com logos atualizadas`,
      })
    } catch (error) {
      console.error('Erro ao resetar instituições:', error)
      setResult(`❌ Erro: ${error}`)
      toast.error('Erro ao resetar instituições')
    } finally {
      setLoading(false)
    }
  }

  const handleFixExistingAccounts = async () => {
    if (
      !confirm(
        'Isso vai tentar vincular as contas existentes com as novas instituições baseado no código do banco. Continuar?'
      )
    ) {
      return
    }

    setLoading(true)
    setResult('')

    try {
      const db = getDB()

      // Busca todas as contas
      const contas = await db.contas.toArray()

      // Busca todas as instituições
      const instituicoes = await db.instituicoes.toArray()

      let fixed = 0

      for (const conta of contas) {
        // Tenta encontrar instituição antiga pelo ID ou agência
        const oldInstId = conta.instituicao_id

        // Se o ID começa com "inst_", tenta buscar instituição pelo código no nome da agência
        if (oldInstId?.startsWith('inst_')) {
          // Pega as instituições antigas
          const oldInst = await db.instituicoes.get(oldInstId)

          if (oldInst) {
            // Busca nova instituição pelo mesmo código
            const newInst = instituicoes.find((i) => i.codigo === oldInst.codigo)

            if (newInst && newInst.id !== oldInstId) {
              await db.contas.update(conta.id, {
                instituicao_id: newInst.id,
                updated_at: new Date(),
              })
              fixed++
            }
          }
        }
      }

      setResult(`✅ ${fixed} contas foram corrigidas!`)
      toast.success('Contas corrigidas!', {
        description: `${fixed} contas foram vinculadas às novas instituições`,
      })
    } catch (error) {
      console.error('Erro ao corrigir contas:', error)
      setResult(`❌ Erro: ${error}`)
      toast.error('Erro ao corrigir contas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Atualizar Logos dos Bancos</h1>

      <Card>
        <CardHeader>
          <CardTitle>Opção 1: Atualizar Logos (Seguro)</CardTitle>
          <CardDescription>
            Atualiza apenas as URLs das logos das instituições existentes, mantendo IDs e
            relacionamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleUpdateLogos} disabled={loading} className="w-full">
            {loading ? 'Atualizando...' : 'Atualizar Logos'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Opção 2: Resetar Todas (PERIGOSO)</CardTitle>
          <CardDescription className="text-red-500">
            ⚠️ APAGA TODAS as instituições e recria do zero. Contas existentes ficarão sem
            referência!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleResetAllInstitutions}
            disabled={loading}
            variant="destructive"
            className="w-full"
          >
            {loading ? 'Resetando...' : 'Resetar Todas as Instituições'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opção 3: Corrigir Contas Existentes</CardTitle>
          <CardDescription>
            Após resetar as instituições, use isso para re-vincular as contas com as novas
            instituições baseado no código do banco
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleFixExistingAccounts} disabled={loading} className="w-full">
            {loading ? 'Corrigindo...' : 'Corrigir Vínculos das Contas'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Logos Disponíveis</CardTitle>
          <CardDescription>Logos que foram adicionadas à pasta public/logos/banks/</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {INSTITUICOES_PADRAO.map((inst) => (
              <div
                key={inst.codigo}
                className="flex flex-col items-center gap-2 p-3 border rounded-lg"
              >
                <img
                  src={inst.logo_url}
                  alt={inst.nome}
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    // Fallback para emoji se a imagem não carregar
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `<div class="w-12 h-12 flex items-center justify-center text-2xl">🏦</div><p class="text-xs text-center font-medium">${inst.nome}</p><p class="text-xs text-center text-gray-500">${inst.codigo}</p>`
                    }
                  }}
                />
                <p className="text-xs text-center font-medium">{inst.nome}</p>
                <p className="text-xs text-center text-gray-500">{inst.codigo}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

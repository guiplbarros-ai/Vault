import { SupabaseClient } from '@supabase/supabase-js'
import type {
  Fatura,
  FaturaDB,
  FaturaPagamentoInput,
  TransacaoFatura,
  FaturaDetalhesResponse,
  HistoricoFaturasResponse,
  ProjecaoFaturaFutura,
  convertFaturaFromDB,
} from '@/types/cartao'

export class FaturaService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Listar faturas de um cartão específico
   */
  async listarFaturas(
    cartaoId: string,
    limit = 12
  ): Promise<Fatura[]> {
    const { data, error } = await this.supabase
      .from('fatura')
      .select('*')
      .eq('cartao_id', cartaoId)
      .order('data_vencimento', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data as FaturaDB[]).map(convertFaturaFromDB)
  }

  /**
   * Buscar uma fatura específica por ID
   */
  async buscarFatura(id: string): Promise<Fatura | null> {
    const { data, error } = await this.supabase
      .from('fatura')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return convertFaturaFromDB(data as FaturaDB)
  }

  /**
   * Buscar fatura atual (aberta ou fechada) de um cartão
   */
  async buscarFaturaAtual(cartaoId: string): Promise<Fatura | null> {
    const { data, error } = await this.supabase
      .from('fatura')
      .select('*')
      .eq('cartao_id', cartaoId)
      .in('status', ['aberta', 'fechada'])
      .order('data_vencimento', { ascending: true })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return convertFaturaFromDB(data as FaturaDB)
  }

  /**
   * Buscar detalhes completos de uma fatura (com transações)
   */
  async buscarDetalhes(faturaId: string): Promise<FaturaDetalhesResponse> {
    // 1. Buscar fatura
    const fatura = await this.buscarFatura(faturaId)
    if (!fatura) throw new Error('Fatura não encontrada')

    // 2. Buscar transações da fatura
    const { data: transacoesData, error: transError } = await this.supabase
      .from('transacao')
      .select('*')
      .eq('fatura_id', faturaId)
      .order('data', { ascending: false })

    if (transError) throw transError

    const transacoes: TransacaoFatura[] = (transacoesData || []).map((t: any) => ({
      id: t.id,
      data: new Date(t.data),
      descricao: t.descricao,
      categoria: t.categoria_id, // TODO: join com categoria
      valor: Number(t.valor),
      parcelaAtual: t.parcela_atual,
      parcelasTotal: t.parcelas_total,
      compraInternacional: t.compra_internacional || false,
      moedaOriginal: t.moeda_original,
      taxaConversao: t.taxa_conversao ? Number(t.taxa_conversao) : undefined,
      iof: t.iof ? Number(t.iof) : undefined,
    }))

    // 3. Buscar dados do cartão
    const { data: cartaoData, error: cartaoError } = await this.supabase
      .from('cartao_credito')
      .select('nome, bandeira, ultimos_digitos')
      .eq('id', fatura.cartaoId)
      .single()

    if (cartaoError) throw cartaoError

    return {
      fatura,
      transacoes,
      cartao: {
        nome: cartaoData.nome,
        bandeira: cartaoData.bandeira as any,
        ultimosDigitos: cartaoData.ultimos_digitos,
      },
    }
  }

  /**
   * Criar uma nova fatura
   */
  async criarFatura(
    cartaoId: string,
    mesReferencia: string, // YYYY-MM
    dataFechamento: Date,
    dataVencimento: Date
  ): Promise<Fatura> {
    // Buscar usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await this.supabase
      .from('fatura')
      .insert({
        user_id: user.id,
        cartao_id: cartaoId,
        mes_referencia: mesReferencia,
        data_fechamento: dataFechamento.toISOString().split('T')[0],
        data_vencimento: dataVencimento.toISOString().split('T')[0],
        valor_total: 0,
        valor_pago: 0,
        status: 'aberta',
      })
      .select('*')
      .single()

    if (error) throw error

    return convertFaturaFromDB(data as FaturaDB)
  }

  /**
   * Fechar fatura (mudar status de aberta para fechada)
   */
  async fecharFatura(faturaId: string): Promise<void> {
    const { error } = await this.supabase
      .from('fatura')
      .update({ status: 'fechada' })
      .eq('id', faturaId)

    if (error) throw error
  }

  /**
   * Registrar pagamento de fatura
   */
  async registrarPagamento(input: FaturaPagamentoInput): Promise<void> {
    const { faturaId, contaOrigemId, valor, dataPagamento, observacoes } = input

    // 0. Buscar usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Usuário não autenticado')
    }

    // 1. Buscar fatura
    const fatura = await this.buscarFatura(faturaId)
    if (!fatura) throw new Error('Fatura não encontrada')

    // 2. Criar transação de débito na conta origem
    const { data: transacaoDebito, error: debitoError } = await this.supabase
      .from('transacao')
      .insert({
        user_id: user.id,
        conta_id: contaOrigemId,
        data: dataPagamento.toISOString().split('T')[0],
        descricao: `Pagamento Fatura - ${observacoes || 'Cartão de Crédito'}`,
        valor: -Math.abs(valor), // Negativo (saída)
        tipo: 'pagamento_fatura',
        hash_dedupe: `pag-fatura-${faturaId}-${Date.now()}`, // Hash único
      })
      .select('id')
      .single()

    if (debitoError) throw debitoError

    // 3. Buscar conta do cartão
    const { data: cartaoData } = await this.supabase
      .from('cartao_credito')
      .select('conta_id')
      .eq('id', fatura.cartaoId)
      .single()

    if (!cartaoData) throw new Error('Cartão não encontrado')

    // 4. Criar transação de crédito no cartão (reduz dívida)
    await this.supabase.from('transacao').insert({
      user_id: user.id,
      conta_id: cartaoData.conta_id,
      data: dataPagamento.toISOString().split('T')[0],
      descricao: `Recebimento Pagamento Fatura`,
      valor: Math.abs(valor), // Positivo (entrada/crédito)
      tipo: 'pagamento_recebido',
      hash_dedupe: `rec-fatura-${faturaId}-${Date.now()}`,
      fatura_id: faturaId,
    })

    // 5. Atualizar fatura
    const novoValorPago = fatura.valorPago + valor
    const novoStatus =
      novoValorPago >= fatura.valorTotal
        ? 'paga'
        : novoValorPago > 0
        ? 'parcial'
        : fatura.status

    const { error: updateError } = await this.supabase
      .from('fatura')
      .update({
        valor_pago: novoValorPago,
        status: novoStatus,
        data_pagamento:
          novoStatus === 'paga'
            ? dataPagamento.toISOString().split('T')[0]
            : null,
        transacao_pagamento_id: transacaoDebito.id,
      })
      .eq('id', faturaId)

    if (updateError) throw updateError
  }

  /**
   * Buscar faturas vencidas
   */
  async buscarFaturasVencidas(): Promise<Fatura[]> {
    const hoje = new Date().toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('fatura')
      .select('*')
      .lt('data_vencimento', hoje)
      .neq('status', 'paga')
      .order('data_vencimento', { ascending: true })

    if (error) throw error

    return (data as FaturaDB[]).map(convertFaturaFromDB)
  }

  /**
   * Buscar faturas próximas do vencimento (próximos N dias)
   */
  async buscarFaturasProximasVencimento(dias = 7): Promise<Fatura[]> {
    const hoje = new Date()
    const limite = new Date()
    limite.setDate(limite.getDate() + dias)

    const { data, error } = await this.supabase
      .from('fatura')
      .select('*')
      .gte('data_vencimento', hoje.toISOString().split('T')[0])
      .lte('data_vencimento', limite.toISOString().split('T')[0])
      .neq('status', 'paga')
      .order('data_vencimento', { ascending: true })

    if (error) throw error

    return (data as FaturaDB[]).map(convertFaturaFromDB)
  }

  /**
   * Buscar histórico de faturas com paginação
   */
  async buscarHistorico(
    cartaoId: string,
    page = 1,
    perPage = 10
  ): Promise<HistoricoFaturasResponse> {
    const offset = (page - 1) * perPage

    // Contar total
    const { count, error: countError } = await this.supabase
      .from('fatura')
      .select('*', { count: 'exact', head: true })
      .eq('cartao_id', cartaoId)

    if (countError) throw countError

    // Buscar faturas
    const { data, error } = await this.supabase
      .from('fatura')
      .select('*')
      .eq('cartao_id', cartaoId)
      .order('data_vencimento', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) throw error

    return {
      faturas: (data as FaturaDB[]).map(convertFaturaFromDB),
      pagination: {
        page,
        perPage,
        total: count || 0,
      },
    }
  }

  /**
   * Calcular valor total da fatura (soma de transações)
   */
  async calcularValorTotal(faturaId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('transacao')
      .select('valor')
      .eq('fatura_id', faturaId)

    if (error) throw error

    const total = (data || []).reduce(
      (acc, t) => acc + Math.abs(Number(t.valor)),
      0
    )

    // Atualizar fatura
    await this.supabase
      .from('fatura')
      .update({ valor_total: total })
      .eq('id', faturaId)

    return total
  }

  /**
   * Projetar faturas futuras baseado em parceladas e recorrências
   */
  async projetarFaturasFuturas(
    cartaoId: string,
    mesesProjecao = 3
  ): Promise<ProjecaoFaturaFutura[]> {
    const projecoes: ProjecaoFaturaFutura[] = []

    // Buscar cartão para saber dias de vencimento
    const { data: cartao } = await this.supabase
      .from('cartao_credito')
      .select('dia_vencimento, conta_id')
      .eq('id', cartaoId)
      .single()

    if (!cartao) return []

    // Buscar transações parceladas ativas
    const { data: parceladas } = await this.supabase
      .from('transacao')
      .select('*')
      .eq('conta_id', cartao.conta_id)
      .eq('is_parcelada', true)
      .not('parcelas_total', 'is', null)

    const hoje = new Date()

    for (let i = 1; i <= mesesProjecao; i++) {
      const mesProjecao = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
      const mesRef = `${mesProjecao.getFullYear()}-${String(
        mesProjecao.getMonth() + 1
      ).padStart(2, '0')}`

      // Calcular vencimento
      const dataVenc = new Date(
        mesProjecao.getFullYear(),
        mesProjecao.getMonth(),
        cartao.dia_vencimento
      )

      // Contar parceladas que cairão neste mês
      const parcelasInclusas = (parceladas || []).filter((p: any) => {
        const parcelaAtual = p.parcela_atual || 1
        const parcelasTotal = p.parcelas_total || 1
        return parcelaAtual + i <= parcelasTotal
      }).length

      // Estimar valor (simplificado - soma das parcelas futuras)
      const valorEstimado = (parceladas || []).reduce((acc, p: any) => {
        const parcelaAtual = p.parcela_atual || 1
        const parcelasTotal = p.parcelas_total || 1
        if (parcelaAtual + i <= parcelasTotal) {
          return acc + Math.abs(Number(p.valor))
        }
        return acc
      }, 0)

      projecoes.push({
        mesReferencia: mesRef,
        valorEstimado,
        parcelasInclusas,
        recorrenciasInclusas: 0, // TODO: implementar recorrências
        dataVencimentoPrevista: dataVenc,
      })
    }

    return projecoes
  }

  /**
   * Buscar todas as faturas de todos os cartões do usuário
   */
  async buscarTodasFaturas(limit = 50): Promise<Fatura[]> {
    const { data, error } = await this.supabase
      .from('fatura')
      .select('*')
      .order('data_vencimento', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data as FaturaDB[]).map(convertFaturaFromDB)
  }

  /**
   * Deletar uma fatura (cuidado! Remove permanentemente)
   */
  async deletarFatura(faturaId: string): Promise<void> {
    const { error } = await this.supabase
      .from('fatura')
      .delete()
      .eq('id', faturaId)

    if (error) throw error
  }
}

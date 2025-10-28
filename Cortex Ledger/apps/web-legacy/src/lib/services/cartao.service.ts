import { SupabaseClient } from '@supabase/supabase-js'
import type {
  CartaoCredito,
  CartaoCreditoDB,
  CartaoFormInput,
  ResumoCartoes,
  CalculoMelhorDiaCompra,
  convertCartaoFromDB,
} from '@/types/cartao'

export class CartaoService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Listar todos os cartões do usuário autenticado
   */
  async listarCartoes(): Promise<CartaoCredito[]> {
    const { data, error } = await this.supabase
      .from('cartao_credito')
      .select('*')
      .eq('status', 'ativo')
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data as CartaoCreditoDB[]).map(convertCartaoFromDB)
  }

  /**
   * Buscar um cartão específico por ID
   */
  async buscarCartao(id: string): Promise<CartaoCredito | null> {
    const { data, error } = await this.supabase
      .from('cartao_credito')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return convertCartaoFromDB(data as CartaoCreditoDB)
  }

  /**
   * Criar um novo cartão de crédito
   */
  async criarCartao(input: CartaoFormInput): Promise<CartaoCredito> {
    // 0. Buscar usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Usuário não autenticado')
    }

    // 1. Buscar ou criar instituição
    const { data: instituicaoData } = await this.supabase
      .from('instituicao')
      .select('id')
      .eq('nome', input.instituicao)
      .single()

    let instituicaoId: string

    if (!instituicaoData) {
      // Criar nova instituição
      const { data: newInst, error: instError } = await this.supabase
        .from('instituicao')
        .insert({
          nome: input.instituicao,
          tipo: 'cartao',
        })
        .select('id')
        .single()

      if (instError) throw instError
      instituicaoId = newInst.id
    } else {
      instituicaoId = instituicaoData.id
    }

    // 2. Criar conta
    const { data: contaData, error: contaError } = await this.supabase
      .from('conta')
      .insert({
        instituicao_id: instituicaoId,
        tipo: 'cartao',
        apelido: input.nome,
        moeda: 'BRL',
        ativa: true,
      })
      .select('id')
      .single()

    if (contaError) throw contaError

    // 3. Criar cartão de crédito
    const { data, error } = await this.supabase
      .from('cartao_credito')
      .insert({
        user_id: user.id,
        conta_id: contaData.id,
        nome: input.nome,
        instituicao: input.instituicao,
        bandeira: input.bandeira,
        ultimos_digitos: input.ultimosDigitos,
        tipo_cartao: input.tipoCartao,
        limite_total: input.limiteTotal,
        limite_disponivel: input.limiteTotal, // Inicialmente todo disponível
        dia_fechamento: input.diaFechamento,
        dia_vencimento: input.diaVencimento,
        anuidade_valor: input.anuidadeValor,
        taxa_juros_mes: input.taxaJurosMes,
        status: 'ativo',
      })
      .select('*')
      .single()

    if (error) throw error

    return convertCartaoFromDB(data as CartaoCreditoDB)
  }

  /**
   * Atualizar um cartão existente
   */
  async atualizarCartao(
    id: string,
    input: Partial<CartaoFormInput>
  ): Promise<CartaoCredito> {
    const updateData: any = {}

    if (input.nome) updateData.nome = input.nome
    if (input.instituicao) updateData.instituicao = input.instituicao
    if (input.bandeira) updateData.bandeira = input.bandeira
    if (input.ultimosDigitos) updateData.ultimos_digitos = input.ultimosDigitos
    if (input.tipoCartao) updateData.tipo_cartao = input.tipoCartao
    if (input.limiteTotal !== undefined) updateData.limite_total = input.limiteTotal
    if (input.diaFechamento) updateData.dia_fechamento = input.diaFechamento
    if (input.diaVencimento) updateData.dia_vencimento = input.diaVencimento
    if (input.anuidadeValor !== undefined)
      updateData.anuidade_valor = input.anuidadeValor
    if (input.taxaJurosMes !== undefined)
      updateData.taxa_juros_mes = input.taxaJurosMes

    const { data, error } = await this.supabase
      .from('cartao_credito')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    return convertCartaoFromDB(data as CartaoCreditoDB)
  }

  /**
   * Desativar um cartão (soft delete)
   */
  async desativarCartao(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('cartao_credito')
      .update({ status: 'cancelado' })
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Deletar permanentemente um cartão
   */
  async deletarCartao(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('cartao_credito')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Buscar resumo de todos os cartões
   */
  async buscarResumo(): Promise<ResumoCartoes> {
    // Usar a view otimizada
    const { data: cartoesResumo, error } = await this.supabase
      .from('v_cartoes_resumo')
      .select('*')

    if (error) throw error

    // Calcular agregações
    let totalAberto = 0
    let limiteDisponivel = 0
    let utilizacaoTotal = 0
    let proximoVencimento: ResumoCartoes['proximoVencimento'] = null

    cartoesResumo?.forEach((cartao: any) => {
      // Total em aberto
      if (cartao.fatura_atual_valor) {
        totalAberto += cartao.fatura_atual_valor
      }

      // Limite disponível
      limiteDisponivel += cartao.limite_disponivel || 0

      // Utilização
      utilizacaoTotal += cartao.utilizacao_percentual || 0

      // Próximo vencimento
      if (
        cartao.fatura_atual_vencimento &&
        cartao.fatura_atual_status !== 'paga'
      ) {
        const dataVenc = new Date(cartao.fatura_atual_vencimento)
        if (
          !proximoVencimento ||
          dataVenc < proximoVencimento.data
        ) {
          proximoVencimento = {
            data: dataVenc,
            valor: cartao.fatura_atual_valor || 0,
            cartao: cartao.nome,
          }
        }
      }
    })

    const utilizacaoMedia =
      cartoesResumo && cartoesResumo.length > 0
        ? utilizacaoTotal / cartoesResumo.length
        : 0

    return {
      totalAberto,
      proximoVencimento,
      limiteDisponivel,
      utilizacaoMedia: Math.round(utilizacaoMedia * 100) / 100,
    }
  }

  /**
   * Calcular o melhor dia de compra para um cartão
   */
  calcularMelhorDiaCompra(
    diaFechamento: number,
    diaVencimento: number
  ): CalculoMelhorDiaCompra {
    const melhorDia = ((diaFechamento % 31) + 1) || 1
    const prazoMaximo = diaVencimento - diaFechamento + 30

    return {
      diaFechamento,
      diaVencimento,
      melhorDia,
      prazoMaximo,
    }
  }

  /**
   * Recalcular limite disponível de um cartão
   * (Normalmente feito automaticamente pelo trigger, mas útil para debug)
   */
  async recalcularLimiteDisponivel(cartaoId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('calcular_limite_disponivel', {
      p_cartao_id: cartaoId,
    })

    if (error) throw error

    // Atualizar o cartão com o novo limite
    await this.supabase
      .from('cartao_credito')
      .update({ limite_disponivel: data })
      .eq('id', cartaoId)

    return data
  }

  /**
   * Buscar cartões com alerta de limite crítico (>80%)
   */
  async buscarCartoesCriticos(): Promise<CartaoCredito[]> {
    const { data, error } = await this.supabase
      .from('v_cartoes_resumo')
      .select('*')
      .gte('utilizacao_percentual', 80)

    if (error) throw error

    // Buscar dados completos dos cartões críticos
    if (!data || data.length === 0) return []

    const ids = data.map((c: any) => c.id)
    const { data: cartoes, error: cartoesError } = await this.supabase
      .from('cartao_credito')
      .select('*')
      .in('id', ids)

    if (cartoesError) throw cartoesError

    return (cartoes as CartaoCreditoDB[]).map(convertCartaoFromDB)
  }

  /**
   * Buscar cartões por bandeira
   */
  async buscarPorBandeira(
    bandeira: 'visa' | 'master' | 'amex' | 'elo' | 'outro'
  ): Promise<CartaoCredito[]> {
    const { data, error } = await this.supabase
      .from('cartao_credito')
      .select('*')
      .eq('bandeira', bandeira)
      .eq('status', 'ativo')

    if (error) throw error

    return (data as CartaoCreditoDB[]).map(convertCartaoFromDB)
  }

  /**
   * Atualizar apenas o limite de um cartão
   */
  async atualizarLimite(cartaoId: string, novoLimite: number): Promise<void> {
    const { error } = await this.supabase
      .from('cartao_credito')
      .update({ limite_total: novoLimite })
      .eq('id', cartaoId)

    if (error) throw error
  }
}

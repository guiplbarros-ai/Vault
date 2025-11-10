"use client";

/**
 * Onboarding Wizard
 * Agent APP: Owner
 *
 * Fluxo de primeira execução do app com opção de dados demo ou reais
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight,
  Sparkles,
  Database,
  Wallet,
  CheckCircle2,
  Loader2,
  BarChart3,
  TrendingUp,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { contaService } from '@/lib/services/conta.service';
import { AccountForm } from '@/components/forms';
import type { AccountFormData } from '@/lib/validations';
import { mapFormDataToCreateConta } from '@/lib/adapters';

type OnboardingStep = 'welcome' | 'choose-mode' | 'create-account' | 'demo-confirm' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedMode, setSelectedMode] = useState<'demo' | 'real' | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Verificar se já existe onboarding completo
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      setChecking(true);
      const onboardingComplete = localStorage.getItem('onboarding_complete');

      if (onboardingComplete === 'true') {
        // Usuário já fez onboarding, redirecionar
        router.push('/');
        return;
      }

      // Verificar se já existem contas cadastradas
      const contas = await contaService.listContas();
      if (contas.length > 0) {
        // Já tem contas, marcar onboarding como completo e redirecionar
        localStorage.setItem('onboarding_complete', 'true');
        router.push('/');
        return;
      }

      // Garantir que as instituições estejam seedadas
      await ensureInstituicoes();

      setChecking(false);
    } catch (error) {
      console.error('Erro ao verificar status do onboarding:', error);
      setChecking(false);
    }
  };

  const ensureInstituicoes = async () => {
    try {
      const { hasInstituicoes, seedInstituicoes } = await import('@/lib/db/seed-instituicoes');
      const hasInst = await hasInstituicoes();

      if (!hasInst) {
        console.log('Seedando instituições para onboarding...');
        await seedInstituicoes();
      }
    } catch (error) {
      console.error('Erro ao verificar/seedar instituições:', error);
    }
  };

  const handleModeSelection = (mode: 'demo' | 'real') => {
    setSelectedMode(mode);
    if (mode === 'demo') {
      setStep('demo-confirm');
    } else {
      setStep('create-account');
    }
  };

  const handleDemoConfirm = async () => {
    setLoading(true);
    try {
      // Importar e executar seed de dados demo
      const { seedDemoData } = await import('@/lib/db/seed-demo');
      await seedDemoData();

      // Ativar modo demo
      localStorage.setItem('demo_mode_settings', JSON.stringify({
        enabled: true,
        lastPopulated: new Date().toISOString(),
      }));

      // Marcar onboarding como completo
      localStorage.setItem('onboarding_complete', 'true');

      setStep('complete');

      toast.success('Dados demo carregados!', {
        description: 'Seu ambiente de demonstração está pronto.',
      });
    } catch (error) {
      console.error('Erro ao popular dados demo:', error);
      toast.error('Erro ao carregar dados demo', {
        description: 'Tente novamente ou escolha criar sua primeira conta.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountCreate = async (data: AccountFormData) => {
    setLoading(true);
    try {
      // Obter a instituição selecionada do formulário
      const instituicaoId = data.institution || '';

      if (!instituicaoId) {
        toast.error('Instituição não selecionada', {
          description: 'Por favor, selecione uma instituição.',
        });
        setLoading(false);
        return;
      }

      // Criar conta
      const contaData = mapFormDataToCreateConta(data, instituicaoId);
      await contaService.createConta(contaData);

      // Marcar onboarding como completo
      localStorage.setItem('onboarding_complete', 'true');

      setStep('complete');

      toast.success('Conta criada!', {
        description: 'Sua primeira conta foi criada com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast.error('Erro ao criar conta', {
        description: 'Verifique os dados e tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.push('/');
  };

  if (checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at center, #152821 0%, #111f1c 40%, #0e1c19 70%, #0a1512 100%)',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: '#3A8F6E' }} />
          <p style={{ color: '#BBC5C2' }}>Verificando configuração inicial...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at center, #152821 0%, #111f1c 40%, #0e1c19 70%, #0a1512 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="w-full max-w-4xl">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <Card
            className="overflow-hidden"
            style={{
              backgroundColor: '#1a362f',
              border: '1px solid #2d5247',
              borderRadius: '18px',
              boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 6px 14px rgba(0,0,0,.3)',
            }}
          >
            <CardHeader className="text-center pb-8">
              <div
                className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#3A8F6E' }}
              >
                <Sparkles className="h-10 w-10" style={{ color: '#F7FAF9' }} />
              </div>
              <CardTitle className="text-4xl font-bold mb-3" style={{ color: '#F7FAF9' }}>
                Bem-vindo ao Cortex Cash
              </CardTitle>
              <CardDescription className="text-lg" style={{ color: '#BBC5C2' }}>
                Seu assistente financeiro inteligente com IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div
                  className="text-center p-6 rounded-lg"
                  style={{
                    backgroundColor: '#152b26',
                    border: '1px solid #2d5247',
                    borderRadius: '14px',
                  }}
                >
                  <BarChart3 className="h-8 w-8 mx-auto mb-3" style={{ color: '#3A8F6E' }} />
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#F7FAF9' }}>Análises Avançadas</h3>
                  <p className="text-xs" style={{ color: '#94a8a1' }}>Dashboards e relatórios inteligentes</p>
                </div>
                <div
                  className="text-center p-6 rounded-lg"
                  style={{
                    backgroundColor: '#152b26',
                    border: '1px solid #2d5247',
                    borderRadius: '14px',
                  }}
                >
                  <TrendingUp className="h-8 w-8 mx-auto mb-3" style={{ color: '#3A8F6E' }} />
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#F7FAF9' }}>Classificação IA</h3>
                  <p className="text-xs" style={{ color: '#94a8a1' }}>Categorização automática com GPT-4o</p>
                </div>
                <div
                  className="text-center p-6 rounded-lg"
                  style={{
                    backgroundColor: '#152b26',
                    border: '1px solid #2d5247',
                    borderRadius: '14px',
                  }}
                >
                  <Shield className="h-8 w-8 mx-auto mb-3" style={{ color: '#3A8F6E' }} />
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#F7FAF9' }}>100% Local</h3>
                  <p className="text-xs" style={{ color: '#94a8a1' }}>Seus dados ficam no seu navegador</p>
                </div>
              </div>

              <Separator style={{ backgroundColor: '#2d5247' }} />

              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => router.push('/login')}
                  size="lg"
                  variant="outline"
                  className="px-8"
                  style={{
                    backgroundColor: '#152b26',
                    border: '1px solid #2d5247',
                    color: '#F7FAF9',
                    borderRadius: '12px',
                  }}
                >
                  Fazer Login
                </Button>
                <Button
                  onClick={() => setStep('choose-mode')}
                  size="lg"
                  className="px-8"
                  style={{
                    backgroundColor: '#3A8F6E',
                    color: '#F7FAF9',
                    borderRadius: '12px',
                    border: 'none',
                  }}
                >
                  Começar
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Choose Mode Step */}
        {step === 'choose-mode' && (
          <Card
            style={{
              backgroundColor: '#1a362f',
              border: '1px solid #2d5247',
              borderRadius: '18px',
              boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 6px 14px rgba(0,0,0,.3)',
            }}
          >
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold mb-2" style={{ color: '#F7FAF9' }}>
                Como você quer começar?
              </CardTitle>
              <CardDescription style={{ color: '#BBC5C2' }}>
                Escolha entre explorar com dados de exemplo ou criar sua primeira conta real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Demo Mode */}
                <button
                  onClick={() => handleModeSelection('demo')}
                  className="group relative overflow-hidden p-6 text-left transition-all"
                  style={{
                    backgroundColor: '#152b26',
                    border: '2px solid #3A8F6E',
                    borderRadius: '18px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1d3a33';
                    e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(58, 143, 110, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#152b26';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Badge
                    className="mb-4"
                    style={{ backgroundColor: '#3A8F6E', color: '#F7FAF9' }}
                  >
                    RECOMENDADO
                  </Badge>
                  <div
                    className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-lg"
                    style={{ backgroundColor: '#1a362f' }}
                  >
                    <Database className="h-8 w-8" style={{ color: '#3A8F6E' }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#F7FAF9' }}>Modo Demonstração</h3>
                  <p className="text-sm mb-4" style={{ color: '#BBC5C2' }}>
                    Explore todas as funcionalidades com dados de exemplo já populados
                  </p>
                  <ul className="space-y-2 text-sm" style={{ color: '#BBC5C2' }}>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" style={{ color: '#3A8F6E' }} />
                      6 contas pré-configuradas
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" style={{ color: '#3A8F6E' }} />
                      90+ transações de exemplo
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" style={{ color: '#3A8F6E' }} />
                      Dashboards prontos para explorar
                    </li>
                  </ul>
                </button>

                {/* Real Mode */}
                <button
                  onClick={() => handleModeSelection('real')}
                  className="group relative overflow-hidden p-6 text-left transition-all"
                  style={{
                    backgroundColor: '#152b26',
                    border: '1px solid #2d5247',
                    borderRadius: '18px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1d3a33';
                    e.currentTarget.style.borderColor = '#3a6456';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#152b26';
                    e.currentTarget.style.borderColor = '#2d5247';
                  }}
                >
                  <div
                    className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-lg"
                    style={{ backgroundColor: '#1a362f' }}
                  >
                    <Wallet className="h-8 w-8" style={{ color: '#F7FAF9' }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#F7FAF9' }}>Começar do Zero</h3>
                  <p className="text-sm mb-4" style={{ color: '#BBC5C2' }}>
                    Crie sua primeira conta e comece a gerenciar suas finanças reais
                  </p>
                  <ul className="space-y-2 text-sm" style={{ color: '#BBC5C2' }}>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" style={{ color: '#94a8a1' }} />
                      Configure sua primeira conta
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" style={{ color: '#94a8a1' }} />
                      Seus dados reais desde o início
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" style={{ color: '#94a8a1' }} />
                      Controle total desde o começo
                    </li>
                  </ul>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Demo Confirm Step */}
        {step === 'demo-confirm' && (
          <Card
            style={{
              backgroundColor: '#1a362f',
              border: '1px solid #2d5247',
              borderRadius: '18px',
              boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 6px 14px rgba(0,0,0,.3)',
            }}
          >
            <CardHeader className="text-center">
              <div
                className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#152b26' }}
              >
                <Database className="h-8 w-8" style={{ color: '#3A8F6E' }} />
              </div>
              <CardTitle className="text-3xl font-bold mb-2" style={{ color: '#F7FAF9' }}>
                Popular com Dados Demo
              </CardTitle>
              <CardDescription style={{ color: '#BBC5C2' }}>
                Vamos criar contas e transações de exemplo para você explorar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className="rounded-lg p-6"
                style={{
                  border: '1px solid #3A8F6E',
                  backgroundColor: '#1a3329',
                  borderRadius: '14px',
                }}
              >
                <h4 className="text-sm font-semibold mb-3" style={{ color: '#5FC883' }}>O que será criado:</h4>
                <ul className="space-y-2 text-sm" style={{ color: '#BBC5C2' }}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" style={{ color: '#3A8F6E' }} />
                    5 instituições financeiras (Nubank, BB, Itaú, Inter, C6)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" style={{ color: '#3A8F6E' }} />
                    6 contas diversas (corrente, poupança, investimento, carteira)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" style={{ color: '#3A8F6E' }} />
                    90+ transações dos últimos 3 meses
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" style={{ color: '#3A8F6E' }} />
                    Receitas e despesas categorizadas
                  </li>
                </ul>
              </div>

              <div
                className="rounded-lg p-4"
                style={{
                  border: '1px solid #E0B257',
                  backgroundColor: '#2e2819',
                  borderRadius: '14px',
                }}
              >
                <p className="text-sm" style={{ color: '#E0B257' }}>
                  <strong>Nota:</strong> Você poderá limpar esses dados a qualquer momento nas configurações.
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setStep('choose-mode')}
                  disabled={loading}
                  style={{
                    backgroundColor: '#152b26',
                    border: '1px solid #2d5247',
                    color: '#F7FAF9',
                    borderRadius: '12px',
                  }}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleDemoConfirm}
                  disabled={loading}
                  size="lg"
                  className="px-8"
                  style={{
                    backgroundColor: '#3A8F6E',
                    color: '#F7FAF9',
                    borderRadius: '12px',
                    border: 'none',
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Criando dados...
                    </>
                  ) : (
                    <>
                      Confirmar e Popular
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Account Step */}
        {step === 'create-account' && (
          <Card
            style={{
              backgroundColor: '#1a362f',
              border: '1px solid #2d5247',
              borderRadius: '18px',
              boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 6px 14px rgba(0,0,0,.3)',
            }}
          >
            <CardHeader className="text-center">
              <div
                className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#152b26' }}
              >
                <Wallet className="h-8 w-8" style={{ color: '#F7FAF9' }} />
              </div>
              <CardTitle className="text-3xl font-bold mb-2" style={{ color: '#F7FAF9' }}>
                Criar Primeira Conta
              </CardTitle>
              <CardDescription style={{ color: '#BBC5C2' }}>
                Configure sua primeira conta bancária ou cartão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountForm
                onSubmit={handleAccountCreate}
                onCancel={() => setStep('choose-mode')}
                isLoading={loading}
                submitLabel="Criar e Continuar"
              />
            </CardContent>
          </Card>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <Card
            style={{
              backgroundColor: '#1a362f',
              border: '1px solid #2d5247',
              borderRadius: '18px',
              boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 6px 14px rgba(0,0,0,.3)',
            }}
          >
            <CardHeader className="text-center pb-8">
              <div
                className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#5FC883' }}
              >
                <CheckCircle2 className="h-10 w-10" style={{ color: '#F7FAF9' }} />
              </div>
              <CardTitle className="text-4xl font-bold mb-3" style={{ color: '#F7FAF9' }}>
                Tudo Pronto!
              </CardTitle>
              <CardDescription className="text-lg" style={{ color: '#BBC5C2' }}>
                Seu Cortex Cash está configurado e pronto para usar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p style={{ color: '#BBC5C2' }}>
                  {selectedMode === 'demo'
                    ? 'Explore o dashboard com dados de exemplo e conheça todas as funcionalidades.'
                    : 'Comece a adicionar transações e acompanhe suas finanças em tempo real.'}
                </p>

                <Button
                  onClick={handleComplete}
                  size="lg"
                  className="px-8"
                  style={{
                    backgroundColor: '#3A8F6E',
                    color: '#F7FAF9',
                    borderRadius: '12px',
                    border: 'none',
                  }}
                >
                  Ir para o Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

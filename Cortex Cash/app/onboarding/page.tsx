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

      setChecking(false);
    } catch (error) {
      console.error('Erro ao verificar status do onboarding:', error);
      setChecking(false);
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
      // Criar instituição padrão se necessário
      const { instituicaoService } = await import('@/lib/services/instituicao.service');
      let instituicaoId = 'default-institution-id';

      try {
        const instituicoes = await instituicaoService.listInstituicoes();
        if (instituicoes.length === 0) {
          const instituicao = await instituicaoService.createInstituicao({
            nome: 'Minha Instituição',
            cor: '#18B0A4',
          });
          instituicaoId = instituicao.id;
        } else {
          instituicaoId = instituicoes[0].id;
        }
      } catch (error) {
        console.error('Erro ao criar/buscar instituição:', error);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-400 mx-auto mb-4" />
          <p className="text-white/70">Verificando configuração inicial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-4xl">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <Card className="border-white/20 bg-gradient-to-br from-gray-800 to-gray-900">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-4xl font-bold text-white mb-3">
                Bem-vindo ao Cortex Cash
              </CardTitle>
              <CardDescription className="text-lg text-white/70">
                Seu assistente financeiro inteligente com IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-6 rounded-lg bg-white/5 border border-white/10">
                  <BarChart3 className="h-8 w-8 text-teal-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-white mb-2">Análises Avançadas</h3>
                  <p className="text-xs text-white/60">Dashboards e relatórios inteligentes</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-white/5 border border-white/10">
                  <TrendingUp className="h-8 w-8 text-teal-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-white mb-2">Classificação IA</h3>
                  <p className="text-xs text-white/60">Categorização automática com GPT-4o</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-white/5 border border-white/10">
                  <Shield className="h-8 w-8 text-teal-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-white mb-2">100% Local</h3>
                  <p className="text-xs text-white/60">Seus dados ficam no seu navegador</p>
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="text-center">
                <Button
                  onClick={() => setStep('choose-mode')}
                  size="lg"
                  className="text-white px-8"
                  style={{
                    background: 'linear-gradient(135deg, #18B0A4 0%, #16a89d 100%)',
                    backgroundColor: '#18B0A4',
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
          <Card className="border-white/20 bg-gradient-to-br from-gray-800 to-gray-900">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-white mb-2">
                Como você quer começar?
              </CardTitle>
              <CardDescription className="text-white/70">
                Escolha entre explorar com dados de exemplo ou criar sua primeira conta real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Demo Mode */}
                <button
                  onClick={() => handleModeSelection('demo')}
                  className="group relative overflow-hidden rounded-xl border-2 border-white/20 p-6 text-left transition-all hover:border-teal-400 hover:shadow-xl hover:shadow-teal-500/20"
                  style={{
                    background: 'linear-gradient(135deg, rgba(24, 176, 164, 0.1) 0%, rgba(22, 168, 157, 0.05) 100%)',
                  }}
                >
                  <Badge className="mb-4 bg-teal-500 text-white">RECOMENDADO</Badge>
                  <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-lg bg-teal-500/20">
                    <Database className="h-8 w-8 text-teal-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Modo Demonstração</h3>
                  <p className="text-sm text-white/70 mb-4">
                    Explore todas as funcionalidades com dados de exemplo já populados
                  </p>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-400" />
                      6 contas pré-configuradas
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-400" />
                      90+ transações de exemplo
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-400" />
                      Dashboards prontos para explorar
                    </li>
                  </ul>
                </button>

                {/* Real Mode */}
                <button
                  onClick={() => handleModeSelection('real')}
                  className="group relative overflow-hidden rounded-xl border-2 border-white/20 p-6 text-left transition-all hover:border-white/40 hover:shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  }}
                >
                  <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-lg bg-white/10">
                    <Wallet className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Começar do Zero</h3>
                  <p className="text-sm text-white/70 mb-4">
                    Crie sua primeira conta e comece a gerenciar suas finanças reais
                  </p>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-white/60" />
                      Configure sua primeira conta
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-white/60" />
                      Seus dados reais desde o início
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-white/60" />
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
          <Card className="border-white/20 bg-gradient-to-br from-gray-800 to-gray-900">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center">
                <Database className="h-8 w-8 text-teal-400" />
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                Popular com Dados Demo
              </CardTitle>
              <CardDescription className="text-white/70">
                Vamos criar contas e transações de exemplo para você explorar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-6">
                <h4 className="text-sm font-semibold text-teal-400 mb-3">O que será criado:</h4>
                <ul className="space-y-2 text-sm text-white/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-400" />
                    5 instituições financeiras (Nubank, BB, Itaú, Inter, C6)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-400" />
                    6 contas diversas (corrente, poupança, investimento, carteira)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-400" />
                    90+ transações dos últimos 3 meses
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-400" />
                    Receitas e despesas categorizadas
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-400">
                  <strong>Nota:</strong> Você poderá limpar esses dados a qualquer momento nas configurações.
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setStep('choose-mode')}
                  disabled={loading}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleDemoConfirm}
                  disabled={loading}
                  size="lg"
                  className="text-white px-8"
                  style={{
                    background: 'linear-gradient(135deg, #18B0A4 0%, #16a89d 100%)',
                    backgroundColor: '#18B0A4',
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
          <Card className="border-white/20 bg-gradient-to-br from-gray-800 to-gray-900">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                Criar Primeira Conta
              </CardTitle>
              <CardDescription className="text-white/70">
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
          <Card className="border-white/20 bg-gradient-to-br from-gray-800 to-gray-900">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-4xl font-bold text-white mb-3">
                Tudo Pronto!
              </CardTitle>
              <CardDescription className="text-lg text-white/70">
                Seu Cortex Cash está configurado e pronto para usar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-white/80">
                  {selectedMode === 'demo'
                    ? 'Explore o dashboard com dados de exemplo e conheça todas as funcionalidades.'
                    : 'Comece a adicionar transações e acompanhe suas finanças em tempo real.'}
                </p>

                <Button
                  onClick={handleComplete}
                  size="lg"
                  className="text-white px-8"
                  style={{
                    background: 'linear-gradient(135deg, #18B0A4 0%, #16a89d 100%)',
                    backgroundColor: '#18B0A4',
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

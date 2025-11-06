"use client";

/**
 * Dev Tool: Seed de Regras de Classificação
 * Agent FINANCE: Owner
 */

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Loader2, Play, Trash2, RefreshCw } from 'lucide-react';
import { seedCommonRules, clearCommonRules, REGRAS_COMUNS } from '@/lib/db/seed-rules';
import { toast } from 'sonner';

export default function SeedRulesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleSeed = async () => {
    try {
      setLoading(true);
      setResult(null);
      toast.info('Iniciando seed de regras...');

      const res = await seedCommonRules();
      setResult(res);

      if (res.inserted > 0) {
        toast.success(`${res.inserted} regras criadas com sucesso!`);
      }
      if (res.skipped > 0) {
        toast.info(`${res.skipped} regras já existiam`);
      }
      if (res.errors.length > 0) {
        toast.error(`${res.errors.length} erros encontrados`);
      }
    } catch (error) {
      console.error('Erro no seed:', error);
      toast.error('Erro ao executar seed');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Tem certeza que deseja remover TODAS as regras de seed? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      const count = await clearCommonRules();
      toast.success(`${count} regras removidas`);
      setResult(null);
    } catch (error) {
      console.error('Erro ao limpar:', error);
      toast.error('Erro ao remover regras');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Tem certeza que deseja resetar? Isso vai remover e recriar todas as regras de seed.')) {
      return;
    }

    try {
      setLoading(true);
      toast.info('Resetando regras...');

      // Remove antigas
      await clearCommonRules();

      // Cria novas
      const res = await seedCommonRules();
      setResult(res);

      if (res.inserted > 0) {
        toast.success(`Reset completo! ${res.inserted} regras criadas`);
      }
    } catch (error) {
      console.error('Erro no reset:', error);
      toast.error('Erro ao resetar regras');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Seed de Regras de Classificação</h1>
          <p className="text-muted-foreground mt-2">
            Ferramenta de desenvolvimento para popular o banco com regras comuns
          </p>
        </div>

        <Separator />

        {/* Warning */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta é uma ferramenta de desenvolvimento. Use apenas em ambiente de teste.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>
              Gerencie o seed de {REGRAS_COMUNS.length} regras comuns de classificação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={handleSeed}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Executar Seed
                  </>
                )}
              </Button>

              <Button
                onClick={handleClear}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Seed
              </Button>

              <Button
                onClick={handleReset}
                disabled={loading}
                variant="secondary"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Completo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Resultado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                  <span className="text-2xl font-bold">{result.inserted}</span>
                  <span className="text-sm text-muted-foreground">Inseridas</span>
                </div>

                <div className="flex flex-col items-center p-4 bg-blue-500/10 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-blue-500 mb-2" />
                  <span className="text-2xl font-bold">{result.skipped}</span>
                  <span className="text-sm text-muted-foreground">Puladas</span>
                </div>

                <div className="flex flex-col items-center p-4 bg-red-500/10 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                  <span className="text-2xl font-bold">{result.errors.length}</span>
                  <span className="text-sm text-muted-foreground">Erros</span>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Erros:</h4>
                  <div className="space-y-1">
                    {result.errors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preview of Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Regras Disponíveis ({REGRAS_COMUNS.length})</CardTitle>
            <CardDescription>Preview das regras que serão criadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {REGRAS_COMUNS.map((regra, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{regra.prioridade}</Badge>
                      <span className="font-medium">{regra.nome}</span>
                      <Badge>{regra.tipo_regra}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {regra.descricao || regra.padrao}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    → {regra.categoria_nome}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

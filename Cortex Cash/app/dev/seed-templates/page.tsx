'use client';

import { useState } from 'react';
import { seedBankTemplates, clearBankTemplates, areTemplatesSeeded } from '@/lib/import/templates/seed-templates';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Página para seed de templates de importação
 * Agent IMPORT: Dev Tool
 *
 * Acesse: /dev/seed-templates
 */
export default function SeedTemplatesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setResult(null);

    try {
      const count = await seedBankTemplates();
      setResult({
        success: true,
        message: `Templates inseridos/atualizados com sucesso!`,
        count,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    setResult(null);

    try {
      const count = await clearBankTemplates();
      setResult({
        success: true,
        message: `${count} templates removidos com sucesso!`,
        count,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    setLoading(true);
    setResult(null);

    try {
      const seeded = await areTemplatesSeeded();
      setResult({
        success: true,
        message: seeded
          ? 'Templates já foram inseridos no banco de dados'
          : 'Templates ainda não foram inseridos',
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">
          Seed de Templates de Importação
        </h1>
        <p className="text-gray-400 mb-8">
          Ferramenta de desenvolvimento para popular o banco com templates pré-configurados
          de bancos brasileiros
        </p>

        <Card
          style={{
            backgroundColor: 'rgb(15, 23, 42)',
            borderColor: 'rgb(30, 41, 59)',
            padding: '1.5rem',
          }}
        >
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={handleSeed}
                disabled={loading}
                style={{
                  backgroundColor: 'rgb(59, 130, 246)',
                  color: 'white',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Inserir/Atualizar Templates'
                )}
              </Button>

              <Button
                onClick={handleCheck}
                disabled={loading}
                variant="outline"
                style={{
                  borderColor: 'rgb(71, 85, 105)',
                  color: 'white',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar Status'
                )}
              </Button>

              <Button
                onClick={handleClear}
                disabled={loading}
                variant="destructive"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Removendo...
                  </>
                ) : (
                  'Limpar Templates'
                )}
              </Button>
            </div>

            {result && (
              <div
                className="rounded-md p-4 flex items-start gap-3"
                style={{
                  backgroundColor: result.success
                    ? 'rgb(22, 101, 52, 0.2)'
                    : 'rgb(127, 29, 29, 0.2)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: result.success
                    ? 'rgb(34, 197, 94)'
                    : 'rgb(239, 68, 68)',
                }}
              >
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-white font-medium">{result.message}</p>
                  {result.count !== undefined && (
                    <p className="text-gray-400 text-sm mt-1">
                      Total: {result.count} templates
                    </p>
                  )}
                </div>
              </div>
            )}

            <div
              className="rounded-md p-4 flex items-start gap-3"
              style={{
                backgroundColor: 'rgb(29, 78, 216, 0.1)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgb(59, 130, 246)',
              }}
            >
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-white mb-2">Templates incluídos:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Nubank - Extrato de Conta</li>
                  <li>Inter - Extrato de Conta</li>
                  <li>C6 Bank - Extrato</li>
                  <li>PicPay - Extrato</li>
                  <li>Bradesco - Extrato de Conta Corrente</li>
                  <li>Itaú - Extrato de Conta Corrente</li>
                  <li>Santander - Extrato de Conta</li>
                  <li>Banco do Brasil - Extrato</li>
                  <li>Caixa Econômica - Extrato</li>
                  <li>Genérico - Formato Brasileiro</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <a
            href="/import"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Ir para página de importação
          </a>
        </div>
      </div>
    </div>
  );
}

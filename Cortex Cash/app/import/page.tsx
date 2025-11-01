"use client";

/**
 * Página de Importação de Transações
 * Agent IMPORT: Owner
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { FileUpload } from "@/components/import/file-upload";
import { ColumnMapper } from "@/components/import/column-mapper";
import { TransactionPreview } from "@/components/import/transaction-preview";
import { ClassificationRules } from "@/components/import/classification-rules";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Settings, CheckCircle } from "lucide-react";
import { importService } from "@/lib/services/import.service";
import { contaService } from "@/lib/services/conta.service";
import { toast } from "sonner";
import type {
  MapeamentoColunas,
  ParseConfig,
  ParsedTransacao,
  FileFormat,
  Conta,
} from "@/lib/types";

type ImportStep = "upload" | "format" | "map" | "preview" | "complete";

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<ImportStep>("upload");
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState<string>("");

  // Estado do arquivo
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [conteudoArquivo, setConteudoArquivo] = useState<string>("");
  const [formatoDetectado, setFormatoDetectado] = useState<FileFormat | null>(null);

  // Estado do mapeamento CSV
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<string[][]>([]);

  // Estado das transações
  const [transacoesParsed, setTransacoesParsed] = useState<ParsedTransacao[]>([]);
  const [transacoesDuplicadas, setTransacoesDuplicadas] = useState<ParsedTransacao[]>([]);
  const [loading, setLoading] = useState(false);

  const carregarContas = async () => {
    try {
      const listaContas = await contaService.listContas({ incluirInativas: false });
      setContas(listaContas);
      if (listaContas.length > 0) {
        setContaSelecionada(listaContas[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
      toast.error("Erro ao carregar contas");
    }
  };

  // Carregar contas ao montar o componente
  useEffect(() => {
    carregarContas();
  }, []);

  const handleFileSelect = async (file: File, content: string) => {
    setArquivo(file);
    setConteudoArquivo(content);

    try {
      // Detectar formato
      const formato = await importService.detectFormat(content);
      setFormatoDetectado(formato);

      // Se for CSV, preparar mapeamento
      if (formato.tipo === "csv" && formato.detectado.headers) {
        const lines = content.split("\n");
        const separador = formato.detectado.separador || ",";

        // Pegar headers
        const headerLine = lines[0].split(separador).map((h) => h.trim());
        setHeaders(headerLine);

        // Pegar amostra de dados (linhas 1-5)
        const data = lines
          .slice(1, 6)
          .filter((line) => line.trim())
          .map((line) => line.split(separador).map((c) => c.trim()));
        setSampleData(data);

        setStep("map");
      } else if (formato.tipo === "ofx") {
        // OFX não precisa mapeamento
        await parseOFX(content);
      } else {
        toast.error("Formato de arquivo não suportado ainda");
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo");
    }
  };

  const handleMapConfirm = async (
    mapeamento: MapeamentoColunas,
    config: ParseConfig
  ) => {
    if (!conteudoArquivo || !formatoDetectado) return;

    setLoading(true);

    try {
      const separador = formatoDetectado.detectado.separador || ",";

      const result = await importService.parseCSV(conteudoArquivo, mapeamento, {
        ...config,
        separador,
        pular_linhas: 1,
      });

      if (result.erros.length > 0) {
        toast.error(
          `${result.erros.length} erros encontrados durante o parse`,
          {
            description: result.erros[0].mensagem,
          }
        );
      }

      if (result.transacoes.length === 0) {
        toast.error("Nenhuma transação válida encontrada no arquivo");
        return;
      }

      // Deduplica
      if (contaSelecionada) {
        const dedupeResult = await importService.deduplicateTransactions(
          contaSelecionada,
          result.transacoes
        );

        setTransacoesParsed(dedupeResult.transacoes_unicas);
        setTransacoesDuplicadas(dedupeResult.transacoes_duplicadas);

        if (dedupeResult.duplicatas > 0) {
          toast.info(`${dedupeResult.duplicatas} transações duplicadas removidas`);
        }
      } else {
        setTransacoesParsed(result.transacoes);
      }

      setStep("preview");
    } catch (error) {
      console.error("Erro ao fazer parse:", error);
      toast.error("Erro ao processar transações");
    } finally {
      setLoading(false);
    }
  };

  const parseOFX = async (content: string) => {
    setLoading(true);

    try {
      const result = await importService.parseOFX(content);

      if (result.erros.length > 0) {
        toast.error(
          `${result.erros.length} erros encontrados durante o parse OFX`,
          {
            description: result.erros[0].mensagem,
          }
        );
      }

      if (result.transacoes.length === 0) {
        toast.error("Nenhuma transação encontrada no arquivo OFX");
        return;
      }

      // Deduplica
      if (contaSelecionada) {
        const dedupeResult = await importService.deduplicateTransactions(
          contaSelecionada,
          result.transacoes
        );

        setTransacoesParsed(dedupeResult.transacoes_unicas);
        setTransacoesDuplicadas(dedupeResult.transacoes_duplicadas);

        if (dedupeResult.duplicatas > 0) {
          toast.info(`${dedupeResult.duplicatas} transações duplicadas removidas`);
        }
      } else {
        setTransacoesParsed(result.transacoes);
      }

      setStep("preview");
    } catch (error) {
      console.error("Erro ao processar OFX:", error);
      toast.error("Erro ao processar arquivo OFX");
    } finally {
      setLoading(false);
    }
  };

  const handleImportConfirm = async (transacoes: ParsedTransacao[]) => {
    if (!contaSelecionada) {
      toast.error("Selecione uma conta para importar");
      return;
    }

    setLoading(true);

    try {
      const result = await importService.importTransactions(
        contaSelecionada,
        transacoes
      );

      if (result.erros.length > 0) {
        toast.warning(
          `${result.importadas} transações importadas com ${result.erros.length} erros`,
          {
            description: result.erros[0].mensagem,
          }
        );
      } else {
        toast.success(`${result.importadas} transações importadas com sucesso!`);
      }

      setStep("complete");

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push("/transactions");
      }, 2000);
    } catch (error) {
      console.error("Erro ao importar transações:", error);
      toast.error("Erro ao importar transações");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setStep("upload");
    setArquivo(null);
    setConteudoArquivo("");
    setFormatoDetectado(null);
    setHeaders([]);
    setSampleData([]);
    setTransacoesParsed([]);
    setTransacoesDuplicadas([]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">
            Importar Transações
          </h1>
          <p className="text-white/70">
            Importe extratos bancários de CSV, OFX ou Excel
          </p>
        </div>

        {/* Card Principal Integrado */}
        {step !== "complete" && (
          <Card
            className="p-6"
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563'
            }}
          >
            <div className="space-y-6">
              {/* Steps Indicator */}
              <div className="flex items-center justify-between">
                <StepIndicator
                  icon={<Upload className="h-5 w-5" />}
                  label="Upload"
                  active={step === "upload"}
                  completed={["map", "preview", "complete"].includes(step)}
                />
                <div className="flex-1 h-px bg-white/20 mx-4" />
                <StepIndicator
                  icon={<Settings className="h-5 w-5" />}
                  label="Configurar"
                  active={step === "map"}
                  completed={["preview", "complete"].includes(step)}
                />
                <div className="flex-1 h-px bg-white/20 mx-4" />
                <StepIndicator
                  icon={<FileText className="h-5 w-5" />}
                  label="Preview"
                  active={step === "preview"}
                  completed={false}
                />
                <div className="flex-1 h-px bg-white/20 mx-4" />
                <StepIndicator
                  icon={<CheckCircle className="h-5 w-5" />}
                  label="Concluído"
                  active={false}
                  completed={false}
                />
              </div>

              {/* Seleção de Conta */}
              <div className="space-y-2">
                <Label htmlFor="conta" className="text-white">Importar para a conta</Label>
                <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                  <SelectTrigger
                    id="conta"
                    className="!bg-[#1e293b] !text-white !border-white/20"
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      borderColor: 'rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <SelectValue placeholder="Selecione uma conta" className="!text-white/70" />
                  </SelectTrigger>
                  <SelectContent
                    className="!bg-gray-800 !border-gray-700"
                    style={{
                      backgroundColor: '#1f2937',
                      borderColor: '#374151'
                    }}
                  >
                    {contas.map((conta) => (
                      <SelectItem
                        key={conta.id}
                        value={conta.id}
                        className="!text-white hover:!bg-gray-700 cursor-pointer"
                        style={{ color: '#ffffff' }}
                      >
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Templates Rápidos */}
              {step === "upload" && (
                <div className="space-y-3">
                  <Label className="text-white">Templates Rápidos</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10 h-auto py-3 flex flex-col gap-1"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = '/examples/template.csv';
                        link.download = 'template_cortex_cash.csv';
                        link.click();
                      }}
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-xs">CSV Template</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10 h-auto py-3 flex flex-col gap-1"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = '/examples/template.xlsx';
                        link.download = 'template_cortex_cash.xlsx';
                        link.click();
                      }}
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-xs">XLSX Template</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10 h-auto py-3 flex flex-col gap-1"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = '/examples/template.txt';
                        link.download = 'template_cortex_cash.txt';
                        link.click();
                      }}
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-xs">TXT Template</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Área de Upload Compacta */}
              {step === "upload" && (
                <div>
                  <Label className="text-white mb-2 block">Upload de Arquivo</Label>
                  <FileUpload onFileSelect={handleFileSelect} compact />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Conteúdo por Step */}
        {step === "map" && (
          <ColumnMapper
            headers={headers}
            sampleData={sampleData}
            onConfirm={handleMapConfirm}
            onCancel={handleCancel}
          />
        )}

        {step === "preview" && (
          <TransactionPreview
            transacoes={transacoesParsed}
            duplicadas={transacoesDuplicadas}
            onConfirm={handleImportConfirm}
            onCancel={handleCancel}
            loading={loading}
          />
        )}

        {step === "complete" && (
          <Card
            className="p-12 text-center"
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563'
            }}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Importação Concluída!</h3>
                <p className="text-white/70 mt-2">
                  Suas transações foram importadas com sucesso.
                </p>
                <p className="text-sm text-white/70">
                  Redirecionando para transações...
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Regras de Classificação */}
        <ClassificationRules />
      </div>
    </DashboardLayout>
  );
}

function StepIndicator({
  icon,
  label,
  active,
  completed,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors ${
          completed
            ? "border-white/20 text-white"
            : active
            ? "border-white/20 text-white"
            : "border-white/20 text-white/50"
        }`}
        style={
          completed
            ? { backgroundColor: '#18B0A4', borderColor: '#18B0A4' }
            : active
            ? { borderColor: '#18B0A4' }
            : undefined
        }
      >
        {icon}
      </div>
      <span
        className={`text-sm font-medium ${
          active ? "text-white" : "text-white/70"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

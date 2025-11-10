"use client";

/**
 * Import Wizard (Reusable)
 * Encapsula o fluxo de importação para uso tanto na página dedicada
 * quanto embutido em outras telas (ex.: Transações).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/import/file-upload";
import { ColumnMapper } from "@/components/import/column-mapper";
import { TransactionPreview } from "@/components/import/transaction-preview";
import { ClassificationRules } from "@/components/import/classification-rules";
import { TemplateSelector } from "@/components/import/template-selector";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, Settings, CheckCircle, Sparkles } from "lucide-react";
import { importService } from "@/lib/services/import.service";
import { contaService } from "@/lib/services/conta.service";
import { transacaoService } from "@/lib/services/transacao.service";
import { useBatchClassification } from "@/lib/hooks/use-batch-classification";
import { useSetting } from "@/app/providers/settings-provider";
import { toast } from "sonner";
import type {
  MapeamentoColunas,
  ParseConfig,
  ParsedTransacao,
  FileFormat,
  Conta,
  TemplateImportacao,
} from "@/lib/types";

type ImportStep = "template" | "upload" | "format" | "map" | "preview" | "complete";
type ProcessingStage = "parsing" | "deduplicating" | "importing" | null;

export interface ImportWizardProps {
  redirectOnComplete?: boolean;
  showClassificationRules?: boolean;
  title?: string;
}

export function ImportWizard({
  redirectOnComplete = true,
  showClassificationRules = true,
  title,
}: ImportWizardProps) {
  const router = useRouter();

  const [step, setStep] = useState<ImportStep>("template");
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState<string>("");

  // Batch classification hook
  const { classify, isClassifying } = useBatchClassification();

  // Settings
  const [autoApplyOnImport] = useSetting<boolean>("aiCosts.autoApplyOnImport");
  const [confidenceThreshold] = useSetting<number>("aiCosts.confidenceThreshold");
  const [aiEnabled] = useSetting<boolean>("aiCosts.enabled");

  // Estado do template
  const [templateSelecionado, setTemplateSelecionado] = useState<TemplateImportacao | null>(null);

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
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(null);
  const [progress, setProgress] = useState(0);

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

  useEffect(() => {
    carregarContas();
  }, []);

  const handleTemplateSelect = (template: TemplateImportacao) => {
    setTemplateSelecionado(template);
    setStep("upload");
    toast.success(`Template "${template.nome}" selecionado`);
  };

  const handleSkipTemplate = () => {
    setTemplateSelecionado(null);
    setStep("upload");
  };

  const handleFileSelect = async (file: File, content: string) => {
    setArquivo(file);
    setConteudoArquivo(content);
    setLoading(true);
    setProcessingStage("parsing");
    setProgress(20);

    try {
      // Detectar formato
      const formato = await importService.detectFormat(content);
      setFormatoDetectado(formato);
      setProgress(40);

      // Se tem template, usar configuração do template
      if (templateSelecionado && formato.tipo === "csv") {
        const separador = templateSelecionado.separador || ",";
        const mapeamento = JSON.parse(templateSelecionado.mapeamento_colunas);

        setProgress(60);

        // Parse direto com template
        const result = await importService.parseCSV(content, mapeamento, {
          separador,
          pular_linhas: templateSelecionado.pular_linhas,
          formato_data: templateSelecionado.formato_data,
          separador_decimal: templateSelecionado.separador_decimal as "," | "." | undefined,
        });

        setProgress(80);

        if (result.erros.length > 0) {
          toast.warning(`${result.erros.length} erros encontrados`, {
            description: result.erros[0].mensagem,
          });
        }

        if (result.transacoes.length === 0) {
          toast.error("Nenhuma transação válida encontrada");
          setLoading(false);
          setProcessingStage(null);
          return;
        }

        // Deduplica
        if (contaSelecionada) {
          setProcessingStage("deduplicating");
          const dedupeResult = await importService.deduplicateTransactions(contaSelecionada, result.transacoes);

          setTransacoesParsed(dedupeResult.transacoes_unicas);
          setTransacoesDuplicadas(dedupeResult.transacoes_duplicadas);

          if (dedupeResult.duplicatas > 0) {
            toast.info(`${dedupeResult.duplicatas} duplicadas removidas`);
          }
        } else {
          setTransacoesParsed(result.transacoes);
        }

        setProgress(100);
        setStep("preview");
        toast.success(`${result.transacoes.length} transações processadas!`);
      }
      // Se for CSV sem template, preparar mapeamento manual
      else if (formato.tipo === "csv" && formato.detectado.headers) {
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

        setProgress(100);
        setStep("map");
        toast.info("Configure o mapeamento de colunas");
      } else if (formato.tipo === "ofx") {
        // OFX não precisa mapeamento
        setProgress(60);
        await parseOFX(content);
      } else {
        toast.error("Formato de arquivo não suportado ainda");
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo");
    } finally {
      setLoading(false);
      setProcessingStage(null);
      setProgress(0);
    }
  };

  const handleMapConfirm = async (mapeamento: MapeamentoColunas, config: ParseConfig) => {
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
        toast.error(`${result.erros.length} erros encontrados durante o parse`, {
          description: result.erros[0].mensagem,
        });
      }

      if (result.transacoes.length === 0) {
        toast.error("Nenhuma transação válida encontrada no arquivo");
        return;
      }

      // Deduplica
      if (contaSelecionada) {
        const dedupeResult = await importService.deduplicateTransactions(contaSelecionada, result.transacoes);

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
        toast.error(`${result.erros.length} erros encontrados durante o parse OFX`, {
          description: result.erros[0].mensagem,
        });
      }

      if (result.transacoes.length === 0) {
        toast.error("Nenhuma transação encontrada no arquivo OFX");
        return;
      }

      // Deduplica
      if (contaSelecionada) {
        const dedupeResult = await importService.deduplicateTransactions(contaSelecionada, result.transacoes);

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
    setProcessingStage("importing");
    setProgress(0);

    try {
      const totalTransacoes = transacoes.length;
      let importadas = 0;

      // Simular progresso durante a importação
      const progressInterval = setInterval(() => {
        importadas += Math.ceil(totalTransacoes / 10);
        const currentProgress = Math.min((importadas / totalTransacoes) * 100, 90);
        setProgress(currentProgress);
      }, 200);

      const result = await importService.importTransactions(contaSelecionada, transacoes);

      clearInterval(progressInterval);
      setProgress(100);

      if (result.erros.length > 0) {
        toast.warning(`${result.importadas} transações importadas com ${result.erros.length} erros`, {
          description: result.erros[0].mensagem,
          duration: 5000,
        });
      } else {
        toast.success(`${result.importadas} transações importadas com sucesso! 🎉`, {
          duration: 2000,
        });
      }

      // Classificação automática após importação (se configurado)
      if (aiEnabled && autoApplyOnImport && result.importadas > 0) {
        toast.info("🤖 Classificando transações com IA...", {
          duration: 2000,
        });

        // Buscar transações recém-importadas da conta
        const transacoesImportadas = await transacaoService.listTransacoes({
          contaId: contaSelecionada,
          limit: result.importadas,
        });

        // Preparar items para classificação (apenas transações sem categoria, excluindo transferências)
        const itemsParaClassificar = transacoesImportadas
          .filter((t) => !t.categoria_id && t.tipo !== "transferencia")
          .map((t) => ({
            id: t.id,
            descricao: t.descricao,
            valor: Math.abs(t.valor),
            tipo: t.tipo as "receita" | "despesa",
            transacao_id: t.id,
          }));

        if (itemsParaClassificar.length > 0) {
          const classificationResult = await classify(itemsParaClassificar);

          if (classificationResult) {
            // Aplicar categorias com confiança acima do threshold
            const threshold = confidenceThreshold || 0.7;
            let aplicadas = 0;

            for (const result of classificationResult.results) {
              if (result.categoria_sugerida_id && result.confianca >= threshold && !result.error) {
                try {
                  await transacaoService.updateTransacao(result.id, {
                    categoria_id: result.categoria_sugerida_id,
                    classificacao_origem: "ia",
                    classificacao_confianca: result.confianca,
                  });
                  aplicadas++;
                } catch (error) {
                  console.error(`Erro ao aplicar categoria para transação ${result.id}:`, error);
                }
              }
            }

            if (aplicadas > 0) {
              toast.success(`✨ ${aplicadas} de ${itemsParaClassificar.length} transações classificadas automaticamente`, {
                description: `Confiança mínima: ${Math.round(threshold * 100)}%`,
                duration: 4000,
              });
            } else {
              toast.info("Nenhuma transação classificada automaticamente", {
                description: `Nenhuma sugestão atingiu ${Math.round(threshold * 100)}% de confiança`,
                duration: 3000,
              });
            }
          }
        }
      }

      setStep("complete");

      if (redirectOnComplete) {
        setTimeout(() => {
          router.push("/transactions");
        }, 2000);
      }
    } catch (error) {
      console.error("Erro ao importar transações:", error);
      toast.error("Erro ao importar transações", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setLoading(false);
      setProcessingStage(null);
      setProgress(0);
    }
  };

  const handleCancel = () => {
    if (templateSelecionado) {
      setStep("upload");
    } else {
      setStep("template");
    }
    setArquivo(null);
    setConteudoArquivo("");
    setFormatoDetectado(null);
    setHeaders([]);
    setSampleData([]);
    setTransacoesParsed([]);
    setTransacoesDuplicadas([]);
  };

  return (
    <div className="space-y-6">
      {/* Header opcional */}
      {title && (
        <div>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <p className="text-white/70">Importe extratos bancários de CSV, OFX ou Excel</p>
        </div>
      )}

      {/* Card Principal Integrado */}
      {step !== "complete" && (
        <Card className="p-6 bg-card">
          <div className="space-y-6">
            {/* Steps Indicator */}
            <div className="flex items-center justify-between">
              <StepIndicator icon={<Upload className="h-5 w-5" />} label="Upload" active={step === "upload"} completed={["map", "preview", "complete"].includes(step)} />
              <div className="flex-1 h-px bg-white/20 mx-4" />
              <StepIndicator icon={<Settings className="h-5 w-5" />} label="Configurar" active={step === "map"} completed={["preview", "complete"].includes(step)} />
              <div className="flex-1 h-px bg-white/20 mx-4" />
              <StepIndicator icon={<FileText className="h-5 w-5" />} label="Preview" active={step === "preview"} completed={false} />
              <div className="flex-1 h-px bg-white/20 mx-4" />
              <StepIndicator icon={<CheckCircle className="h-5 w-5" />} label="Concluído" active={false} completed={false} />
            </div>

            {/* Seleção de Conta */}
            <div className="space-y-2">
              <Label htmlFor="conta" className="text-white">Importar para a conta</Label>
              <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                <SelectTrigger
                  id="conta"
                  className="!bg-[#1e293b] !text-white !border-white/20"
                  style={{
                    backgroundColor: "#1e293b",
                    color: "#ffffff",
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <SelectValue placeholder="Selecione uma conta" className="!text-white/70" />
                </SelectTrigger>
                <SelectContent
                  className="!bg-gray-800 !border-gray-700"
                  style={{
                    backgroundColor: "#1f2937",
                    borderColor: "#374151",
                  }}
                >
                  {contas.map((conta) => (
                    <SelectItem
                      key={conta.id}
                      value={conta.id}
                      className="!text-white hover:!bg-gray-700 cursor-pointer"
                      style={{ color: "#ffffff" }}
                    >
                      {conta.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Indicador de Template Selecionado */}
            {step === "upload" && templateSelecionado && (
              <div
                className="p-4 rounded-lg flex items-center justify-between"
                style={{
                  backgroundColor: "rgb(30, 58, 138, 0.3)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "rgb(59, 130, 246)",
                }}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">{templateSelecionado.nome}</p>
                    <p className="text-sm text-gray-300">Template configurado - Upload automático habilitado</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTemplateSelecionado(null);
                    setStep("template");
                  }}
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/20"
                >
                  Trocar
                </Button>
              </div>
            )}

            {/* Progress Indicator */}
            {loading && processingStage && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">
                    {processingStage === "parsing" && "Processando arquivo..."}
                    {processingStage === "deduplicating" && "Removendo duplicatas..."}
                    {processingStage === "importing" && "Importando transações..."}
                  </span>
                  <span className="text-gray-400">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Área de Upload Compacta */}
            {step === "upload" && !loading && (
              <div>
                <Label className="text-white mb-2 block">Upload de Arquivo</Label>
                <FileUpload onFileSelect={handleFileSelect} compact />

                {!templateSelecionado && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setStep("template")}
                    className="mt-2 text-blue-400 hover:text-blue-300"
                  >
                    ← Voltar para seleção de template
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Conteúdo por Step */}
      {step === "template" && (
        <Card className="p-6 bg-card">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Selecione um template de banco</h2>
                <p className="text-gray-400 text-sm mt-1">Use um template pré-configurado para importação automática</p>
              </div>
              <Button
                variant="outline"
                onClick={handleSkipTemplate}
                style={{
                  borderColor: "rgb(71, 85, 105)",
                  color: "white",
                }}
              >
                Pular e configurar manualmente
              </Button>
            </div>

            <TemplateSelector onSelectTemplate={handleTemplateSelect} selectedTemplateId={templateSelecionado?.id} />
          </div>
        </Card>
      )}

      {step === "map" && (
        <ColumnMapper headers={headers} sampleData={sampleData} onConfirm={handleMapConfirm} onCancel={handleCancel} />
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
        <Card className="p-12 text-center bg-card">
          <div className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Importação Concluída!</h3>
              <p className="text-white/70 mt-2">Suas transações foram importadas com sucesso.</p>
              {redirectOnComplete && (
                <p className="text-sm text-white/70">Redirecionando para transações...</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Regras de Classificação (opcional) */}
      {showClassificationRules && <ClassificationRules />}
    </div>
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
          completed ? "border-white/20 text-white" : active ? "border-white/20 text-white" : "border-white/20 text-white/50"
        }`}
        style={completed ? { backgroundColor: "#18B0A4", borderColor: "#18B0A4" } : active ? { borderColor: "#18B0A4" } : undefined}
      >
        {icon}
      </div>
      <span className={`text-sm font-medium ${active ? "text-white" : "text-white/70"}`}>{label}</span>
    </div>
  );
}



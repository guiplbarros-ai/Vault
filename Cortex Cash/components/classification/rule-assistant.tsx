"use client";

/**
 * Rule Assistant (AI) - Ajuda a construir regras de classificação
 * Agent APP: Owner
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Brain, Wand2 } from "lucide-react";
import { categoriaService } from "@/lib/services/categoria.service";
import { regraClassificacaoService } from "@/lib/services/regra-classificacao.service";

type TipoTransacaoForm = "receita" | "despesa";

interface AISuggestion {
  categoria_id: string;
  categoria_nome: string;
  confianca: number;
  padrao_sugerido: string;
  tipo_regra: "contains" | "regex";
}

export function RuleAssistant() {
  const [descricaoExemplo, setDescricaoExemplo] = useState("");
  const [tipo, setTipo] = useState<TipoTransacaoForm>("despesa");
  const [valor, setValor] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);

  const extractPattern = (descricao: string): string => {
    // Heurística simples: pega o maior token maiúsculo (provável marca/estabelecimento),
    // senão usa primeira palavra com 3+ caracteres
    const upperTokens = descricao
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    let candidate = upperTokens
      .filter(t => t.length >= 3)
      .sort((a, b) => b.length - a.length)[0];

    if (!candidate) {
      const plainTokens = descricao
        .replace(/[^A-Za-zÀ-ú0-9\s]/g, " ")
        .split(/\s+/)
        .filter(t => t.length >= 3);
      candidate = plainTokens[0]?.toUpperCase() || descricao.slice(0, 10).toUpperCase();
    }
    return candidate;
  };

  const askAI = async () => {
    if (!descricaoExemplo.trim()) {
      toast.error("Informe um exemplo de descrição");
      return;
    }

    setLoading(true);
    setSuggestion(null);
    try {
      const categorias = await categoriaService.listCategorias({ tipo, ativas: true });
      const response = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: descricaoExemplo,
          valor: typeof valor === "number" ? Math.abs(valor) : 0,
          tipo,
          categorias: categorias.map(c => ({ id: c.id, nome: c.nome })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || "Falha ao consultar IA");
      }
      const data = await response.json();

      if (!data?.categoria_sugerida_id) {
        toast.warning("A IA não conseguiu sugerir categoria para este exemplo.");
        return;
      }

      const padrao = extractPattern(descricaoExemplo);
      setSuggestion({
        categoria_id: data.categoria_sugerida_id,
        categoria_nome: data.categoria_nome,
        confianca: data.confianca,
        padrao_sugerido: padrao,
        tipo_regra: "contains",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao consultar IA");
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    if (!suggestion) return;
    try {
      await regraClassificacaoService.createRegra({
        nome: `AI: ${suggestion.padrao_sugerido} → ${suggestion.categoria_nome}`,
        categoria_id: suggestion.categoria_id,
        tipo_regra: suggestion.tipo_regra,
        padrao: suggestion.padrao_sugerido,
        // prioridade: não enviar para usar regra de auto-definição no serviço
        ativa: true,
      });
      toast.success("Regra criada com sucesso");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao criar regra");
    }
  };

  return (
    <Card
      style={{
        background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
        backgroundColor: '#3B5563'
      }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-white" />
            <CardTitle className="text-white">Assistente de Regras (IA)</CardTitle>
          </div>
          <CardDescription className="text-white/70">
            Peça sugestões de regras com base em exemplos reais
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 items-end">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-white">Exemplo de descrição</Label>
            <Input
              value={descricaoExemplo}
              onChange={(e) => setDescricaoExemplo(e.target.value)}
              placeholder="Ex: Uber Trip 5ABCD"
              className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Tipo</Label>
            <Select value={tipo} onValueChange={(v: TipoTransacaoForm) => setTipo(v)}>
              <SelectTrigger className="!bg-[#1e293b] !text-white !border-white/20">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="!bg-gray-800 !border-gray-700">
                <SelectItem value="despesa" className="!text-white">Despesa</SelectItem>
                <SelectItem value="receita" className="!text-white">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-white">Valor (opcional)</Label>
            <Input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ex: 34.90"
              className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="opacity-0">.</Label>
            <Button
              onClick={askAI}
              disabled={loading}
              className="w-full text-white"
              style={{ backgroundColor: '#18B0A4' }}
            >
              {loading ? 'Consultando...' : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Pedir sugestão à IA
                </>
              )}
            </Button>
          </div>
        </div>

        {suggestion && (
          <div className="mt-6 p-4 rounded-lg border border-white/20 space-y-3"
               style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-white" />
              <p className="text-white font-medium">Sugestão da IA</p>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="text-white/80">
                <p className="text-xs text-white/60">Categoria</p>
                <p className="font-medium">{suggestion.categoria_nome}</p>
              </div>
              <div className="text-white/80">
                <p className="text-xs text-white/60">Confiança</p>
                <Badge variant="outline" className="font-mono">
                  {Math.round(suggestion.confianca * 100)}%
                </Badge>
              </div>
              <div className="text-white/80">
                <p className="text-xs text-white/60">Padrão sugerido</p>
                <p className="font-mono">{suggestion.padrao_sugerido}</p>
              </div>
            </div>
            <div className="pt-2">
              <Button
                onClick={createRule}
                className="text-white"
                style={{ backgroundColor: '#18B0A4' }}
              >
                Criar regra com esta sugestão
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



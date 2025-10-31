"use client";

/**
 * Componente de Mapeamento de Colunas CSV
 * Agent IMPORT: Owner
 */

import { useState } from "react";
import { ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { MapeamentoColunas, ParseConfig } from "@/lib/types";

interface ColumnMapperProps {
  headers: string[];
  sampleData: string[][];
  onConfirm: (mapeamento: MapeamentoColunas, config: ParseConfig) => void;
  onCancel: () => void;
}

const CAMPOS_OBRIGATORIOS = [
  { value: "data", label: "Data", required: true },
  { value: "descricao", label: "Descrição", required: true },
  { value: "valor", label: "Valor", required: true },
] as const;

const CAMPOS_OPCIONAIS = [
  { value: "tipo", label: "Tipo (Receita/Despesa)" },
  { value: "categoria", label: "Categoria" },
  { value: "observacoes", label: "Observações" },
] as const;

export function ColumnMapper({
  headers,
  sampleData,
  onConfirm,
  onCancel,
}: ColumnMapperProps) {
  const [mapeamento, setMapeamento] = useState<Partial<MapeamentoColunas>>({});
  const [formatoData, setFormatoData] = useState("dd/MM/yyyy");
  const [separadorDecimal, setSeparadorDecimal] = useState(",");

  const handleMapColumn = (campo: string, colIndex: string) => {
    setMapeamento((prev) => ({
      ...prev,
      [campo]: colIndex === "null" ? undefined : parseInt(colIndex),
    }));
  };

  const handleConfirm = () => {
    // Validar campos obrigatórios
    if (
      mapeamento.data === undefined ||
      mapeamento.descricao === undefined ||
      mapeamento.valor === undefined
    ) {
      alert("Por favor, mapeie todos os campos obrigatórios");
      return;
    }

    const mapeamentoCompleto: MapeamentoColunas = {
      data: mapeamento.data,
      descricao: mapeamento.descricao,
      valor: mapeamento.valor,
      tipo: mapeamento.tipo,
      categoria: mapeamento.categoria,
      observacoes: mapeamento.observacoes,
    };

    const config: ParseConfig = {
      formato_data: formatoData,
      separador_decimal: separadorDecimal,
    };

    onConfirm(mapeamentoCompleto, config);
  };

  const isValid =
    mapeamento.data !== undefined &&
    mapeamento.descricao !== undefined &&
    mapeamento.valor !== undefined;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Mapeamento de Colunas</h3>
            <p className="text-sm text-muted-foreground">
              Indique qual coluna do seu arquivo corresponde a cada campo
            </p>
          </div>

          {/* Campos Obrigatórios */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Campos Obrigatórios</h4>
            {CAMPOS_OBRIGATORIOS.map((campo) => (
              <div key={campo.value} className="grid grid-cols-3 gap-4 items-center">
                <Label className="flex items-center gap-2">
                  {campo.label}
                  <span className="text-destructive">*</span>
                </Label>
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                <Select
                  value={
                    mapeamento[campo.value as keyof MapeamentoColunas]?.toString() ||
                    "null"
                  }
                  onValueChange={(value) => handleMapColumn(campo.value, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Não mapear</SelectItem>
                    {headers.map((header, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Coluna {index + 1}: {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Campos Opcionais */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Campos Opcionais</h4>
            {CAMPOS_OPCIONAIS.map((campo) => (
              <div key={campo.value} className="grid grid-cols-3 gap-4 items-center">
                <Label>{campo.label}</Label>
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                <Select
                  value={
                    mapeamento[campo.value as keyof MapeamentoColunas]?.toString() ||
                    "null"
                  }
                  onValueChange={(value) => handleMapColumn(campo.value, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Não mapear" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Não mapear</SelectItem>
                    {headers.map((header, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Coluna {index + 1}: {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Configurações Adicionais */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Configurações de Formato</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="formato-data">Formato de Data</Label>
              <Select value={formatoData} onValueChange={setFormatoData}>
                <SelectTrigger id="formato-data">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                  <SelectItem value="MM/dd/yyyy">MM/DD/AAAA</SelectItem>
                  <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
                  <SelectItem value="dd-MM-yyyy">DD-MM-AAAA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="separador-decimal">Separador Decimal</Label>
              <Select value={separadorDecimal} onValueChange={setSeparadorDecimal}>
                <SelectTrigger id="separador-decimal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">Vírgula (,)</SelectItem>
                  <SelectItem value=".">Ponto (.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview dos Dados */}
      {sampleData.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Preview (primeiras 5 linhas)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {headers.map((header, index) => (
                      <th key={index} className="text-left p-2 font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleData.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="p-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Ações */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleConfirm} disabled={!isValid}>
          <Save className="h-4 w-4 mr-2" />
          Continuar
        </Button>
      </div>
    </div>
  );
}

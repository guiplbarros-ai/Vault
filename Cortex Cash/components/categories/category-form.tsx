"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Categoria, TipoTransacao } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelect, FormColorPicker } from "@/components/forms";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

// Ícones mais comuns para categorias
const ICONES_COMUNS = [
  "🍽️", "🛒", "🍴", "🚗", "⛽", "🚌", "🏠", "🏡", "📄",
  "❤️", "💊", "🏥", "🎓", "📚", "📖", "🎮", "📺", "✈️",
  "👕", "👔", "👟", "💳", "▶️", "💻", "🧾", "📈", "💰",
  "🐶", "📦", "💵", "💼", "📊", "💲", "📉", "🔄", "🏆",
  "🛍️", "💚", "↔️"
];

// Schema de validação
const categorySchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(50, "Nome muito longo"),
  tipo: z.enum(["despesa", "receita", "transferencia"]),
  grupo: z.string().max(50, "Grupo muito longo").optional(),
  icone: z.string().max(10, "Ícone inválido").optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve estar no formato hexadecimal").optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export interface CategoryFormProps {
  categoria?: Categoria;
  categoriaPai?: Categoria;
  onSubmit: (data: {
    nome: string;
    tipo: TipoTransacao;
    grupo?: string;
    pai_id?: string;
    icone?: string;
    cor?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const TIPO_OPTIONS = [
  { value: "despesa", label: "Despesa" },
  { value: "receita", label: "Receita" },
  { value: "transferencia", label: "Transferência" },
];

/**
 * Deriva uma cor mais clara (para subcategoria) a partir da cor base
 * Aumenta o brilho em aproximadamente 20%
 */
function derivarCorSubcategoria(corBase: string): string {
  // Remove o # se existir
  const hex = corBase.replace('#', '');

  // Converte hex para RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Aumenta o brilho misturando com branco (20% branco)
  const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.2));

  const newR = lighten(r);
  const newG = lighten(g);
  const newB = lighten(b);

  // Converte de volta para hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

export function CategoryForm({
  categoria,
  categoriaPai,
  onSubmit,
  onCancel,
  isLoading = false,
}: CategoryFormProps) {
  const [icone, setIcone] = React.useState(categoria?.icone || "📁");
  const [submitting, setSubmitting] = React.useState(false);

  // Derivar cor da categoria pai se estiver criando subcategoria
  const corPadrao = React.useMemo(() => {
    if (categoria?.cor) return categoria.cor;
    if (categoriaPai?.cor) return derivarCorSubcategoria(categoriaPai.cor);
    return "#2d9b9b";
  }, [categoria?.cor, categoriaPai?.cor]);

  const methods = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nome: categoria?.nome || "",
      tipo: categoria?.tipo || categoriaPai?.tipo || "despesa",
      grupo: categoria?.grupo || "",
      icone: categoria?.icone || "📁",
      cor: corPadrao,
    },
  });

  const handleSubmit = methods.handleSubmit(
    async (data: CategoryFormData) => {
      setSubmitting(true);
      try {
        await onSubmit({
          nome: data.nome.trim(),
          tipo: data.tipo,
          grupo: data.grupo?.trim() || undefined,
          pai_id: categoriaPai?.id,
          icone: icone,
          cor: data.cor,
        });
      } finally {
        setSubmitting(false);
      }
    },
    (errors) => {
      console.error("[CategoryForm] Erros de validação:", errors);
    }
  );

  // Sync icone state with form
  React.useEffect(() => {
    methods.setValue("icone", icone);
  }, [icone, methods]);

  const isEditing = !!categoria;
  const isSubcategory = !!categoriaPai;
  const canEditType = !isEditing && !isSubcategory;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        style={
          {
            "--label-color": "#F2F7F5",
            "--description-color": "#B2BDB9",
          } as React.CSSProperties
        }
      >
        {/* Informação de subcategoria */}
        {categoriaPai && (
          <div
            className="p-3 rounded-lg space-y-2"
            style={{ backgroundColor: "#142A25", borderColor: "#2A4942", borderWidth: "1px" }}
          >
            <p className="text-sm" style={{ color: "#B2BDB9" }}>
              Subcategoria de:{" "}
              <span className="font-medium" style={{ color: "#F2F7F5" }}>
                {categoriaPai.icone} {categoriaPai.nome}
              </span>
            </p>
            {categoriaPai.cor && (
              <p className="text-xs flex items-center gap-2" style={{ color: "#8CA39C" }}>
                <span
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: categoriaPai.cor, borderColor: "#2A4942" }}
                />
                Cor base da categoria
                <span className="mx-1">→</span>
                <span
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: corPadrao, borderColor: "#2A4942" }}
                />
                Cor derivada (mais clara)
              </p>
            )}
          </div>
        )}

        {/* Informações Básicas */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium" style={{ color: "#F2F7F5" }}>Informações Básicas</h3>
            <Separator style={{ backgroundColor: "#2A4942" }} />
          </div>

          <div className="form-dark-input">
            <FormInput
              name="nome"
              label="Nome"
              placeholder="Ex: Alimentação, Transporte..."
              required
              className="!bg-[#142A25] !text-[#F2F7F5] !border-[#2A4942] placeholder:!text-[#8CA39C]"
              description="Nome da categoria"
            />
          </div>

          {canEditType && (
            <div className="form-dark-select">
              <FormSelect
                name="tipo"
                label="Tipo"
                options={TIPO_OPTIONS}
                required
                description="Tipo de transação"
              />
            </div>
          )}

          <div className="form-dark-input">
            <FormInput
              name="grupo"
              label="Grupo (opcional)"
              placeholder="Ex: Moradia, Lazer..."
              className="!bg-[#142A25] !text-[#F2F7F5] !border-[#2A4942] placeholder:!text-[#8CA39C]"
              description="Use para agrupar categorias relacionadas"
            />
          </div>
        </div>

        {/* Personalização */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium" style={{ color: "#F2F7F5" }}>Personalização</h3>
            <Separator style={{ backgroundColor: "#2A4942" }} />
          </div>

          {/* Seletor de Ícone */}
          <div className="space-y-3">
            <Label className="text-sm font-medium" style={{ color: '#F2F7F5' }}>Ícone</Label>
            <div className="grid grid-cols-9 gap-2">
              {ICONES_COMUNS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcone(i)}
                  className="p-2 text-2xl rounded-lg border-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: icone === i ? "#213A34" : "#142A25",
                    borderColor: icone === i ? "#3A8F6E" : "#2A4942",
                    transform: icone === i ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  {i}
                </button>
              ))}
            </div>

            {/* Input customizado para emoji */}
            <div
              className="flex items-center gap-3 p-3 rounded-lg border"
              style={{
                backgroundColor: '#142A25',
                borderColor: '#2A4942'
              }}
            >
              <span className="text-3xl">{icone}</span>
              <input
                type="text"
                value={icone}
                onChange={(e) => setIcone(e.target.value)}
                placeholder="Ou digite um emoji..."
                maxLength={10}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{
                  backgroundColor: 'transparent',
                  color: '#F2F7F5',
                }}
              />
            </div>
            <p className="text-xs" style={{ color: '#8CA39C' }}>
              Selecione um ícone ou digite qualquer emoji
            </p>
          </div>

          {/* Seletor de Cor */}
          <div className="form-dark-input">
            <FormColorPicker
              name="cor"
              label="Cor"
              description="Cor para identificação visual da categoria"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-6" style={{ borderTop: "1px solid #213A34" }}>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting || isLoading}
            style={{
              borderColor: "#2A4942",
              color: "#F2F7F5",
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting || isLoading}
            className="min-w-[120px]"
            style={{
              backgroundColor: "#3A8F6E",
              color: "#F2F7F5",
            }}
          >
            {submitting || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : isEditing ? (
              "Atualizar"
            ) : (
              "Criar Categoria"
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

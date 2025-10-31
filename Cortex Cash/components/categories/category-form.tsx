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

export function CategoryForm({
  categoria,
  categoriaPai,
  onSubmit,
  onCancel,
  isLoading = false,
}: CategoryFormProps) {
  const [icone, setIcone] = React.useState(categoria?.icone || "📁");
  const [submitting, setSubmitting] = React.useState(false);

  const methods = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nome: categoria?.nome || "",
      tipo: categoria?.tipo || categoriaPai?.tipo || "despesa",
      grupo: categoria?.grupo || "",
      icone: categoria?.icone || "📁",
      cor: categoria?.cor || "#2d9b9b",
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
            "--label-color": "#ffffff",
            "--description-color": "rgba(255, 255, 255, 0.7)",
          } as React.CSSProperties
        }
      >
        {/* Informação de subcategoria */}
        {categoriaPai && (
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <p className="text-sm text-white/70">
              Subcategoria de:{" "}
              <span className="font-medium text-white">
                {categoriaPai.icone} {categoriaPai.nome}
              </span>
            </p>
          </div>
        )}

        {/* Informações Básicas */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Informações Básicas</h3>
            <Separator className="bg-white/20" />
          </div>

          <div className="form-dark-input">
            <FormInput
              name="nome"
              label="Nome"
              placeholder="Ex: Alimentação, Transporte..."
              required
              className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
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
              className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
              description="Use para agrupar categorias relacionadas"
            />
          </div>
        </div>

        {/* Personalização */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Personalização</h3>
            <Separator className="bg-white/20" />
          </div>

          {/* Seletor de Ícone */}
          <div className="space-y-3">
            <Label className="text-white text-sm font-medium">Ícone</Label>
            <div className="grid grid-cols-9 gap-2">
              {ICONES_COMUNS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcone(i)}
                  className={`p-2 text-2xl rounded-lg border-2 transition-all hover:scale-105 ${
                    icone === i
                      ? "border-[#18B0A4] bg-[#18B0A4]/20 scale-105"
                      : "border-white/20 hover:border-white/40"
                  }`}
                  style={{
                    backgroundColor:
                      icone === i
                        ? "rgba(24, 176, 164, 0.2)"
                        : "rgba(255, 255, 255, 0.05)",
                  }}
                >
                  {i}
                </button>
              ))}
            </div>

            {/* Input customizado para emoji */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1e293b] border border-white/20">
              <span className="text-3xl">{icone}</span>
              <input
                type="text"
                value={icone}
                onChange={(e) => setIcone(e.target.value)}
                placeholder="Ou digite um emoji..."
                maxLength={10}
                className="flex-1 bg-transparent text-white placeholder:text-white/50 outline-none text-sm"
              />
            </div>
            <p className="text-xs text-white/60">
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
        <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting || isLoading}
            style={{
              borderColor: "rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting || isLoading}
            className="min-w-[120px]"
            style={{
              backgroundColor: "#18B0A4",
              color: "#ffffff",
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

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag } from "@/lib/types";

const tagSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(50, "Nome deve ter no máximo 50 caracteres"),
  cor: z.string().optional(),
});

type TagFormData = z.infer<typeof tagSchema>;

export interface TagFormProps {
  tag?: Tag;
  onSubmit: (data: { nome: string; cor?: string }) => Promise<void>;
  onCancel: () => void;
}

const CORES_PREDEFINIDAS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
];

export function TagForm({ tag, onSubmit, onCancel }: TagFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedColor, setSelectedColor] = React.useState(
    tag?.cor || CORES_PREDEFINIDAS[0]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      nome: tag?.nome || "",
      cor: tag?.cor || CORES_PREDEFINIDAS[0],
    },
  });

  React.useEffect(() => {
    setValue("cor", selectedColor);
  }, [selectedColor, setValue]);

  const onSubmitForm = async (data: TagFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="nome" className="text-white">
          Nome da Tag <span className="text-destructive">*</span>
        </Label>
        <Input
          id="nome"
          placeholder="Ex: Trabalho, Pessoal, Urgente..."
          {...register("nome")}
          disabled={tag?.tipo === 'sistema'}
          className="border-0 text-white placeholder:text-white/50"
          style={{
            backgroundColor: '#1e293b',
            color: '#ffffff'
          }}
        />
        {errors.nome && (
          <p className="text-sm text-destructive">{errors.nome.message}</p>
        )}
        {tag?.tipo === 'sistema' && (
          <p className="text-xs text-white/70">
            Tags do sistema não podem ter o nome alterado
          </p>
        )}
      </div>

      {/* Cor */}
      <div className="space-y-3">
        <Label className="text-white">Cor</Label>
        <div className="grid grid-cols-8 gap-2">
          {CORES_PREDEFINIDAS.map((cor) => (
            <button
              key={cor}
              type="button"
              onClick={() => setSelectedColor(cor)}
              className={`w-10 h-10 rounded-md transition-all hover:scale-110 ${
                selectedColor === cor
                  ? "ring-2 ring-offset-2 ring-primary"
                  : ""
              }`}
              style={{ backgroundColor: cor }}
              aria-label={`Selecionar cor ${cor}`}
            />
          ))}
        </div>

        {/* Color Picker Nativo */}
        <div className="flex items-center gap-3">
          <Label htmlFor="color-picker" className="text-sm text-white/70">
            Ou escolha uma cor customizada:
          </Label>
          <input
            id="color-picker"
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="h-10 w-20 rounded border border-white/20 cursor-pointer"
          />
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/70">Preview:</span>
          <div
            className="px-3 py-1 rounded-md text-sm font-medium text-white"
            style={{ backgroundColor: selectedColor }}
          >
            {tag?.nome || "Tag de exemplo"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="border-0 text-white hover:bg-white/10"
          style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : tag ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}

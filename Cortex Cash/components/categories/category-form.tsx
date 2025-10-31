"use client";

import * as React from "react";
import { Categoria, TipoTransacao } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Ícones mais comuns para categorias
const ICONES_COMUNS = [
  "🍽️", "🛒", "🍴", "🚗", "⛽", "🚌", "🏠", "🏡", "📄",
  "❤️", "💊", "🏥", "🎓", "📚", "📖", "🎮", "📺", "✈️",
  "👕", "👔", "👟", "💳", "▶️", "💻", "🧾", "📈", "💰",
  "🐶", "📦", "💵", "💼", "📊", "💲", "📉", "🔄", "🏆",
  "🛍️", "💚", "↔️"
];

// Cores predefinidas
const CORES_PREDEFINIDAS = [
  { nome: "Vermelho", valor: "#ef4444" },
  { nome: "Laranja", valor: "#f97316" },
  { nome: "Âmbar", valor: "#f59e0b" },
  { nome: "Amarelo", valor: "#eab308" },
  { nome: "Lima", valor: "#84cc16" },
  { nome: "Verde", valor: "#10b981" },
  { nome: "Esmeralda", valor: "#059669" },
  { nome: "Teal", valor: "#14b8a6" },
  { nome: "Ciano", valor: "#06b6d4" },
  { nome: "Azul", valor: "#3b82f6" },
  { nome: "Índigo", valor: "#6366f1" },
  { nome: "Violeta", valor: "#8b5cf6" },
  { nome: "Roxo", valor: "#a855f7" },
  { nome: "Fúcsia", valor: "#d946ef" },
  { nome: "Rosa", valor: "#ec4899" },
  { nome: "Cinza", valor: "#6b7280" },
];

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
}

export function CategoryForm({
  categoria,
  categoriaPai,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const [nome, setNome] = React.useState(categoria?.nome || "");
  const [tipo, setTipo] = React.useState<TipoTransacao>(
    categoria?.tipo || categoriaPai?.tipo || "despesa"
  );
  const [grupo, setGrupo] = React.useState(categoria?.grupo || "");
  const [icone, setIcone] = React.useState(categoria?.icone || "📁");
  const [cor, setCor] = React.useState(categoria?.cor || "#2d9b9b");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        nome: nome.trim(),
        tipo,
        grupo: grupo.trim() || undefined,
        pai_id: categoriaPai?.id,
        icone,
        cor,
      });
      toast.success(
        categoria ? "Categoria atualizada!" : "Categoria criada!"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar categoria"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {categoriaPai && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground">
            Subcategoria de:{" "}
            <span className="font-medium text-foreground">
              {categoriaPai.icone} {categoriaPai.nome}
            </span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Alimentação, Transporte..."
          required
          maxLength={50}
        />
      </div>

      {!categoria && !categoriaPai && (
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo *</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoTransacao)}>
            <SelectTrigger id="tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="despesa">Despesa</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="transferencia">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="grupo">Grupo (opcional)</Label>
        <Input
          id="grupo"
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
          placeholder="Ex: Moradia, Lazer..."
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">
          Use para agrupar categorias relacionadas
        </p>
      </div>

      <div className="space-y-2">
        <Label>Ícone</Label>
        <div className="grid grid-cols-10 gap-2">
          {ICONES_COMUNS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIcone(i)}
              className={`p-2 text-2xl rounded border-2 hover:border-primary transition-colors ${
                icone === i ? "border-primary bg-accent" : "border-border"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        <Input
          value={icone}
          onChange={(e) => setIcone(e.target.value)}
          placeholder="Ou digite um emoji..."
          maxLength={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="grid grid-cols-8 gap-2">
          {CORES_PREDEFINIDAS.map((c) => (
            <button
              key={c.valor}
              type="button"
              onClick={() => setCor(c.valor)}
              className={`w-full h-10 rounded border-2 transition-all ${
                cor === c.valor ? "border-primary scale-110" : "border-border"
              }`}
              style={{ backgroundColor: c.valor }}
              title={c.nome}
            />
          ))}
        </div>
        <Input
          type="color"
          value={cor}
          onChange={(e) => setCor(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Salvando..."
            : categoria
            ? "Atualizar"
            : "Criar Categoria"}
        </Button>
      </div>
    </form>
  );
}

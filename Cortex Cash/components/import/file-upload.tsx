"use client";

/**
 * Componente de Upload de Arquivo
 * Agent IMPORT: Owner
 */

import { useCallback, useState } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File, content: string) => void;
  acceptedFormats?: string[];
  maxSizeMB?: number;
  compact?: boolean;
}

export function FileUpload({
  onFileSelect,
  acceptedFormats = [".csv", ".ofx", ".xlsx", ".xls"],
  maxSizeMB = 10,
  compact = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateFile = (file: File): string | null => {
    // Verificar tamanho
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`;
    }

    // Verificar extensão
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedFormats.includes(extension)) {
      return `Formato não suportado. Formatos aceitos: ${acceptedFormats.join(", ")}`;
    }

    return null;
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };

      reader.onerror = () => {
        reject(new Error("Erro ao ler arquivo"));
      };

      // Para arquivos Excel, usar ArrayBuffer; para CSV/OFX, usar texto
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "xlsx" || extension === "xls") {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file, "utf-8");
      }
    });
  };

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);

      // Validar arquivo
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setLoading(false);
        return;
      }

      try {
        // Ler conteúdo
        const content = await readFileContent(file);
        setSelectedFile(file);
        onFileSelect(file, content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
      } finally {
        setLoading(false);
      }
    },
    [onFileSelect, maxSizeMB, acceptedFormats]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return (
    <div>
      {!selectedFile ? (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg text-center transition-colors",
            compact ? "p-6" : "p-12",
            dragActive
              ? "border-white/40 bg-white/10"
              : "border-white/20 hover:border-white/40",
            error && "border-red-400"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept={acceptedFormats.join(",")}
            onChange={handleChange}
            disabled={loading}
          />

          <div className={cn("space-y-3", compact && "space-y-2")}>
            <div className="flex justify-center">
              <Upload className={cn("text-white/70", compact ? "h-8 w-8" : "h-12 w-12")} />
            </div>

            <div className="space-y-2">
              <p className={cn("font-medium text-white", compact ? "text-sm" : "text-lg")}>
                Arraste e solte seu arquivo aqui
              </p>
              {!compact && <p className="text-sm text-white/70">ou</p>}
              <Button
                type="button"
                variant="outline"
                size={compact ? "sm" : "default"}
                disabled={loading}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {loading ? "Carregando..." : "Selecionar Arquivo"}
              </Button>
            </div>

            <div className="text-xs text-white/70 space-y-1">
              <p>Formatos: {acceptedFormats.join(", ")}</p>
              {!compact && <p>Tamanho máximo: {maxSizeMB}MB</p>}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="flex items-center justify-between p-4 border rounded-lg"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-white" style={{ color: '#18B0A4' }} />
            <div>
              <p className="font-medium text-white">{selectedFile.name}</p>
              <p className="text-sm text-white/70">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

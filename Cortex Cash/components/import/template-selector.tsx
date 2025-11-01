'use client';

import { useEffect, useState } from 'react';
import { importService } from '@/lib/services/import.service';
import type { TemplateImportacao } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Star, TrendingUp } from 'lucide-react';

/**
 * Componente para seleção de templates de importação
 * Agent IMPORT: Template Selector UI
 */

interface TemplateSelectorProps {
  onSelectTemplate: (template: TemplateImportacao) => void;
  selectedTemplateId?: string;
}

export function TemplateSelector({
  onSelectTemplate,
  selectedTemplateId,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateImportacao[]>([]);
  const [popularTemplates, setPopularTemplates] = useState<TemplateImportacao[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      searchTemplates();
    } else {
      loadTemplates();
    }
  }, [searchQuery]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const [allTemplates, popular] = await Promise.all([
        importService.listTemplates(),
        importService.getPopularTemplates(5),
      ]);
      setTemplates(allTemplates);
      setPopularTemplates(popular);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchTemplates = async () => {
    setLoading(true);
    try {
      const results = await importService.searchTemplates(searchQuery);
      setTemplates(results);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (template: TemplateImportacao) => {
    // Incrementar contador de uso
    await importService.incrementTemplateUsage(template.id);
    onSelectTemplate(template);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar banco ou template..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            paddingLeft: '2.5rem',
            backgroundColor: '#1e293b',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
          }}
        />
      </div>

      {/* Popular Templates */}
      {!searchQuery && popularTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-medium text-gray-300">Mais usados</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onSelect={handleSelectTemplate}
                isPopular
              />
            ))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div>
        {!searchQuery && popularTemplates.length > 0 && (
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Todos os templates
          </h3>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates
            .filter(
              (t) => !popularTemplates.some((p) => p.id === t.id) || searchQuery
            )
            .map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onSelect={handleSelectTemplate}
              />
            ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">
              {searchQuery
                ? 'Nenhum template encontrado'
                : 'Nenhum template disponível'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Acesse <a href="/dev/seed-templates" className="text-blue-400 hover:underline">/dev/seed-templates</a> para popular os templates
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: TemplateImportacao;
  isSelected: boolean;
  onSelect: (template: TemplateImportacao) => void;
  isPopular?: boolean;
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  isPopular,
}: TemplateCardProps) {
  return (
    <button
      onClick={() => onSelect(template)}
      className="relative text-left p-4 rounded-lg border transition-all hover:border-[#18B0A4]/50"
      style={{
        backgroundColor: isSelected ? 'rgba(24, 176, 164, 0.15)' : 'rgba(255, 255, 255, 0.05)',
        borderColor: isSelected ? '#18B0A4' : 'rgba(255, 255, 255, 0.2)',
        borderWidth: isSelected ? '2px' : '1px',
      }}
    >
      {isPopular && (
        <div className="absolute top-2 right-2">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        </div>
      )}

      <div className="space-y-2">
        <h4 className="font-medium text-white pr-6">{template.nome}</h4>

        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className="px-2 py-1 rounded"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            {template.tipo_arquivo.toUpperCase()}
          </span>
          {template.separador && (
            <span
              className="px-2 py-1 rounded"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              Sep: {template.separador === '\t' ? 'TAB' : template.separador}
            </span>
          )}
          {template.formato_data && (
            <span
              className="px-2 py-1 rounded"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              {template.formato_data}
            </span>
          )}
        </div>

        {template.contador_uso > 0 && (
          <p className="text-xs text-gray-400">
            Usado {template.contador_uso}x
          </p>
        )}
      </div>
    </button>
  );
}

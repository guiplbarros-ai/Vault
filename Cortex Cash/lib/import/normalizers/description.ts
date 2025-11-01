/**
 * Normalizador de Descrições
 * Agent IMPORT: Limpa e normaliza descrições de transações
 */

/**
 * Normaliza uma descrição de transação
 * Remove espaços extras, caracteres especiais desnecessários, etc.
 *
 * @param description String com descrição original
 * @param options Opções de normalização
 * @returns Descrição normalizada
 *
 * @example
 * normalizeDescription('  COMPRA   CARTAO  ') // 'COMPRA CARTAO'
 * normalizeDescription('PAG*NETFLIX', { lowercase: true }) // 'pag netflix'
 */
export function normalizeDescription(
  description: string,
  options: {
    lowercase?: boolean;
    removeSpecialChars?: boolean;
    maxLength?: number;
  } = {}
): string {
  if (!description || typeof description !== 'string') {
    return '';
  }

  let normalized = description.trim();

  // Remover múltiplos espaços
  normalized = normalized.replace(/\s+/g, ' ');

  // Remover caracteres especiais comuns em extratos
  if (options.removeSpecialChars) {
    normalized = normalized
      .replace(/\*/g, ' ')  // Asteriscos
      .replace(/\//g, ' ')  // Barras
      .replace(/-{2,}/g, ' ') // Múltiplos hífens
      .replace(/_+/g, ' ')  // Underscores
      .trim()
      .replace(/\s+/g, ' '); // Limpar espaços novamente
  }

  // Converter para minúsculas se solicitado
  if (options.lowercase) {
    normalized = normalized.toLowerCase();
  }

  // Limitar comprimento se especificado
  if (options.maxLength && normalized.length > options.maxLength) {
    normalized = normalized.substring(0, options.maxLength).trim() + '...';
  }

  return normalized;
}

/**
 * Remove prefixos comuns de descrições bancárias
 * Ex: "COMPRA CARTAO DEBITO - MERCADO" → "MERCADO"
 *
 * @param description Descrição original
 * @returns Descrição sem prefixos
 */
export function removeCommonPrefixes(description: string): string {
  if (!description) return '';

  const prefixes = [
    'COMPRA CARTAO',
    'COMPRA DEBITO',
    'COMPRA CREDITO',
    'PAGAMENTO',
    'PAG*',
    'PAG.',
    'SAQUE',
    'TRANSFERENCIA',
    'TRANSF',
    'TED',
    'DOC',
    'PIX',
    'DEBITO AUTOMATICO',
    'DEB AUT',
  ];

  let cleaned = description.trim();

  for (const prefix of prefixes) {
    const regex = new RegExp(`^${prefix}\\s*[-:]?\\s*`, 'i');
    cleaned = cleaned.replace(regex, '');
  }

  return cleaned.trim();
}

/**
 * Extrai informações úteis de descrições complexas
 * Retorna objeto com descrição limpa e metadados extraídos
 *
 * @param description Descrição original
 * @returns Objeto com descrição e metadados
 *
 * @example
 * extractMetadata('COMPRA CARTAO *1234 - NETFLIX 12/01')
 * // { description: 'NETFLIX', cardDigits: '1234', date: '12/01' }
 */
export function extractMetadata(description: string): {
  description: string;
  cardDigits?: string;
  date?: string;
  location?: string;
  reference?: string;
} {
  if (!description) {
    return { description: '' };
  }

  const result: ReturnType<typeof extractMetadata> = {
    description: description.trim(),
  };

  // Extrair últimos 4 dígitos do cartão
  const cardMatch = description.match(/\*(\d{4})/);
  if (cardMatch) {
    result.cardDigits = cardMatch[1];
    result.description = result.description.replace(/\*\d{4}/g, '').trim();
  }

  // Extrair data no formato DD/MM
  const dateMatch = description.match(/(\d{2}\/\d{2})/);
  if (dateMatch) {
    result.date = dateMatch[1];
    result.description = result.description.replace(/\d{2}\/\d{2}/g, '').trim();
  }

  // Extrair localização (geralmente após hífen ou após cidade/estado)
  const locationMatch = description.match(/\s+-\s+([A-Z\s]+(?:\/[A-Z]{2})?)/);
  if (locationMatch) {
    result.location = locationMatch[1].trim();
    result.description = result.description.replace(locationMatch[0], '').trim();
  }

  // Extrair número de referência
  const refMatch = description.match(/REF[:\s]*(\w+)/i);
  if (refMatch) {
    result.reference = refMatch[1];
    result.description = result.description.replace(refMatch[0], '').trim();
  }

  // Limpar descrição final
  result.description = removeCommonPrefixes(result.description);
  result.description = normalizeDescription(result.description, {
    removeSpecialChars: true,
  });

  return result;
}

/**
 * Detecta possível categoria com base em palavras-chave na descrição
 * Útil para sugerir classificação automática
 *
 * @param description Descrição da transação
 * @returns Categoria sugerida ou null
 */
export function suggestCategory(description: string): string | null {
  if (!description) return null;

  const lowerDesc = description.toLowerCase();

  // Mapeamento de palavras-chave para categorias
  const keywords: Record<string, string[]> = {
    'Alimentação': ['mercado', 'supermercado', 'padaria', 'restaurante', 'lanchonete', 'delivery', 'ifood', 'uber eats'],
    'Transporte': ['uber', 'taxi', '99', 'combustivel', 'gasolina', 'estacionamento', 'pedagio'],
    'Moradia': ['aluguel', 'condominio', 'iptu', 'luz', 'agua', 'gas', 'energia'],
    'Saúde': ['farmacia', 'drogaria', 'clinica', 'hospital', 'medico', 'laboratorio'],
    'Educação': ['escola', 'faculdade', 'curso', 'livro', 'material escolar'],
    'Lazer': ['cinema', 'teatro', 'show', 'streaming', 'netflix', 'spotify', 'amazon prime'],
    'Vestuário': ['loja', 'roupa', 'calcado', 'sapato', 'tenis'],
    'Tecnologia': ['apple', 'google', 'microsoft', 'samsung', 'dell'],
  };

  for (const [category, words] of Object.entries(keywords)) {
    if (words.some((word) => lowerDesc.includes(word))) {
      return category;
    }
  }

  return null;
}

/**
 * Verifica se a descrição indica uma transferência
 *
 * @param description Descrição da transação
 * @returns true se parece ser uma transferência
 */
export function isTransferDescription(description: string): boolean {
  if (!description) return false;

  const transferKeywords = [
    'transferencia',
    'transf',
    'ted',
    'doc',
    'pix',
    'pagamento entre contas',
  ];

  const lowerDesc = description.toLowerCase();
  return transferKeywords.some((keyword) => lowerDesc.includes(keyword));
}

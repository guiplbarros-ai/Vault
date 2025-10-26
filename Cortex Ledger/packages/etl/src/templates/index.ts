/**
 * Template registry for Cortex Ledger
 * Pre-configured templates for supported institutions
 */

import { bradescoCSVTemplate } from './bradesco-csv.js';
import { bradescoOFXTemplate } from './bradesco-ofx.js';
import { aeternumCSVTemplate } from './aeternum-csv.js';
import { amexCSVTemplate } from './amex-csv.js';
import type { TemplateMapping } from '../types.js';

/**
 * Registry of all available templates
 */
export const templateRegistry: Record<string, TemplateMapping> = {
	'bradesco-csv': bradescoCSVTemplate,
	'bradesco-ofx': bradescoOFXTemplate,
	'aeternum-csv': aeternumCSVTemplate,
	'amex-csv': amexCSVTemplate,
};

/**
 * Gets a template by key
 */
export function getTemplate(key: string): TemplateMapping | undefined {
	return templateRegistry[key];
}

/**
 * Lists all available template keys
 */
export function listTemplates(): string[] {
	return Object.keys(templateRegistry);
}

/**
 * Finds templates by institution name
 */
export function findTemplatesByInstitution(
	instituicao: string
): TemplateMapping[] {
	const normalized = instituicao.toLowerCase();
	return Object.values(templateRegistry).filter((t) =>
		t.instituicaoNome.toLowerCase().includes(normalized)
	);
}

// Re-export individual templates
export {
	bradescoCSVTemplate,
	bradescoOFXTemplate,
	aeternumCSVTemplate,
	amexCSVTemplate,
};

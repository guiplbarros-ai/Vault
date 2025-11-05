import { NextRequest, NextResponse } from 'next/server';
import { listTemplates, getTemplate, searchTemplates } from '@/lib/import/templates';

/**
 * GET /api/import/templates
 * Agent DATA: Owner
 *
 * Lista templates de importação disponíveis
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const id = url.searchParams.get('id');

    if (id) {
      const template = getTemplate(id);
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(template);
    }

    if (search) {
      const templates = searchTemplates(search);
      return NextResponse.json({ templates });
    }

    const templates = listTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch templates',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

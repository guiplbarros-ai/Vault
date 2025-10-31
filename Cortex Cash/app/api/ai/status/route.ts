/**
 * AI Status Endpoint
 * Agent IA: Owner
 *
 * Verifica status da configuração de IA (API key, modelo, etc)
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKeyConfigured = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;

    return NextResponse.json({
      apiKeyConfigured,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    return NextResponse.json(
      { error: 'Failed to check AI status' },
      { status: 500 }
    );
  }
}

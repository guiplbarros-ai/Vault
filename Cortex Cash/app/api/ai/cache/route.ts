import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats, clearCache, cleanExpiredCache } from '@/lib/finance/classification/prompt-cache';

/**
 * GET /api/ai/cache - Obtém estatísticas do cache
 * Agent DATA: Owner
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getCacheStats();

    return NextResponse.json({
      success: true,
      cache: {
        size: stats.size,
        max_size: stats.max_size,
        utilization: ((stats.size / stats.max_size) * 100).toFixed(1) + '%',
        hit_rate: (stats.hit_rate * 100).toFixed(1) + '%',
        total_hits: stats.total_hits,
        total_misses: stats.total_misses,
        total_requests: stats.total_requests,
        ttl_days: Math.floor(stats.ttl_ms / (1000 * 60 * 60 * 24)),
        savings_estimate_usd: (stats.total_hits * 0.00005).toFixed(4), // ~$0.00005 por classificação
      },
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cache stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/cache - Limpa o cache
 * Agent DATA: Owner
 */
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'clean') {
      // Remove apenas expirados
      const removed = cleanExpiredCache();
      return NextResponse.json({
        success: true,
        message: `${removed} entradas expiradas removidas`,
        removed,
      });
    } else if (action === 'clear') {
      // Remove tudo
      clearCache();
      return NextResponse.json({
        success: true,
        message: 'Cache limpo completamente',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action',
          message: 'Use ?action=clean ou ?action=clear',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

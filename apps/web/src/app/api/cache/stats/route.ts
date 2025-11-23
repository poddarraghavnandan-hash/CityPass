import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats, clearAllCache, invalidateCache } from '@citypass/llm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cache/stats - Get cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await getCacheStats() as any;

    return NextResponse.json({
      success: true,
      stats: {
        connected: stats.connected ?? false,
        totalKeys: stats.keyCount ?? 0,
        memoryUsed: stats.memoryUsed ?? 'unknown',
        hitRate: stats.hitRate ? `${stats.hitRate.toFixed(2)}%` : 'N/A',
      },
    });
  } catch (error: any) {
    console.error('Failed to get cache stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get cache stats',
        stats: {
          connected: false,
          totalKeys: 0,
          memoryUsed: 'unknown',
          hitRate: 'N/A',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cache/stats?action=clear - Clear cache
 * DELETE /api/cache/stats?action=invalidate&pattern=embedding - Invalidate by pattern
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const pattern = searchParams.get('pattern');

    if (action === 'clear') {
      await clearAllCache();
      return NextResponse.json({
        success: true,
        message: 'All cache cleared',
      });
    } else if (action === 'invalidate' && pattern) {
      const count = await invalidateCache(pattern);
      return NextResponse.json({
        success: true,
        message: `Invalidated ${count} cache entries matching: ${pattern}`,
        count,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use ?action=clear or ?action=invalidate&pattern=<pattern>',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Failed to modify cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to modify cache',
      },
      { status: 500 }
    );
  }
}

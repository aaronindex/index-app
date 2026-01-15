// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { searchChunks } from '@/lib/search';
import { synthesizeAnswer } from '@/lib/ai/answer';
import { getRelatedContent } from '@/lib/relatedContent';
import { checkAskLimit, incrementLimit } from '@/lib/limits';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, limit, similarityThreshold, projectId, includeAnswer } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Check Ask Index limit
    const limitCheck = await checkAskLimit(user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { 
          error: limitCheck.message || 'Ask Index limit reached',
          limitReached: true,
          source: 'paywall_ask_limit',
        },
        { status: 429 }
      );
    }

    console.log('[Search API] Starting search for query:', query.substring(0, 50));
    console.log('[Search API] User ID:', user.id);
    console.log('[Search API] Limit:', limit || 10);
    console.log('[Search API] Threshold:', similarityThreshold || 0.5);

    const results = await searchChunks(
      query.trim(),
      user.id,
      limit || 10,
      similarityThreshold || 0.5, // Lower threshold for better recall
      projectId || undefined
    );

    console.log('[Search API] Found', results.length, 'results');

    // Synthesize answer if requested and we have results
    let answer = null;
    if (includeAnswer !== false && results.length > 0) {
      console.log('[Search API] Synthesizing answer...');
      try {
        answer = await synthesizeAnswer(query.trim(), results);
        console.log('[Search API] Answer synthesized successfully');
      } catch (error) {
        console.error('[Search API] Answer synthesis failed:', error);
        // Continue without answer if synthesis fails
      }
    }

    // Get related content (highlights, threads, projects)
    let relatedContent = null;
    if (results.length > 0) {
      try {
        relatedContent = await getRelatedContent(user.id, results);
        console.log('[Search API] Related content fetched');
      } catch (error) {
        console.error('[Search API] Related content fetch failed:', error);
        // Continue without related content if fetch fails
      }
    }

    // Increment limit counter
    await incrementLimit(user.id, 'ask');

    // Fire analytics event
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'ask_query',
        query_length: query.length,
        result_count: results.length,
      });
    }

    return NextResponse.json({
      success: true,
      results,
      answer,
      relatedContent,
      debug: { queryLength: query.length, resultCount: results.length },
    });
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}


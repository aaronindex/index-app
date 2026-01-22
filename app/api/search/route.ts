// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { searchChunks } from '@/lib/search';
import { synthesizeAnswer } from '@/lib/ai/answer';
import { getRelatedContent } from '@/lib/relatedContent';
import { checkAskLimit, incrementLimit } from '@/lib/limits';
import crypto from 'crypto';

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

    const searchStartTime = Date.now();
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
    const queryHash = crypto.createHash('sha256').update(normalizedQuery).digest('hex');
    const threshold = similarityThreshold || 0.5;

    const results = await searchChunks(
      query.trim(),
      user.id,
      limit || 10,
      threshold,
      projectId || undefined
    );

    console.log('[Search API] Found', results.length, 'results');

    // Synthesize answer if requested and we have results
    let answer = null;
    let status: 'ok' | 'no_results' | 'error' = 'ok';
    let model: string | null = null;
    
    if (includeAnswer !== false && results.length > 0) {
      console.log('[Search API] Synthesizing answer...');
      try {
        answer = await synthesizeAnswer(query.trim(), results);
        model = 'gpt-4o-mini';
        console.log('[Search API] Answer synthesized successfully');
      } catch (error) {
        console.error('[Search API] Answer synthesis failed:', error);
        status = 'error';
        // Continue without answer if synthesis fails
      }
    } else if (results.length === 0) {
      status = 'no_results';
    }

    const latencyMs = Date.now() - searchStartTime;
    const topScore = results.length > 0 ? Math.max(...results.map(r => r.similarity)) : null;

    // Write ask_index_run to database
    const supabase = await getSupabaseServerClient();
    let askIndexRunId: string | null = null;
    
    try {
      const { data: run, error: runError } = await supabase
        .from('ask_index_runs')
        .insert({
          user_id: user.id,
          scope: projectId ? 'project' : 'global',
          project_id: projectId || null,
          query_hash: queryHash,
          query_length: normalizedQuery.length,
          result_count: results.length,
          top_score: topScore,
          threshold: threshold,
          latency_ms: latencyMs,
          status: status,
          model: model,
        })
        .select('id')
        .single();

      if (!runError && run) {
        askIndexRunId = run.id;
        console.log('[Search API] Ask index run recorded:', askIndexRunId);
      } else {
        console.error('[Search API] Failed to record ask_index_run:', runError);
      }
    } catch (runInsertError) {
      console.error('[Search API] Error inserting ask_index_run:', runInsertError);
      // Continue even if run tracking fails
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
      ask_index_run_id: askIndexRunId,
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


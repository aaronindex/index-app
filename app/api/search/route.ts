// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { searchChunksWithFallback } from '@/lib/search';
import { synthesizeAnswer } from '@/lib/ai/answer';
import { getRelatedContent } from '@/lib/relatedContent';
import { checkAskLimit, incrementLimit } from '@/lib/limits';
import { routeAskQuery } from '@/lib/askRouter';
import { queryState } from '@/lib/stateQuery';
import { buildStructuralAnswer } from '@/lib/askStructuralAnswer';
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

    const searchStartTime = Date.now();
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
    const queryHash = crypto.createHash('sha256').update(normalizedQuery).digest('hex');
    const threshold = similarityThreshold || 0.5;

    // Route query to determine intent
    const routerResult = await routeAskQuery(query.trim(), user.id, projectId || undefined);
    console.log('[Search API] Intent detected:', routerResult.intent, 'Scope:', routerResult.scope);

    // Handle disambiguation
    if (routerResult.needsDisambiguation && routerResult.candidateProjects) {
      return NextResponse.json({
        success: true,
        intent: 'state',
        needsDisambiguation: true,
        candidateProjects: routerResult.candidateProjects,
      });
    }

    let results: any[] = [];
    let answer = null;
    let stateData = null;
    let status: 'ok' | 'no_results' | 'error' = 'ok';
    let model: string | null = null;
    let thresholdUsed = threshold;
    let usedFallbackThreshold = false;
    let resultCountSemantic = 0;
    let resultCountTasks = 0;
    let resultCountDecisions = 0;
    let timeWindowDaysUsed = 7;

    if (routerResult.intent === 'state') {
      // State query: interpret structural ledger (decisions, tasks, arcs, shifts)
      console.log('[Search API] Executing state (ledger) query...', {
        category: routerResult.category,
        scope: routerResult.scope,
      });

      // Try 7 days first, fallback to 14 if empty
      let state = await queryState(user.id, routerResult.resolvedProjectId, 7);
      if (
        state.newDecisions.length === 0 &&
        state.newOrChangedTasks.length === 0 &&
        state.blockersOrStale.length === 0
      ) {
        state = await queryState(user.id, routerResult.resolvedProjectId, 14);
        timeWindowDaysUsed = 14;
      }

      resultCountDecisions = state.newDecisions.length;
      resultCountTasks =
        state.newOrChangedTasks.length + state.blockersOrStale.length;

      // Build structured answer sections from ledger state
      const sections = await buildStructuralAnswer({
        userId: user.id,
        scope: routerResult.scope,
        category: routerResult.category,
        state,
        projectId: routerResult.resolvedProjectId || projectId || null,
      });

      // Compose multi-section summary text for UI:
      // Interpretation / Supporting Signals / Structural Context / Next Attention
      const parts: string[] = [];
      parts.push(`Interpretation:\n${sections.interpretation}`);
      parts.push(`\nSupporting Signals:\n${sections.supportingSignals}`);
      parts.push(`\nStructural Context:\n${sections.structuralContext}`);
      if (sections.nextAttention) {
        parts.push(`\nNext Attention:\n${sections.nextAttention}`);
      }

      const stateSummaryText = parts.join('\n\n').trim();

      stateData = {
        stateSummary: stateSummaryText,
        stateSummarySource: 'ledger_structured',
        currentDirection: state.currentDirection,
        sections: {
          newDecisions: state.newDecisions,
          newOrChangedTasks: state.newOrChangedTasks,
          blockersOrStale: state.blockersOrStale,
        },
        timeWindowDaysUsed: state.timeWindowDaysUsed,
        changeDefinition: state.changeDefinition,
      };

      // Ledger interpretation is always considered a successful answer (even when sparse).
      status = 'ok';
    } else {
      // Recall query: semantic search with fallback
      console.log('[Search API] Executing semantic search...');
      
      const searchResult = await searchChunksWithFallback(
        query.trim(),
        user.id,
        limit || 10,
        threshold,
        0.4, // fallback threshold
        routerResult.resolvedProjectId || projectId || undefined
      );
      
      results = searchResult.results;
      thresholdUsed = searchResult.thresholdUsed;
      usedFallbackThreshold = searchResult.usedFallback;
      resultCountSemantic = results.length;
      
      console.log('[Search API] Found', results.length, 'results (threshold:', thresholdUsed, ', fallback:', usedFallbackThreshold, ')');

      // Synthesize answer if requested and we have results
      if (includeAnswer !== false && results.length > 0) {
        console.log('[Search API] Synthesizing answer...');
        try {
          answer = await synthesizeAnswer(query.trim(), results);
          model = 'gpt-4o-mini';
          console.log('[Search API] Answer synthesized successfully');
        } catch (error) {
          console.error('[Search API] Answer synthesis failed:', error);
          status = 'error';
        }
      } else if (results.length === 0) {
        // No semantic hits: fall back to structural ledger interpretation so Ask still answers.
        console.log('[Search API] No semantic hits; falling back to ledger interpretation.');

        // Try 7 days first, fallback to 14 if empty
        let state = await queryState(user.id, routerResult.resolvedProjectId, 7);
        if (
          state.newDecisions.length === 0 &&
          state.newOrChangedTasks.length === 0 &&
          state.blockersOrStale.length === 0
        ) {
          state = await queryState(user.id, routerResult.resolvedProjectId, 14);
          timeWindowDaysUsed = 14;
        }

        resultCountDecisions = state.newDecisions.length;
        resultCountTasks =
          state.newOrChangedTasks.length + state.blockersOrStale.length;

        const sections = await buildStructuralAnswer({
          userId: user.id,
          scope: routerResult.scope,
          category: routerResult.category,
          state,
          projectId: routerResult.resolvedProjectId || projectId || null,
        });

        const parts: string[] = [];
        parts.push(`Interpretation:\n${sections.interpretation}`);
        parts.push(`\nSupporting Signals:\n${sections.supportingSignals}`);
        parts.push(`\nStructural Context:\n${sections.structuralContext}`);
        if (sections.nextAttention) {
          parts.push(`\nNext Attention:\n${sections.nextAttention}`);
        }

        const stateSummaryText = parts.join('\n\n').trim();

        stateData = {
          stateSummary: stateSummaryText,
          stateSummarySource: 'ledger_structured',
          currentDirection: state.currentDirection,
          sections: {
            newDecisions: state.newDecisions,
            newOrChangedTasks: state.newOrChangedTasks,
            blockersOrStale: state.blockersOrStale,
          },
          timeWindowDaysUsed: state.timeWindowDaysUsed,
          changeDefinition: state.changeDefinition,
        };

        status = 'ok';
      }
    }

    const latencyMs = Date.now() - searchStartTime;
    const topScore = results.length > 0 ? Math.max(...results.map((r: any) => r.similarity)) : null;

    // Write ask_index_run to database
    const supabase = await getSupabaseServerClient();
    let askIndexRunId: string | null = null;
    
    try {
      const { data: run, error: runError } = await supabase
        .from('ask_index_runs')
        .insert({
          user_id: user.id,
          scope: routerResult.scope,
          project_id: routerResult.resolvedProjectId || projectId || null,
          query_hash: queryHash,
          query_length: normalizedQuery.length,
          result_count: routerResult.intent === 'state' ? (resultCountDecisions + resultCountTasks) : resultCountSemantic,
          top_score: topScore,
          threshold: thresholdUsed,
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
    
    // Log metadata
    console.log('[Search API] Metadata:', {
      intent: routerResult.intent,
      scope: routerResult.scope,
      thresholdUsed,
      usedFallbackThreshold,
      resultCountSemantic,
      resultCountTasks,
      resultCountDecisions,
      latencyMs,
    });

    // Get related content (highlights, threads, projects) - only for semantic queries
    let relatedContent = null;
    if (routerResult.intent === 'recall_semantic' && results.length > 0) {
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
        result_count: routerResult.intent === 'state' ? (resultCountDecisions + resultCountTasks) : resultCountSemantic,
        intent_detected: routerResult.intent,
        scope: routerResult.scope,
        threshold_used: thresholdUsed,
        used_fallback_threshold: usedFallbackThreshold,
        state_time_window_days_used: timeWindowDaysUsed,
      });
    }

    // Return unified response
    return NextResponse.json({
      success: true,
      intent: routerResult.intent,
      scope: routerResult.scope,
      resolvedProjectId: routerResult.resolvedProjectId,
      // Semantic query response
      results: routerResult.intent === 'recall_semantic' ? results : undefined,
      answer: routerResult.intent === 'recall_semantic' ? answer : undefined,
      relatedContent: routerResult.intent === 'recall_semantic' ? relatedContent : undefined,
      // State query response
      stateData: routerResult.intent === 'state' ? stateData : undefined,
      // Metadata
      metadata: {
        thresholdUsed,
        usedFallbackThreshold,
        resultCountSemantic,
        resultCountTasks,
        resultCountDecisions,
        timeWindowDaysUsed: routerResult.intent === 'state' ? timeWindowDaysUsed : undefined,
        changeDefinition: routerResult.intent === 'state' ? 'updated_at' : undefined,
      },
      ask_index_run_id: askIndexRunId,
    });
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}


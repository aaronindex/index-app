// app/ask/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import ConversionTile from '@/app/ask/components/ConversionTile';
import Card from '@/app/components/ui/Card';
import type { AskIndexAnalysisMode } from '@/lib/askAnalysisMode';
import { getAskIndexLayoutConfig, getSectionLabel } from '@/lib/askLayoutConfig';

interface SearchResult {
  chunk_id: string;
  content: string;
  conversation_id: string;
  conversation_title: string | null;
  message_id: string;
  similarity: number;
}

interface FollowUpQuestion {
  type: 'clarify' | 'decide' | 'commit' | 'deprioritize';
  text: string;
  tileType?: 'decision' | 'task' | 'clarify_task';
}

interface SynthesizedAnswer {
  answer: string;
  citations: Array<{
    chunk_id: string;
    conversation_id: string;
    conversation_title: string | null;
    excerpt: string;
    similarity: number;
  }>;
  followUpQuestions: FollowUpQuestion[];
}

interface StateData {
  stateSummary: string;
  stateSummarySource: 'deterministic' | 'llm';
  currentDirection?: string;
  sections: {
    newDecisions: Array<{
      id: string;
      title: string;
      created_at: string;
      project_id: string | null;
      project_name: string | null;
    }>;
    newOrChangedTasks: Array<{
      id: string;
      title: string;
      status: string;
      created_at: string;
      updated_at: string;
      project_id: string | null;
      project_name: string | null;
    }>;
    blockersOrStale: Array<{
      id: string;
      title: string;
      status: string;
      updated_at: string;
      project_id: string | null;
      project_name: string | null;
      reason: 'blocked' | 'stale';
    }>;
  };
  timeWindowDaysUsed: number;
  changeDefinition: string;
}

export default function AskPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState<SynthesizedAnswer | null>(null);
  const [stateData, setStateData] = useState<StateData | null>(null);
  const [intent, setIntent] = useState<'recall_semantic' | 'state' | null>(null);
  const [needsDisambiguation, setNeedsDisambiguation] = useState(false);
  const [candidateProjects, setCandidateProjects] = useState<Array<{ id: string; name: string }>>([]);

  // Update page title
  useEffect(() => {
    document.title = 'Ask Index | INDEX';
  }, []);

  // Restore from sessionStorage on mount if URL has q param
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlQuery = urlParams.get('q');
    if (urlQuery && !hasSearched) {
      const cacheKey = `ask_index_${urlQuery}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setQuery(urlQuery);
          setResults(data.results || []);
          setAnswer(data.answer || null);
          setStateData(data.stateData || null);
          setIntent(data.intent || 'recall_semantic');
          setAnalysisMode(data.analysisMode ?? null);
          setRelatedContent(data.relatedContent || null);
          setAskIndexRunId(data.ask_index_run_id || null);
          setHasSearched(true);
          setEvidenceExpanded(false);
          setShowAllTiles(false);
          setNextAttentionExpanded(false);
        } catch (e) {
          console.error('Error restoring from cache:', e);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [relatedContent, setRelatedContent] = useState<{
    highlights: Array<{
      id: string;
      content: string;
      label: string | null;
      conversation_id: string;
      conversation_title: string | null;
    }>;
    threads: Array<{
      id: string;
      title: string | null;
      conversation_id: string;
      conversation_title: string | null;
      is_branch: boolean;
    }>;
    projects: Array<{
      id: string;
      name: string;
      conversation_ids: string[];
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askIndexRunId, setAskIndexRunId] = useState<string | null>(null);
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);
  const [showAllTiles, setShowAllTiles] = useState(false);
  const [nextAttentionExpanded, setNextAttentionExpanded] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [resultScope, setResultScope] = useState<'global' | 'project'>('global');
  const [analysisMode, setAnalysisMode] = useState<AskIndexAnalysisMode | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([
    'What arc is most active right now?',
    'What patterns are emerging?',
    'What decisions changed the direction?',
    'What still needs attention?',
    'How has this project evolved recently?',
  ]);

  // Scope model: Across Your INDEX (global) or specific project
  const [scope, setScope] = useState<'global' | 'project'>('global');
  const [scopeProjectId, setScopeProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  // Load projects for scope dropdown
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setProjects(data || []);
      } catch {
        // ignore scope project load failures
      }
    };
    loadProjects();
  }, []);

  const performSearch = async (searchQuery?: string) => {
    const queryToUse = searchQuery || query;
    if (!queryToUse.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setResults([]);
    setAnswer(null);
    setStateData(null);
    setIntent(null);
    setRelatedContent(null);
    setNeedsDisambiguation(false);
    setCandidateProjects([]);

    // Update query state if a different query was passed
    if (searchQuery && searchQuery !== query) {
      setQuery(searchQuery);
    }

    console.log('[Ask Page] Starting search for:', queryToUse.trim());

    // Track start time for latency
    const searchStartTime = Date.now();

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryToUse.trim(),
          limit: 10,
          similarityThreshold: 0.5, // Lower threshold for better recall
          includeAnswer: true, // Request synthesized answer
          projectId: scope === 'project' && scopeProjectId ? scopeProjectId : undefined,
        }),
      });

      console.log('[Ask Page] Search response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Ask Page] Search error response:', errorData);
        
        // Track limit hit if 429
        if (response.status === 429) {
          const { trackEvent } = await import('@/lib/analytics');
          trackEvent('limit_hit', {
            limit_type: 'ask',
          });
        }
        
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      console.log('[Ask Page] Search results:', {
        intent: data.intent,
        resultCount: data.results?.length || 0,
        hasAnswer: !!data.answer,
        hasStateData: !!data.stateData,
        needsDisambiguation: data.needsDisambiguation,
      });
      
      // Handle disambiguation
      if (data.needsDisambiguation && data.candidateProjects) {
        setNeedsDisambiguation(true);
        setCandidateProjects(data.candidateProjects);
        setLoading(false);
        return;
      }
      
      // Calculate latency
      const latencyMs = Date.now() - searchStartTime;
      
      // Track ask query event
      const { trackEvent } = await import('@/lib/analytics');
      const hasAnswer = !!data.answer || !!data.stateData;
      
      trackEvent('ask_index_query', {
        query_length: queryToUse.trim().length,
        result_count: data.metadata?.resultCountSemantic || data.metadata?.resultCountTasks || 0,
        latency_ms: latencyMs,
        has_answer: hasAnswer,
        scope: data.scope || 'global',
        project_id_present: !!data.resolvedProjectId,
        intent_detected: data.intent,
        threshold_used: data.metadata?.thresholdUsed,
        used_fallback_threshold: data.metadata?.usedFallbackThreshold,
        state_time_window_days_used: data.metadata?.timeWindowDaysUsed,
      });
      
      // Track ask_index_answered event only when answer is present
      if (hasAnswer) {
        trackEvent('ask_index_answered', {
          query_length: queryToUse.trim().length,
          result_count: data.metadata?.resultCountSemantic || data.metadata?.resultCountTasks || 0,
          latency_ms: latencyMs,
          scope: data.scope || 'global',
          project_id_present: !!data.resolvedProjectId,
          intent_detected: data.intent,
        });
      }
      
      const normalizedQuery = queryToUse.trim();
      setIntent(data.intent || 'recall_semantic');
      setResultScope((data.scope as 'global' | 'project') || 'global');
      setAnalysisMode((data.analysisMode as AskIndexAnalysisMode) ?? null);
      setResults(data.results || []);
      setAnswer(data.answer || null);
      setStateData(data.stateData || null);
      setRelatedContent(data.relatedContent || null);
      setAskIndexRunId(data.ask_index_run_id || null);
      setEvidenceExpanded(false);
      setShowAllTiles(false);
      setNextAttentionExpanded(false);
      setNeedsDisambiguation(false);
      setCandidateProjects([]);

      // Store in sessionStorage for back navigation
      const cacheKey = `ask_index_${normalizedQuery}`;
      sessionStorage.setItem(cacheKey, JSON.stringify({
        results: data.results || [],
        answer: data.answer || null,
        stateData: data.stateData || null,
        analysisMode: data.analysisMode ?? null,
        relatedContent: data.relatedContent || null,
        ask_index_run_id: data.ask_index_run_id || null,
        intent: data.intent,
      }));

      // Update URL with query param
      const url = new URL(window.location.href);
      url.searchParams.set('q', normalizedQuery);
      router.replace(url.pathname + url.search, { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      console.error('[Ask Page] Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSearch();
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    void performSearch(text);
  };

  // Lightweight, read-only structural probe for context-aware suggestions.
  // If a snapshot exists with active arcs, keep the default set;
  // otherwise bias toward decisions/attention questions.
  useEffect(() => {
    let cancelled = false;
    const loadContext = async () => {
      try {
        const res = await fetch('/api/capsule?scope=global', {
          method: 'GET',
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data || cancelled) return;
        const payload = data.state_payload || {};
        const activeArcIds: unknown = payload.active_arc_ids;
        const hasArcs = Array.isArray(activeArcIds) && activeArcIds.length > 0;

        if (!hasArcs) {
          setSuggestions([
            'What decisions changed the direction?',
            'What still needs attention?',
            'What did I decide about pricing?',
            'What open loops are still unresolved?',
          ]);
        }
      } catch {
        // Ignore context errors; fall back to static suggestions.
      }
    };
    loadContext();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">Ask Index</h1>
          <p className="text-[rgb(var(--muted))] mb-1">
            Find what still matters across your projects.
          </p>
          <p className="text-sm text-[rgb(var(--muted))]">
            Search your past thinking to surface decisions, tasks, and unresolved questions.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-0 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden focus-within:ring-2 focus-within:ring-zinc-500 dark:focus-within:ring-zinc-400">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What's still unresolved?"
              className="flex-1 min-w-0 px-4 py-3 bg-transparent text-foreground focus:outline-none"
              disabled={loading}
            />
            <div className="flex items-center border-l border-zinc-300 dark:border-zinc-700 pl-3 pr-3 py-1">
              <select
                value={scope === 'global' ? '' : scopeProjectId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setScope('global');
                    setScopeProjectId('');
                  } else {
                    setScope('project');
                    setScopeProjectId(val);
                  }
                }}
                className="bg-transparent text-sm text-[rgb(var(--muted))] focus:outline-none cursor-pointer"
                disabled={loading}
              >
                <option value="">Across Your INDEX</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-foreground text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Default suggestions before first search (ledger-oriented questions) */}
        {!loading && !error && !hasSearched && !answer && !stateData && results.length === 0 && (
          <div className="mb-8">
            <p className="text-sm text-[rgb(var(--muted))] mb-2">Try asking:</p>
            <div className="flex flex-col gap-1">
              {suggestions.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => handleSuggestionClick(text)}
                  className="inline-flex items-center text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] text-left"
                >
                  <span className="mr-2">•</span>
                  <span>{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* No explicit "no results" failure state:
            when a query returns no semantic hits, the API falls back to ledger interpretation. */}

        {/* Disambiguation UI */}
        {needsDisambiguation && candidateProjects.length > 0 && (
          <div className="mb-8 p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
            <h3 className="text-lg font-semibold text-foreground mb-4">Which project?</h3>
            <div className="space-y-2">
              {candidateProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => performSearch(`${query} in ${project.name}`)}
                  className="w-full text-left px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  {project.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Structural cards: order by analysis mode (Phase 3 layout adaptation) */}
        {stateData && (() => {
          const layoutConfig = getAskIndexLayoutConfig(analysisMode);
          const sectionOrder = layoutConfig.sectionOrder;

          const showSection = (key: string) => {
            if (key === 'reading' || key === 'structuralContext') return true;
            if (key === 'supportingSignals') return stateData!.sections.newDecisions.length > 0;
            if (key === 'nextAttention') return stateData!.sections.newOrChangedTasks.length > 0;
            if (key === 'continueExploring') return hasSearched && !!(answer || stateData);
            return false;
          };

          const structuralContextText = (() => {
            const raw = stateData.stateSummary || '';
            const contextStart = raw.indexOf('Structural Context:');
            if (contextStart === -1) return 'No active arcs or recent shifts were found.';
            const afterContext = raw.slice(contextStart + 'Structural Context:'.length);
            const nextLabelIndex = afterContext.search(/(Next Attention:)/);
            const contextBlock =
              nextLabelIndex === -1 ? afterContext : afterContext.slice(0, nextLabelIndex);
            return contextBlock.trim() || 'No active arcs or recent shifts were found.';
          })();

          return (
            <>
              {sectionOrder.map((key) => {
                if (!showSection(key)) return null;

                if (key === 'reading') {
                  return (
                    <div key="reading" className="mb-6 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
                      <p className="text-xs text-[rgb(var(--muted))] mb-3">
                        Scope: {resultScope === 'project'
                          ? stateData.sections.newDecisions[0]?.project_name ||
                            stateData.sections.newOrChangedTasks[0]?.project_name ||
                            'Project'
                          : 'Across Your INDEX'}
                      </p>
                      <h2 className="font-sans text-lg sm:text-xl font-semibold text-[rgb(var(--text))] mb-2">
                        {stateData.currentDirection ||
                          stateData.sections.newDecisions[0]?.title ||
                          'Interpretation'}
                      </h2>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed mb-3">
                        {(() => {
                          const raw = stateData.stateSummary || '';
                          const split = raw.split('Supporting Signals:')[0] || raw;
                          return split.replace(/^Interpretation:\s*/i, '').trim() || raw;
                        })()}
                      </p>
                      <p className="text-[0.7rem] text-[rgb(var(--muted))] opacity-90">
                        {(() => {
                          const decisionsCount = stateData.sections.newDecisions.length;
                          const tasksCount = stateData.sections.newOrChangedTasks.length;
                          const days = stateData.timeWindowDaysUsed ?? 7;
                          const decisionLabel = decisionsCount === 1 ? 'decision' : 'decisions';
                          const taskLabel = tasksCount === 1 ? 'task' : 'tasks';
                          return `${decisionsCount} ${decisionLabel} • ${tasksCount} ${taskLabel} updated in the last ${days} days`;
                        })()}
                      </p>
                    </div>
                  );
                }

                if (key === 'supportingSignals') {
                  return (
                    <div key="supportingSignals" className="mb-6 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-[rgb(var(--surface))]">
                      <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-3">
                        {getSectionLabel('supportingSignals', layoutConfig)}
                      </h3>
                      <div className="space-y-0">
                        {stateData.sections.newDecisions.map((decision, idx) => (
                          <div
                            key={decision.id}
                            className={idx > 0 ? 'pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-700' : ''}
                          >
                            <Link
                              href={`/projects/${decision.project_id || ''}?tab=signals#${decision.id}`}
                              className="block group"
                            >
                              <span className="text-sm font-medium text-[rgb(var(--text))] group-hover:text-[rgb(var(--muted))] transition-colors block">
                                {decision.title}
                              </span>
                              {resultScope === 'global' && decision.project_name && (
                                <span className="text-xs text-[rgb(var(--muted))] mt-0.5 block">
                                  {decision.project_name}
                                </span>
                              )}
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (key === 'structuralContext') {
                  return (
                    <div key="structuralContext" className="mb-6 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-[rgb(var(--surface))]">
                      <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-2">
                        {getSectionLabel('structuralContext', layoutConfig)}
                      </h3>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {structuralContextText}
                      </p>
                    </div>
                  );
                }

                if (key === 'nextAttention') {
                  return (
                    <div key="nextAttention" className="mb-8 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-[rgb(var(--surface))]">
                      <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-3">
                        {getSectionLabel('nextAttention', layoutConfig)}
                      </h3>
                      <div className="space-y-3">
                        {(nextAttentionExpanded
                          ? stateData.sections.newOrChangedTasks
                          : stateData.sections.newOrChangedTasks.slice(0, 3)
                        ).map((task) => (
                          <Link
                            key={task.id}
                            href={`/projects/${task.project_id || ''}?tab=signals#${task.id}`}
                            className="block"
                          >
                            <Card className="group" hover>
                              <div className="p-3">
                                <p className="text-[0.7em] uppercase tracking-wider text-[rgb(var(--muted))] opacity-80 leading-tight mb-0.5">
                                  Task
                                </p>
                                <h3 className="font-semibold text-[rgb(var(--text))] text-sm leading-snug group-hover:text-[rgb(var(--muted))] transition-colors">
                                  {task.title}
                                </h3>
                                {resultScope === 'global' && task.project_name && (
                                  <p className="text-[11px] text-[rgb(var(--muted))] mt-1">
                                    {task.project_name}
                                  </p>
                                )}
                              </div>
                            </Card>
                          </Link>
                        ))}
                      </div>
                      {stateData.sections.newOrChangedTasks.length > 3 && !nextAttentionExpanded && (
                        <button
                          type="button"
                          onClick={() => setNextAttentionExpanded(true)}
                          className="mt-3 text-sm font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
                        >
                          Show {stateData.sections.newOrChangedTasks.length - 3} more tasks
                        </button>
                      )}
                      {stateData.sections.newOrChangedTasks.length > 3 && nextAttentionExpanded && (
                        <button
                          type="button"
                          onClick={() => setNextAttentionExpanded(false)}
                          className="mt-3 text-sm font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
                        >
                          Show less
                        </button>
                      )}
                    </div>
                  );
                }

                if (key === 'continueExploring') {
                  return (
                    <div key="continueExploring" className="mb-8 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-[rgb(var(--surface))]">
                      <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-3">
                        {getSectionLabel('continueExploring', layoutConfig)}
                      </h3>
                      <div className="flex flex-col gap-2">
                        {[
                          'What signals are driving that?',
                          'What changed recently?',
                          'What needs attention next?',
                        ].map((text) => (
                          <button
                            key={text}
                            type="button"
                            onClick={() => handleSuggestionClick(text)}
                            className="w-full text-left px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-[rgb(var(--text))] hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                          >
                            {text}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </>
          );
        })()}

        {/* Synthesized Answer */}
        {answer && (
          <div className="mb-8 space-y-6">
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✨</span>
                <h2 className="text-xl font-semibold text-foreground">Interpretation</h2>
              </div>
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm">
                  {answer.answer}
                </p>
              </div>

              {/* Convert Tiles */}
              {answer.followUpQuestions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Make this actionable</h3>
                  <div className="space-y-3">
                    {(showAllTiles ? answer.followUpQuestions : answer.followUpQuestions.slice(0, 2)).map((question, idx) => {
                      // Map follow-up type to tile type
                      const tileType = question.tileType || (question.type === 'decide' ? 'decision' : question.type === 'commit' ? 'task' : 'task');
                      return (
                        <ConversionTile
                          key={idx}
                          type={tileType as 'decision' | 'task' | 'clarify_task'}
                          text={question.text}
                          conversationIds={answer.citations.map((c) => c.conversation_id)}
                          answerContext={answer.answer}
                          sourceQuery={query}
                          askIndexRunId={askIndexRunId}
                          onConvert={() => {
                            router.refresh();
                          }}
                        />
                      );
                    })}
                    {answer.followUpQuestions.length > 2 && !showAllTiles && (
                      <button
                        onClick={() => setShowAllTiles(true)}
                        className="w-full px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                      >
                        Show {answer.followUpQuestions.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Supporting Signals (Collapsed by default, deduped, capped at 5) */}
              {(() => {
                // Combine citations and results, dedupe by conversation_id, take top 5 by similarity
                const allSources: Array<{
                  conversation_id: string;
                  conversation_title: string | null;
                  similarity: number;
                  excerpt: string;
                }> = [];
                
                if (answer) {
                  answer.citations.forEach(c => {
                    allSources.push({
                      conversation_id: c.conversation_id,
                      conversation_title: c.conversation_title,
                      similarity: c.similarity,
                      excerpt: c.excerpt,
                    });
                  });
                }
                
                results.forEach(r => {
                  allSources.push({
                    conversation_id: r.conversation_id,
                    conversation_title: r.conversation_title,
                    similarity: r.similarity,
                    excerpt: r.content,
                  });
                });
                
                // Dedupe by conversation_id, keep highest similarity
                const deduped = new Map<string, typeof allSources[0]>();
                allSources.forEach(source => {
                  const existing = deduped.get(source.conversation_id);
                  if (!existing || source.similarity > existing.similarity) {
                    deduped.set(source.conversation_id, source);
                  }
                });
                
                const topSources = Array.from(deduped.values())
                  .sort((a, b) => b.similarity - a.similarity)
                  .slice(0, 5);
                
                return topSources.length > 0 ? (
                  <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      onClick={() => setEvidenceExpanded(!evidenceExpanded)}
                      className="flex items-center justify-between w-full text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
                    >
                      <span>Supporting Signals ({topSources.length})</span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {evidenceExpanded ? '−' : '+'}
                      </span>
                    </button>
                    
                    {evidenceExpanded && (
                      <div className="mt-4 space-y-2">
                        {topSources.map((source) => (
                          <div
                            key={source.conversation_id}
                            className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <Link
                                href={`/conversations/${source.conversation_id}`}
                                className="text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
                              >
                                {source.conversation_title || 'Untitled Conversation'}
                              </Link>
                              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                                {Math.round(source.similarity * 100)}% match
                              </span>
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 truncate">
                              {source.excerpt.substring(0, 120)}
                              {source.excerpt.length > 120 ? '...' : ''}
                            </p>
                            <Link
                              href={`/conversations/${source.conversation_id}`}
                              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-foreground mt-1 inline-block"
                            >
                              View chat →
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        )}


        {/* Supporting Signals drawer for results without answer (deduped, capped) */}
        {!answer && results.length > 0 && (() => {
          // Dedupe by conversation_id, keep highest similarity, cap at 5
          const deduped = new Map<string, SearchResult>();
          results.forEach(r => {
            const existing = deduped.get(r.conversation_id);
            if (!existing || r.similarity > existing.similarity) {
              deduped.set(r.conversation_id, r);
            }
          });
          const topResults = Array.from(deduped.values())
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5);
          
          return topResults.length > 0 ? (
            <div className="mb-8">
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                <button
                  onClick={() => setEvidenceExpanded(!evidenceExpanded)}
                  className="flex items-center justify-between w-full text-sm font-semibold text-foreground hover:opacity-80 transition-opacity mb-4"
                >
                  <span>Supporting Signals ({topResults.length})</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {evidenceExpanded ? '−' : '+'}
                  </span>
                </button>
                
                {evidenceExpanded && (
                  <div className="space-y-2">
                    {topResults.map((result) => (
                      <div
                        key={result.chunk_id}
                        className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <Link
                            href={`/conversations/${result.conversation_id}`}
                            className="text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
                          >
                            {result.conversation_title || 'Untitled Conversation'}
                          </Link>
                          <span className="text-xs text-zinc-500 dark:text-zinc-500">
                            {Math.round(result.similarity * 100)}% match
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 truncate">
                          {result.content.substring(0, 120)}
                          {result.content.length > 120 ? '...' : ''}
                        </p>
                        <Link
                          href={`/conversations/${result.conversation_id}`}
                          className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-foreground mt-1 inline-block"
                        >
                          View chat →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null;
        })()}

        {!loading && hasSearched && results.length === 0 && !answer && !stateData && !error && (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400">
              No results found. Try rephrasing your query.
            </p>
          </div>
        )}

        {/* Example queries section removed – "Try asking" suggestions are the only empty-state surface. */}
      </div>
    </main>
  );
}


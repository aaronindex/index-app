// app/ask/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConversionTile from '@/app/ask/components/ConversionTile';

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

export default function AskPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState<SynthesizedAnswer | null>(null);

  // Update page title
  useEffect(() => {
    document.title = 'Ask Index | INDEX';
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

  const performSearch = async (searchQuery?: string) => {
    const queryToUse = searchQuery || query;
    if (!queryToUse.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setAnswer(null);
    setRelatedContent(null);

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
        resultCount: data.results?.length || 0,
        hasAnswer: !!data.answer,
        hasRelatedContent: !!data.relatedContent,
        debug: data.debug,
      });
      
      // Calculate latency
      const latencyMs = Date.now() - searchStartTime;
      
      // Track ask query event
      // Note: Ask page doesn't currently support project-scoped queries
      // If projectId is added later, extract from request body
      const { trackEvent } = await import('@/lib/analytics');
      const hasAnswer = !!data.answer;
      
      trackEvent('ask_index_query', {
        query_length: queryToUse.trim().length,
        result_count: data.results?.length || 0,
        latency_ms: latencyMs,
        has_answer: hasAnswer,
        scope: 'global', // Ask page is always global scope
        project_id_present: false,
      });
      
      // Track ask_index_answered event only when answer is present
      if (hasAnswer) {
        trackEvent('ask_index_answered', {
          query_length: queryToUse.trim().length,
          result_count: data.results?.length || 0,
          latency_ms: latencyMs,
          scope: 'global',
          project_id_present: false,
        });
        
        // Debug logging
        if (process.env.NEXT_PUBLIC_DEBUG_ANALYTICS === 'true') {
          console.log('[Analytics] ask_index_answered fired');
        }
      }
      
      setResults(data.results || []);
      setAnswer(data.answer || null);
      setRelatedContent(data.relatedContent || null);
      setAskIndexRunId(data.ask_index_run_id || null);
      setEvidenceExpanded(false); // Collapse evidence by default
      setShowAllTiles(false); // Show max 2 tiles by default
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

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">Ask Index</h1>
          <p className="text-[rgb(var(--muted))]">
            Search across all your conversations using semantic search
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about your conversations..."
              className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Synthesized Answer */}
        {answer && (
          <div className="mb-8 space-y-6">
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✨</span>
                <h2 className="text-xl font-semibold text-foreground">Answer</h2>
              </div>
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm">
                  {answer.answer}
                </p>
              </div>

              {/* Convert Tiles */}
              {answer.followUpQuestions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Convert</h3>
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
                  
                  {/* Demoted Start Chat */}
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      Need more clarity?{' '}
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Start chat from an artifact
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Evidence (Collapsed by default) */}
              {((answer && answer.citations.length > 0) || results.length > 0 || (relatedContent && (relatedContent.highlights.length > 0 || relatedContent.threads.length > 0 || relatedContent.projects.length > 0))) && (
                <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => setEvidenceExpanded(!evidenceExpanded)}
                    className="flex items-center justify-between w-full text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
                  >
                    <span>
                      Evidence ({(answer ? answer.citations.length : 0) + results.length + (relatedContent ? relatedContent.highlights.length + relatedContent.threads.length + relatedContent.projects.length : 0)})
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {evidenceExpanded ? '−' : '+'}
                    </span>
                  </button>
                  
                  {evidenceExpanded && (
                    <div className="mt-4 space-y-4">
                      {/* Citations */}
                      {answer && answer.citations.length > 0 && (
                        <div className="space-y-2">
                          {answer.citations.map((citation, idx) => (
                            <div
                              key={citation.chunk_id}
                              className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                            >
                              <div className="flex items-start justify-between mb-1">
                                <Link
                                  href={`/conversations/${citation.conversation_id}`}
                                  className="text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
                                >
                                  {citation.conversation_title || 'Untitled Conversation'}
                                </Link>
                                <span className="text-xs text-zinc-500 dark:text-zinc-500">
                                  {(citation.similarity * 100).toFixed(0)}% match
                                </span>
                              </div>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 truncate">
                                {citation.excerpt.substring(0, 120)}
                                {citation.excerpt.length > 120 ? '...' : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Search Results */}
                      {results.length > 0 && (
                        <div className="space-y-2">
                          {results.map((result) => (
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
                                  {(result.similarity * 100).toFixed(0)}% match
                                </span>
                              </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 truncate">
                        {result.content.substring(0, 120)}
                        {result.content.length > 120 ? '...' : ''}
                      </p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Related Content (minimal) */}
                      {relatedContent && (relatedContent.highlights.length > 0 || relatedContent.threads.length > 0 || relatedContent.projects.length > 0) && (
                        <div className="space-y-2">
                          {relatedContent.highlights.map((highlight) => (
                            <Link
                              key={highlight.id}
                              href={`/conversations/${highlight.conversation_id}`}
                              className="block p-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-foreground"
                            >
                              Highlight: {highlight.label || highlight.content.substring(0, 50)}...
                            </Link>
                          ))}
                          {relatedContent.projects.map((project) => (
                            <Link
                              key={project.id}
                              href={`/projects/${project.id}`}
                              className="block p-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-foreground"
                            >
                              Project: {project.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}


        {/* Evidence drawer for results without answer */}
        {!answer && results.length > 0 && (
          <div className="mb-8">
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
              <button
                onClick={() => setEvidenceExpanded(!evidenceExpanded)}
                className="flex items-center justify-between w-full text-sm font-semibold text-foreground hover:opacity-80 transition-opacity mb-4"
              >
                <span>
                  Evidence ({results.length + (relatedContent ? relatedContent.highlights.length + relatedContent.threads.length + relatedContent.projects.length : 0)})
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {evidenceExpanded ? '−' : '+'}
                </span>
              </button>
              
              {evidenceExpanded && (
                <div className="space-y-2">
                  {results.map((result) => (
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
                          {(result.similarity * 100).toFixed(0)}% match
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 truncate">
                        {result.content.substring(0, 120)}
                        {result.content.length > 120 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && results.length === 0 && query && !error && (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400">
              No results found. Try rephrasing your query.
            </p>
          </div>
        )}

        {!query && !loading && (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Enter a question to search across all your conversations
            </p>
            <div className="text-sm text-zinc-500 dark:text-zinc-500 space-y-1">
              <p>Example queries:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>"What did I discuss about pricing?"</li>
                <li>"Show me conversations about project architecture"</li>
                <li>"What decisions did I make last week?"</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


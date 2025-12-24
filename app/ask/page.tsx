// app/ask/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FollowUpQuestion from '@/app/ask/components/FollowUpQuestion';

interface SearchResult {
  chunk_id: string;
  content: string;
  conversation_id: string;
  conversation_title: string | null;
  message_id: string;
  similarity: number;
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
  followUpQuestions: string[];
}

export default function AskPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState<SynthesizedAnswer | null>(null);
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
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      console.log('[Ask Page] Search results:', {
        resultCount: data.results?.length || 0,
        hasAnswer: !!data.answer,
        hasRelatedContent: !!data.relatedContent,
        debug: data.debug,
      });
      setResults(data.results || []);
      setAnswer(data.answer || null);
      setRelatedContent(data.relatedContent || null);
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
    <main className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">Ask Index</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
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
              <div className="prose prose-zinc dark:prose-invert max-w-none mb-6">
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {answer.answer}
                </p>
              </div>

              {/* Citations */}
              {answer.citations.length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Sources</h3>
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
                            {idx + 1}. {citation.conversation_title || 'Untitled Conversation'}
                          </Link>
                          <span className="text-xs text-zinc-500 dark:text-zinc-500">
                            {(citation.similarity * 100).toFixed(0)}% match
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                          {citation.excerpt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up Questions */}
              {answer.followUpQuestions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Follow-Up Questions</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-4">
                    Convert these prompts into branches, tasks, decisions, highlights, or continue in your chat tool.
                  </p>
                  <div className="space-y-3">
                    {answer.followUpQuestions.map((question, idx) => (
                      <FollowUpQuestion
                        key={idx}
                        prompt={question}
                        conversationIds={answer.citations.map((c) => c.conversation_id)}
                        answerContext={answer.answer}
                        sourceQuery={query}
                        onConvert={() => {
                          // Refresh to show new items
                          window.location.reload();
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Results (shown below answer) */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              {answer ? 'Related Excerpts' : `Found ${results.length} result${results.length !== 1 ? 's' : ''}`}
            </h2>
            {results.map((result) => (
              <div
                key={result.chunk_id}
                className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <Link
                      href={`/conversations/${result.conversation_id}`}
                      className="text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
                    >
                      {result.conversation_title || 'Untitled Conversation'}
                    </Link>
                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-500">
                      {(result.similarity * 100).toFixed(0)}% match
                    </span>
                  </div>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
                  {result.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Related Content */}
        {relatedContent && (relatedContent.highlights.length > 0 || relatedContent.threads.length > 0 || relatedContent.projects.length > 0) && (
          <div className="mt-8 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Related Content</h2>

            {/* Related Highlights */}
            {relatedContent.highlights.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Highlights</h3>
                <div className="space-y-2">
                  {relatedContent.highlights.map((highlight) => (
                    <Link
                      key={highlight.id}
                      href={`/conversations/${highlight.conversation_id}`}
                      className="block p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      {highlight.label && (
                        <div className="text-sm font-medium text-foreground mb-1">
                          {highlight.label}
                        </div>
                      )}
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                        {highlight.content.substring(0, 150)}
                        {highlight.content.length > 150 ? '...' : ''}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        From: {highlight.conversation_title || 'Untitled Conversation'}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related Threads/Branches */}
            {relatedContent.threads.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Related Threads</h3>
                <div className="space-y-2">
                  {relatedContent.threads.map((thread) => (
                    <Link
                      key={thread.id}
                      href={`/conversations/${thread.id}`}
                      className="block p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="text-sm font-medium text-foreground mb-1">
                        {thread.title || 'Untitled Branch'}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        Branch from: {thread.conversation_title || 'Parent Conversation'}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related Projects */}
            {relatedContent.projects.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Projects</h3>
                <div className="flex flex-wrap gap-2">
                  {relatedContent.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-sm font-medium text-foreground"
                    >
                      {project.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Start Chat removed from Ask Index results - convert to Task/Decision first */}

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


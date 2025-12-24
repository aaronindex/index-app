// lib/contextGenerator.ts
/**
 * Deterministic context block generator for round-trip chat initiation
 * Generates AI-ready context from highlights, branches, and search results
 */

export interface ContextBlock {
  project?: string;
  source: 'highlight' | 'branch' | 'search_result' | 'decision';
  summary: string;
  suggestedExploration: string;
  fullContext: string;
}

export interface HighlightContext {
  highlightContent: string;
  highlightLabel?: string | null;
  conversationTitle: string | null;
  projectName?: string | null;
}

export interface BranchContext {
  branchTitle: string | null;
  branchHighlights: Array<{ content: string; label?: string | null }>;
  parentConversationTitle: string | null;
  projectName?: string | null;
}

export interface SearchResultContext {
  chunkContent: string;
  conversationTitle: string | null;
  projectName?: string | null;
  query: string;
}

/**
 * Generate context block from a highlight
 */
export function generateContextFromHighlight(
  context: HighlightContext
): ContextBlock {
  const { highlightContent, highlightLabel, conversationTitle, projectName } = context;
  
  const summary = highlightLabel || highlightContent.substring(0, 100) + (highlightContent.length > 100 ? '...' : '');
  
  const suggestedExploration = `Explore this idea further: "${highlightContent.substring(0, 80)}${highlightContent.length > 80 ? '...' : ''}"`;
  
  let fullContext = `Context from INDEX:\n\n`;
  if (projectName) {
    fullContext += `Project: ${projectName}\n`;
  }
  fullContext += `Source: Highlight from "${conversationTitle || 'Untitled Conversation'}"\n\n`;
  fullContext += `Highlight:\n${highlightContent}\n\n`;
  if (highlightLabel) {
    fullContext += `Label: ${highlightLabel}\n\n`;
  }
  fullContext += `Suggested exploration: ${suggestedExploration}`;

  return {
    project: projectName || undefined,
    source: 'highlight',
    summary,
    suggestedExploration,
    fullContext,
  };
}

/**
 * Generate context block from a branch
 */
export function generateContextFromBranch(
  context: BranchContext
): ContextBlock {
  const { branchTitle, branchHighlights, parentConversationTitle, projectName } = context;
  
  const summary = branchTitle || `Branch with ${branchHighlights.length} highlight${branchHighlights.length !== 1 ? 's' : ''}`;
  
  const highlightsText = branchHighlights
    .map((h, idx) => `${idx + 1}. ${h.label || h.content.substring(0, 60)}${h.content.length > 60 ? '...' : ''}`)
    .join('\n');
  
  const suggestedExploration = `Continue exploring this branch: "${branchTitle || 'Untitled Branch'}"`;
  
  let fullContext = `Context from INDEX:\n\n`;
  if (projectName) {
    fullContext += `Project: ${projectName}\n`;
  }
  fullContext += `Source: Branch conversation\n`;
  fullContext += `Branch: ${branchTitle || 'Untitled Branch'}\n`;
  fullContext += `From: ${parentConversationTitle || 'Original Conversation'}\n\n`;
  fullContext += `Highlights included:\n${highlightsText}\n\n`;
  fullContext += `Suggested exploration: ${suggestedExploration}`;

  return {
    project: projectName || undefined,
    source: 'branch',
    summary,
    suggestedExploration,
    fullContext,
  };
}

/**
 * Generate context block from a search result
 */
export function generateContextFromSearchResult(
  context: SearchResultContext
): ContextBlock {
  const { chunkContent, conversationTitle, projectName, query } = context;
  
  const summary = `Relevant excerpt from "${conversationTitle || 'Untitled Conversation'}"`;
  
  const suggestedExploration = `Based on your search for "${query}", explore this further: "${chunkContent.substring(0, 80)}${chunkContent.length > 80 ? '...' : ''}"`;
  
  let fullContext = `Context from INDEX:\n\n`;
  if (projectName) {
    fullContext += `Project: ${projectName}\n`;
  }
  fullContext += `Source: Search result from "${conversationTitle || 'Untitled Conversation'}"\n`;
  fullContext += `Your query: "${query}"\n\n`;
  fullContext += `Relevant excerpt:\n${chunkContent}\n\n`;
  fullContext += `Suggested exploration: ${suggestedExploration}`;

  return {
    project: projectName || undefined,
    source: 'search_result',
    summary,
    suggestedExploration,
    fullContext,
  };
}


// lib/askRouter.ts
/**
 * Lightweight intent router for Ask Index queries.
 * Routes queries to either semantic search (recall) or structured state queries,
 * and assigns a coarse structural category for state-style questions.
 */

export type AskIntent = 'recall_semantic' | 'state';
export type AskCategory = 'STRUCTURAL' | 'DECISIONS' | 'ATTENTION' | 'EVOLUTION';

export interface AskRouterResult {
  intent: AskIntent;
  scope: 'project' | 'global';
  resolvedProjectId?: string;
  projectName?: string;
  needsDisambiguation?: boolean;
  candidateProjects?: Array<{ id: string; name: string }>;
  /** Coarse structural category for state queries (used for routing + answer shape). */
  category: AskCategory;
}

/**
 * Detect coarse structural category based on simple keyword heuristics.
 */
export function detectCategory(query: string): AskCategory {
  const normalized = query.toLowerCase().trim();

  const structuralKeywords = [
    'arc ', 'arc?', 'arcs', 'pattern', 'patterns', 'structural', 'structure', 'direction',
    'patterns are emerging', 'what patterns are emerging', 'most active arc', "what's my direction",
  ];

  const decisionsKeywords = [
    'decision', 'decisions', 'decided', 'what did i decide', 'what did we decide',
    'chose', 'chose to', 'commitment', 'commitments',
  ];

  const attentionKeywords = [
    'attention', 'needs attention', 'still needs attention', "what's still unresolved",
    'what still needs', 'blocking', 'blockers', 'blocked', 'bottleneck',
    'open loops', 'open loop', 'unresolved', 'stuck', 'todo', 'to do',
  ];

  const evolutionKeywords = [
    'shifted', 'shift', 'shifts', 'recently shifted', 'how has', 'evolved', 'evolution',
    'what changed', "what's changed", 'recently changed', 'recently', 'evolved over time',
    'how has the project evolved', 'how has this evolved',
  ];

  const includesAny = (keywords: string[]) => keywords.some((k) => normalized.includes(k));

  if (includesAny(structuralKeywords)) return 'STRUCTURAL';
  if (includesAny(attentionKeywords)) return 'ATTENTION';
  if (includesAny(evolutionKeywords)) return 'EVOLUTION';
  if (includesAny(decisionsKeywords)) return 'DECISIONS';

  // Default: most Ask queries are about decisions/meaning.
  return 'DECISIONS';
}

/**
 * Detect high-level intent (state vs semantic) based on keywords.
 */
export function detectIntent(query: string): AskIntent {
  const normalized = query.toLowerCase().trim();

  // Queries explicitly about "search" or "find" are more likely semantic recall.
  const recallKeywords = ['search for', 'find ', 'where did i talk about', 'where did we talk about'];
  if (recallKeywords.some((k) => normalized.includes(k))) {
    return 'recall_semantic';
  }

  // State query triggers (evolution / attention / status).
  const stateKeywords = [
    "what's new", 'whats new', 'new this week', 'recent', 'recently',
    'what changed', "what's changed", 'changed', 'since last',
    'blockers', 'blocked', 'stuck', 'bottleneck', 'open loops', 'unresolved',
    'status', 'in progress', 'overdue', 'priority',
    'arc ', 'arcs', 'pattern', 'patterns', 'most active arc',
    'how has', 'evolved', 'evolution', 'shifted', 'shifts',
  ];

  const hasStateKeyword = stateKeywords.some((keyword) => normalized.includes(keyword));

  return hasStateKeyword ? 'state' : 'recall_semantic';
}

/**
 * Extract project name from query if present
 * Pattern: "in [project_name]" or "[project_name]" at end
 */
export function extractProjectName(query: string): string | null {
  const normalized = query.toLowerCase().trim();
  
  // Pattern: "in [project_name]"
  const inMatch = normalized.match(/in\s+([a-z0-9\s]+?)(?:\?|$|\.)/);
  if (inMatch) {
    return inMatch[1].trim();
  }
  
  // Pattern: "[query] in [project_name]"
  const inMatch2 = normalized.match(/.+?\s+in\s+([a-z0-9\s]+?)(?:\?|$|\.)/);
  if (inMatch2) {
    return inMatch2[1].trim();
  }
  
  return null;
}

/**
 * Route Ask Index query
 */
export async function routeAskQuery(
  query: string,
  userId: string,
  projectId?: string
): Promise<AskRouterResult> {
  const category = detectCategory(query);
  const intent = detectIntent(query);
  
  // If projectId provided, use it
  if (projectId) {
    return {
      intent,
      scope: 'project',
      resolvedProjectId: projectId,
      category,
    };
  }
  
  // Try to extract project name from query
  const projectName = extractProjectName(query);
  
  if (projectName && intent === 'state') {
    // Try to resolve project by name
    const { getSupabaseServerClient } = await import('@/lib/supabaseServer');
    const supabase = await getSupabaseServerClient();
    
    // Exact match first (case-insensitive)
    const { data: exactMatch } = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', projectName)
      .limit(1)
      .single();
    
    if (exactMatch) {
      return {
        intent,
        scope: 'project',
        resolvedProjectId: exactMatch.id,
        projectName: exactMatch.name,
        category,
      };
    }
    
    // Contains match
    const { data: containsMatches } = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${projectName}%`)
      .limit(5);
    
    if (containsMatches && containsMatches.length === 1) {
      return {
        intent,
        scope: 'project',
        resolvedProjectId: containsMatches[0].id,
        projectName: containsMatches[0].name,
        category,
      };
    }
    
    if (containsMatches && containsMatches.length > 1) {
      return {
        intent,
        scope: 'global',
        needsDisambiguation: true,
        candidateProjects: containsMatches.map(p => ({ id: p.id, name: p.name })),
        category,
      };
    }
  }
  
  return {
    intent,
    scope: 'global',
    category,
  };
}

// lib/askRouter.ts
/**
 * Lightweight intent router for Ask Index queries
 * Routes queries to either semantic search (recall) or structured state queries
 */

export type AskIntent = 'recall_semantic' | 'state';

export interface AskRouterResult {
  intent: AskIntent;
  scope: 'project' | 'global';
  resolvedProjectId?: string;
  projectName?: string;
  needsDisambiguation?: boolean;
  candidateProjects?: Array<{ id: string; name: string }>;
}

/**
 * Detect query intent based on keywords
 */
export function detectIntent(query: string): AskIntent {
  const normalized = query.toLowerCase().trim();
  
  // State query triggers
  const stateKeywords = [
    "what's new", "whats new", "new this week", "recent", "recently",
    "what changed", "what's changed", "changed", "since last",
    "blockers", "blocked", "stuck", "bottleneck", "open loops", "unresolved",
    "status", "in progress", "overdue", "priority"
  ];
  
  const hasStateKeyword = stateKeywords.some(keyword => normalized.includes(keyword));
  
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
  const intent = detectIntent(query);
  
  // If projectId provided, use it
  if (projectId) {
    return {
      intent,
      scope: 'project',
      resolvedProjectId: projectId,
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
      };
    }
    
    if (containsMatches && containsMatches.length > 1) {
      return {
        intent,
        scope: 'global',
        needsDisambiguation: true,
        candidateProjects: containsMatches.map(p => ({ id: p.id, name: p.name })),
      };
    }
  }
  
  return {
    intent,
    scope: 'global',
  };
}

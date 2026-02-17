// lib/stateQuery.ts
/**
 * Structured state queries for Ask Index
 * Queries tasks and decisions tables directly (no embeddings)
 */

import { getSupabaseServerClient } from '@/lib/supabaseServer';

export interface StateQueryResult {
  currentDirection?: string;
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
  timeWindowDaysUsed: number;
  changeDefinition: 'updated_at';
}

/**
 * Query state data (tasks, decisions) for "what's new" / "what changed" queries
 */
export async function queryState(
  userId: string,
  projectId?: string,
  timeWindowDays: number = 7
): Promise<StateQueryResult> {
  const supabase = await getSupabaseServerClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - timeWindowDays * 24 * 60 * 60 * 1000);
  
  // Get project conversation IDs if scoped to project
  let conversationIds: string[] | undefined = undefined;
  if (projectId) {
    const { data: projectConvs } = await supabase
      .from('project_conversations')
      .select('conversation_id')
      .eq('project_id', projectId);
    
    if (projectConvs && projectConvs.length > 0) {
      conversationIds = projectConvs.map((pc) => pc.conversation_id);
    } else {
      // No conversations in project, return empty
      return {
        newDecisions: [],
        newOrChangedTasks: [],
        blockersOrStale: [],
        timeWindowDaysUsed: timeWindowDays,
        changeDefinition: 'updated_at',
      };
    }
  }
  
  // Query recent decisions
  let decisionsQuery = supabase
    .from('decisions')
    .select('id, title, created_at, project_id, conversation_id')
    .eq('user_id', userId)
    .eq('is_inactive', false)
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (projectId) {
    // Decisions by project_id OR conversation_id
    if (conversationIds && conversationIds.length > 0) {
      decisionsQuery = decisionsQuery.or(`project_id.eq.${projectId},conversation_id.in.(${conversationIds.join(',')})`);
    } else {
      decisionsQuery = decisionsQuery.eq('project_id', projectId);
    }
  }
  
  const { data: decisions } = await decisionsQuery;
  
  // Query recent/changed tasks
  let tasksQuery = supabase
    .from('tasks')
    .select('id, title, status, created_at, updated_at, project_id, description')
    .eq('user_id', userId)
    .eq('is_inactive', false)
    .gte('updated_at', windowStart.toISOString())
    .order('updated_at', { ascending: false })
    .limit(7);
  
  if (projectId) {
    tasksQuery = tasksQuery.eq('project_id', projectId);
  }
  
  const { data: tasks } = await tasksQuery;
  
  // Query blockers/stale tasks
  let blockersQuery = supabase
    .from('tasks')
    .select('id, title, status, updated_at, project_id, description')
    .eq('user_id', userId)
    .eq('is_inactive', false)
    .not('status', 'in', '(complete,cancelled)')
    .order('updated_at', { ascending: true }) // Oldest first (most stale)
    .limit(5);
  
  if (projectId) {
    blockersQuery = blockersQuery.eq('project_id', projectId);
  }
  
  const { data: allTasks } = await blockersQuery;
  
  // Identify blockers and stale tasks
  const blockersOrStale: StateQueryResult['blockersOrStale'] = [];
  const staleThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days
  
  if (allTasks) {
    for (const task of allTasks) {
      // Check for blockers: description contains [Blocker] or "blocked" text
      const isBlocked = task.description?.includes('[Blocker]') ||
                       task.description?.toLowerCase().includes('blocked') ||
                       task.status === 'priority'; // Priority tasks often indicate blockers
      
      // Stale: in_progress tasks not updated in 14+ days
      const isStale = !isBlocked && 
                     task.status === 'in_progress' && 
                     new Date(task.updated_at) < staleThreshold;
      
      if (isBlocked || isStale) {
        blockersOrStale.push({
          id: task.id,
          title: task.title,
          status: task.status,
          updated_at: task.updated_at,
          project_id: task.project_id,
          project_name: null, // Will be populated below
          reason: isBlocked ? 'blocked' : 'stale',
        });
      }
    }
  }
  
  // Get project names for all items
  const projectIds = new Set<string>();
  if (decisions) {
    decisions.forEach(d => { if (d.project_id) projectIds.add(d.project_id); });
  }
  if (tasks) {
    tasks.forEach(t => { if (t.project_id) projectIds.add(t.project_id); });
  }
  blockersOrStale.forEach(b => { if (b.project_id) projectIds.add(b.project_id); });
  
  const projectMap = new Map<string, string>();
  if (projectIds.size > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', Array.from(projectIds))
      .eq('user_id', userId);
    
    if (projects) {
      projects.forEach(p => projectMap.set(p.id, p.name));
    }
  }
  
  // Derive current direction (for project-scoped queries)
  let currentDirection: string | undefined = undefined;
  if (projectId && decisions && decisions.length > 0) {
    currentDirection = decisions[0].title;
  } else if (projectId && tasks && tasks.length > 0) {
    // Use most recently updated active task
    const activeTask = tasks.find(t => t.status !== 'complete' && t.status !== 'cancelled');
    if (activeTask) {
      currentDirection = activeTask.title;
    }
  }
  
  return {
    currentDirection,
    newDecisions: (decisions || []).map(d => ({
      id: d.id,
      title: d.title,
      created_at: d.created_at,
      project_id: d.project_id,
      project_name: d.project_id ? projectMap.get(d.project_id) || null : null,
    })),
    newOrChangedTasks: (tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      created_at: t.created_at,
      updated_at: t.updated_at,
      project_id: t.project_id,
      project_name: t.project_id ? projectMap.get(t.project_id) || null : null,
    })),
    blockersOrStale: blockersOrStale.map(b => ({
      ...b,
      project_name: b.project_id ? projectMap.get(b.project_id) || null : null,
    })),
    timeWindowDaysUsed: timeWindowDays,
    changeDefinition: 'updated_at',
  };
}

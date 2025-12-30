// lib/startChat/compiler.ts
/**
 * Deterministic Continuity Packet compiler for Start Chat
 * Generates weighted, condensed prompts for external AI reasoning
 */

import { getSupabaseServerClient } from '@/lib/supabaseServer';

export interface ContextRef {
  type: 'task' | 'decision' | 'highlight' | 'conversation';
  id: string;
  score: number;
  excerpt?: string; // Short excerpt if from conversation
}

export interface ContinuityPacket {
  promptText: string;
  contextRefs: ContextRef[];
}

export type StartChatIntent =
  | 'decide_between_options'
  | 'generate_next_actions'
  | 'resolve_blocking_uncertainty'
  | 'produce_plan_architecture'
  | 'stress_test_direction'
  | 'summarize_state_propose_path'
  | 'custom';

export const INTENT_DESCRIPTIONS: Record<StartChatIntent, string> = {
  decide_between_options: 'Decide between options',
  generate_next_actions: 'Generate next concrete actions',
  resolve_blocking_uncertainty: 'Resolve a blocking uncertainty',
  produce_plan_architecture: 'Produce a plan / architecture',
  stress_test_direction: 'Stress-test current direction',
  summarize_state_propose_path: 'Summarize state → propose path forward',
  custom: 'Custom intent',
};

const PROMPT_BUDGET = 7000; // Character limit for prompt

/**
 * Calculate importance score for a thought object
 */
function calculateImportanceScore(
  item: any,
  type: 'task' | 'decision' | 'highlight',
  now: Date
): number {
  let score = 0;

  // Recency decay (more recent = higher score)
  const created = new Date(item.created_at);
  const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - daysSinceCreation / 30); // Decay over 30 days
  score += recencyScore * 0.3;

  // Manual importance (status/priority)
  if (type === 'task') {
    if (item.status === 'priority') score += 0.4;
    if (item.status === 'open' || item.status === 'in_progress') score += 0.2;
    // Blocked boost (if description mentions blocker)
    if (item.description?.toLowerCase().includes('[blocker]')) score += 0.3;
  } else if (type === 'decision') {
    score += 0.3; // Decisions are inherently important
  } else if (type === 'highlight') {
    if (item.label) score += 0.2; // Labeled highlights are more important
  }

  return Math.min(1, score);
}

/**
 * Compile Project Continuity Packet
 */
export async function compileProjectContinuityPacket(
  projectId: string,
  userId: string,
  intent: string,
  targetTool: 'chatgpt' | 'claude' | 'cursor' | 'other'
): Promise<ContinuityPacket> {
  const supabase = await getSupabaseServerClient();

  // Get project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) {
    throw new Error('Project not found');
  }

  // Get project conversations
  const { data: projectConversations } = await supabase
    .from('project_conversations')
    .select('conversation_id')
    .eq('project_id', projectId);

  const conversationIds = projectConversations?.map((pc) => pc.conversation_id) || [];

  // Get top tasks (priority/open/blocked) - exclude inactive
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, status, created_at')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('is_inactive', false)
    .in('status', ['open', 'in_progress', 'priority'])
    .order('created_at', { ascending: false })
    .limit(10);

  // Get key decisions - exclude inactive
  const { data: decisions } = await supabase
    .from('decisions')
    .select('id, title, content, created_at, conversation_id')
    .eq('user_id', userId)
    .eq('is_inactive', false)
    .in('conversation_id', conversationIds.length > 0 ? conversationIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false })
    .limit(7);

  // Get key highlights (recent + important) - exclude inactive conversations
  const { data: highlights } = await supabase
    .from('highlights')
    .select('id, content, label, created_at, conversation_id')
    .eq('user_id', userId)
    .in('conversation_id', conversationIds.length > 0 ? conversationIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false })
    .limit(20); // Get more to filter redacted ones

  // Get recent conversation titles - exclude inactive
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .in('id', conversationIds)
    .eq('user_id', userId)
    .eq('is_inactive', false)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get redactions for this project to filter out redacted content
  const { data: redactions } = await supabase
    .from('redactions')
    .select('message_id, message_chunk_id, conversation_id')
    .eq('project_id', projectId)
    .eq('user_id', userId);

  const now = new Date();
  const contextRefs: ContextRef[] = [];

  // Score and sort tasks
  const scoredTasks = (tasks || []).map((t) => ({
    ...t,
    score: calculateImportanceScore(t, 'task', now),
  }));
  scoredTasks.sort((a, b) => b.score - a.score);
  const topTasks = scoredTasks.slice(0, 5);

  // Score and sort decisions
  const scoredDecisions = (decisions || []).map((d) => ({
    ...d,
    score: calculateImportanceScore(d, 'decision', now),
  }));
  scoredDecisions.sort((a, b) => b.score - a.score);
  const topDecisions = scoredDecisions.slice(0, 5);

  // Score and sort highlights, filtering out redacted ones
  const redactedConversationIds = new Set(redactions?.map((r) => r.conversation_id).filter(Boolean) || []);
  
  // Filter highlights: exclude those from redacted conversations
  const filteredHighlights = (highlights || []).filter((h) => {
    // Exclude if conversation is redacted
    if (redactedConversationIds.has(h.conversation_id)) {
      return false;
    }
    return true;
  });
  
  const scoredHighlights = filteredHighlights.map((h) => ({
    ...h,
    score: calculateImportanceScore(h, 'highlight', now),
  }));
  scoredHighlights.sort((a, b) => b.score - a.score);
  const topHighlights = scoredHighlights.slice(0, 5);

  // Build context refs
  topTasks.forEach((t) => {
    contextRefs.push({ type: 'task', id: t.id, score: t.score });
  });
  topDecisions.forEach((d) => {
    contextRefs.push({ type: 'decision', id: d.id, score: d.score });
  });
  topHighlights.forEach((h) => {
    contextRefs.push({ type: 'highlight', id: h.id, score: h.score });
  });

  // Build Continuity Packet
  let prompt = '';

  // 1. Continuity Intent
  prompt += `CONTINUITY INTENT\n`;
  prompt += `${intent}\n\n`;

  // 2. Non-Negotiable Constraints
  prompt += `NON-NEGOTIABLE CONSTRAINTS\n`;
  const constraints: string[] = [];
  if (project.description) {
    constraints.push(project.description.substring(0, 200));
  }
  // Add constraints from decisions
  topDecisions.slice(0, 3).forEach((d) => {
    if (d.content) {
      constraints.push(`Decision: ${d.title} - ${d.content.substring(0, 150)}`);
    }
  });
  constraints.slice(0, 7).forEach((c, i) => {
    prompt += `${i + 1}. ${c}\n`;
  });
  prompt += '\n';

  // 3. Named Concepts & Shorthand
  prompt += `NAMED CONCEPTS & SHORTHAND\n`;
  const concepts: Array<{ name: string; definition: string }> = [
    { name: 'Branchless Model', definition: 'No branch conversations; meaning objects only' },
    { name: 'Thought-Objects', definition: 'Highlights, Tasks, Decisions' },
    { name: 'Escape Hatch', definition: 'Start Chat is bounded external reasoning' },
  ];
  if (topTasks.length > 0) {
    concepts.push({
      name: 'Active Tasks',
      definition: `${topTasks.length} open/in-progress tasks in this project`,
    });
  }
  concepts.forEach((c, i) => {
    prompt += `• ${c.name}: ${c.definition}\n`;
  });
  prompt += '\n';

  // 4. Current Direction of Travel
  prompt += `CURRENT DIRECTION OF TRAVEL\n`;
  const directionParts: string[] = [];
  if (topTasks.length > 0) {
    directionParts.push(
      `Active work: ${topTasks.map((t) => t.title).join(', ')}`
    );
  }
  if (topDecisions.length > 0) {
    directionParts.push(
      `Recent decisions: ${topDecisions.map((d) => d.title).join(', ')}`
    );
  }
  if (conversations && conversations.length > 0) {
    directionParts.push(
      `Recent conversations: ${conversations.map((c) => c.title || 'Untitled').join(', ')}`
    );
  }
  prompt += directionParts.join('. ') + '.\n\n';

  // 5. Live Tensions / Open Questions
  prompt += `LIVE TENSIONS / OPEN QUESTIONS\n`;
  const tensions: string[] = [];
  topTasks
    .filter((t) => t.description?.toLowerCase().includes('[blocker]') || t.description?.toLowerCase().includes('[open loop]'))
    .slice(0, 5)
    .forEach((t) => {
      tensions.push(t.title);
    });
  topTasks
    .filter((t) => t.status === 'open' && !tensions.includes(t.title))
    .slice(0, 3)
    .forEach((t) => {
      tensions.push(t.title);
    });
  tensions.slice(0, 7).forEach((t, i) => {
    prompt += `${i + 1}. ${t}\n`;
  });
  prompt += '\n';

  // 6. Minimal State Snapshot
  prompt += `MINIMAL STATE SNAPSHOT\n`;
  prompt += `Project: ${project.name}\n`;
  prompt += `Active Tasks: ${topTasks.length}\n`;
  prompt += `Key Decisions: ${topDecisions.length}\n`;
  prompt += `Key Highlights: ${topHighlights.length}\n`;
  if (conversations && conversations.length > 0) {
    prompt += `Recent Conversations: ${conversations.length}\n`;
  }
  prompt += '\n';

  // 7. Explicit Continuation Instruction
  prompt += `EXPLICIT CONTINUATION INSTRUCTION\n`;
  prompt += `Based on the intent "${intent}", provide structured output that can be harvested into Tasks, Decisions, or Highlights.\n\n`;

  // 8. User-selected Intent + Request
  prompt += `INTENT + REQUEST\n`;
  prompt += `Intent: ${intent}\n`;
  prompt += `Please proceed with this intent, considering the constraints, concepts, and tensions above.\n\n`;

  // 9. Return Contract
  prompt += `RETURN CONTRACT\n`;
  prompt += `Structure your response as:\n`;
  prompt += `- Clear answer/recommendation\n`;
  prompt += `- Actionable next steps (as bullet points)\n`;
  prompt += `- Any decisions to make (as bullet points)\n`;
  prompt += `- Key insights to capture (as bullet points)\n`;

  // Enforce budget
  if (prompt.length > PROMPT_BUDGET) {
    prompt = prompt.substring(0, PROMPT_BUDGET - 100) + '\n\n[Prompt truncated to budget]';
  }

  return { promptText: prompt, contextRefs };
}

/**
 * Compile Task Start Chat Packet
 */
export async function compileTaskStartChatPacket(
  taskId: string,
  userId: string,
  targetTool: 'chatgpt' | 'claude' | 'cursor' | 'other'
): Promise<ContinuityPacket> {
  const supabase = await getSupabaseServerClient();

  const { data: task } = await supabase
    .from('tasks')
    .select('id, title, description, status, project_id, conversation_id, source_highlight_id')
    .eq('id', taskId)
    .eq('user_id', userId)
    .eq('is_inactive', false)
    .single();

  if (!task) {
    throw new Error('Task not found');
  }

  // Get project
  let projectName = null;
  if (task.project_id) {
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', task.project_id)
      .single();
    projectName = project?.name || null;
  }

  // Get related highlight if exists
  let highlightContent = null;
  if (task.source_highlight_id) {
    const { data: highlight } = await supabase
      .from('highlights')
      .select('content, label')
      .eq('id', task.source_highlight_id)
      .single();
    highlightContent = highlight?.content || null;
  }

  const contextRefs: ContextRef[] = [{ type: 'task', id: task.id, score: 1.0 }];
  if (task.source_highlight_id) {
    contextRefs.push({ type: 'highlight', id: task.source_highlight_id, score: 0.8 });
  }

  let prompt = '';

  prompt += `TASK: ${task.title}\n\n`;

  if (task.description) {
    prompt += `Description:\n${task.description}\n\n`;
  }

  if (projectName) {
    prompt += `Project: ${projectName}\n\n`;
  }

  if (highlightContent) {
    prompt += `Source Highlight:\n${highlightContent.substring(0, 300)}\n\n`;
  }

  prompt += `INTENT: Resolve/Plan/Debug this task\n\n`;
  prompt += `Please help me:\n`;
  prompt += `- Understand what needs to be done\n`;
  prompt += `- Identify blockers or dependencies\n`;
  prompt += `- Generate concrete next steps\n`;
  prompt += `- Suggest any decisions that need to be made\n\n`;
  prompt += `Structure your response as actionable items that can be converted into Tasks or Decisions.`;

  if (prompt.length > PROMPT_BUDGET) {
    prompt = prompt.substring(0, PROMPT_BUDGET - 100) + '\n\n[Prompt truncated to budget]';
  }

  return { promptText: prompt, contextRefs };
}

/**
 * Compile Decision Start Chat Packet
 */
export async function compileDecisionStartChatPacket(
  decisionId: string,
  userId: string,
  targetTool: 'chatgpt' | 'claude' | 'cursor' | 'other'
): Promise<ContinuityPacket> {
  const supabase = await getSupabaseServerClient();

  const { data: decision } = await supabase
    .from('decisions')
    .select('id, title, content, conversation_id, project_id, created_at')
    .eq('id', decisionId)
    .eq('user_id', userId)
    .eq('is_inactive', false)
    .single();

  if (!decision) {
    throw new Error('Decision not found');
  }

  // Get project details
  let projectName = null;
  let projectDescription = null;
  let projectId = decision.project_id;

  // If no project_id, try to get from conversation
  if (!projectId && decision.conversation_id) {
    const { data: projectLink } = await supabase
      .from('project_conversations')
      .select('project_id, projects(name, description)')
      .eq('conversation_id', decision.conversation_id)
      .single();
    if (projectLink) {
      projectId = (projectLink as any).project_id;
      projectName = (projectLink as any)?.projects?.name || null;
      projectDescription = (projectLink as any)?.projects?.description || null;
    }
  } else if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('name, description')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();
    projectName = project?.name || null;
    projectDescription = project?.description || null;
  }

  // Get project conversations if we have a project
  let conversationIds: string[] = [];
  if (projectId) {
    const { data: projectConversations } = await supabase
      .from('project_conversations')
      .select('conversation_id')
      .eq('project_id', projectId);
    conversationIds = projectConversations?.map((pc) => pc.conversation_id) || [];
  } else if (decision.conversation_id) {
    conversationIds = [decision.conversation_id];
  }

  // Get related tasks in the project
  const { data: relatedTasks } = projectId
    ? await supabase
        .from('tasks')
        .select('id, title, description, status, created_at')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('is_inactive', false)
        .in('status', ['open', 'in_progress', 'priority'])
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: null };

  // Get other decisions in the project
  const { data: otherDecisions } = projectId
    ? await supabase
        .from('decisions')
        .select('id, title, content, created_at')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('is_inactive', false)
        .neq('id', decisionId)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: null };

  // Get related highlights
  const { data: relatedHighlights } = conversationIds.length > 0
    ? await supabase
        .from('highlights')
        .select('id, content, label, created_at')
        .eq('user_id', userId)
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: null };

  // Get conversation context if available
  let conversationContext = null;
  if (decision.conversation_id) {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, title')
      .eq('id', decision.conversation_id)
      .eq('user_id', userId)
      .eq('is_inactive', false)
      .single();
    
    if (conversation) {
      // Get a few key messages from the conversation
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content, index_in_conversation')
        .eq('conversation_id', decision.conversation_id)
        .order('index_in_conversation', { ascending: true })
        .limit(10);
      
      if (messages && messages.length > 0) {
        conversationContext = {
          title: conversation.title,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content.substring(0, 200),
          })),
        };
      }
    }
  }

  // Build context refs
  const contextRefs: ContextRef[] = [{ type: 'decision', id: decision.id, score: 1.0 }];
  
  if (relatedTasks && relatedTasks.length > 0) {
    relatedTasks.forEach((t) => {
      contextRefs.push({ type: 'task', id: t.id, score: 0.7 });
    });
  }
  
  if (otherDecisions && otherDecisions.length > 0) {
    otherDecisions.forEach((d) => {
      contextRefs.push({ type: 'decision', id: d.id, score: 0.6 });
    });
  }
  
  if (relatedHighlights && relatedHighlights.length > 0) {
    relatedHighlights.forEach((h) => {
      contextRefs.push({ type: 'highlight', id: h.id, score: 0.5 });
    });
  }

  // Build Continuity Packet
  let prompt = '';

  // 1. Decision Context
  prompt += `DECISION TO RE-EVALUATE\n`;
  prompt += `${decision.title}\n\n`;

  if (decision.content) {
    prompt += `Decision Details:\n${decision.content}\n\n`;
  }

  // 2. Project Context
  if (projectName) {
    prompt += `PROJECT CONTEXT\n`;
    prompt += `Project: ${projectName}\n`;
    if (projectDescription) {
      prompt += `Description: ${projectDescription.substring(0, 200)}\n`;
    }
    prompt += '\n';
  }

  // 3. Related Tasks
  if (relatedTasks && relatedTasks.length > 0) {
    prompt += `RELATED ACTIVE TASKS\n`;
    relatedTasks.forEach((task, i) => {
      prompt += `${i + 1}. ${task.title} (${task.status})`;
      if (task.description) {
        prompt += `: ${task.description.substring(0, 100)}`;
      }
      prompt += '\n';
    });
    prompt += '\n';
  }

  // 4. Other Decisions
  if (otherDecisions && otherDecisions.length > 0) {
    prompt += `OTHER DECISIONS IN THIS PROJECT\n`;
    otherDecisions.forEach((d, i) => {
      prompt += `${i + 1}. ${d.title}`;
      if (d.content) {
        prompt += `: ${d.content.substring(0, 100)}`;
      }
      prompt += '\n';
    });
    prompt += '\n';
  }

  // 5. Related Highlights
  if (relatedHighlights && relatedHighlights.length > 0) {
    prompt += `KEY HIGHLIGHTS\n`;
    relatedHighlights.forEach((h, i) => {
      prompt += `${i + 1}. ${h.label || 'Highlight'}: ${h.content.substring(0, 150)}\n`;
    });
    prompt += '\n';
  }

  // 6. Conversation Context
  if (conversationContext) {
    prompt += `CONVERSATION CONTEXT\n`;
    prompt += `From: ${conversationContext.title}\n`;
    prompt += `Key Messages:\n`;
    conversationContext.messages.slice(0, 5).forEach((m: any) => {
      const roleLabel = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'AI' : m.role;
      prompt += `- ${roleLabel}: ${m.content}\n`;
    });
    prompt += '\n';
  }

  // 7. Intent
  prompt += `INTENT: Stress-test / Re-evaluate this decision\n\n`;
  prompt += `Please help me:\n`;
  prompt += `- Identify potential risks or blind spots given the project context\n`;
  prompt += `- Consider alternative approaches in light of related tasks and decisions\n`;
  prompt += `- Evaluate reversibility and impact on the project\n`;
  prompt += `- Suggest validation steps or experiments\n`;
  prompt += `- Identify any dependencies or blockers related to this decision\n\n`;
  prompt += `Structure your response as actionable items that can be converted into Tasks or Decisions.`;

  // Enforce budget
  if (prompt.length > PROMPT_BUDGET) {
    prompt = prompt.substring(0, PROMPT_BUDGET - 100) + '\n\n[Prompt truncated to budget]';
  }

  return { promptText: prompt, contextRefs };
}


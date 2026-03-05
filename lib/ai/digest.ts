// lib/ai/digest.ts
/**
 * Weekly digest generation using OpenAI
 */

import { THINKING_STANCE } from './stance';
import { DIGEST_LIMITS } from '@/lib/limits';
import { openaiRequest } from './request';

interface ConversationSummary {
  id: string;
  title: string | null;
  messageCount: number;
  highlights: Array<{ content: string; label?: string | null }>;
  firstMessage: string | null;
}

interface TaskSummary {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'complete' | 'cancelled';
}

interface DecisionSummary {
  id: string;
  title: string;
  content: string | null;
}

interface ChangeCounts {
  conversations: number;
  highlights: number;
  tasks: number;
  decisions: number;
}

interface DigestData {
  summary: string;
  whatChanged: {
    conversations: number;
    highlights: number;
    tasks: number;
    decisions: number;
    narrative: string;
  };
  topThemes: Array<{ theme: string; weight: number; description?: string }>;
  openLoops: Array<{ conversation_id: string; conversation_title: string | null; snippet: string; priority?: 'high' | 'medium' | 'low' }>;
  recommendedNextSteps: Array<{ action: string; reason: string; priority?: 'high' | 'medium' | 'low' }>;
}

/**
 * Generate a weekly digest from conversations, highlights, and tasks
 */
export async function generateWeeklyDigest(
  conversations: ConversationSummary[],
  weekStart: Date,
  weekEnd: Date,
  tasks?: TaskSummary[],
  decisions?: DecisionSummary[],
  changeCounts?: ChangeCounts
): Promise<DigestData> {
  if (conversations.length === 0) {
    return {
      summary: 'No conversations this week.',
      whatChanged: {
        conversations: 0,
        highlights: 0,
        tasks: 0,
        decisions: 0,
        narrative: 'No activity this week.',
      },
      topThemes: [],
      openLoops: [],
      recommendedNextSteps: [],
    };
  }

  // Cap conversations to DIGEST_MAX_CONVERSATIONS (already capped in route, but enforce here too)
  const cappedConversations = conversations.slice(0, DIGEST_LIMITS.maxConversations);

  // Build context for the LLM with size caps
  let conversationContext = cappedConversations
    .map((conv) => {
      const highlightsText = conv.highlights.length > 0
        ? `\nHighlights: ${conv.highlights.map((h) => h.label || h.content.substring(0, 100)).join('; ')}`
        : '';
      // Cap per-conversation excerpt
      const excerpt = conv.firstMessage
        ? conv.firstMessage.substring(0, DIGEST_LIMITS.maxConvoExcerptChars)
        : '';
      return `- "${conv.title || 'Untitled'}" (${conv.messageCount} messages)${excerpt ? `\n  ${excerpt}${excerpt.length >= DIGEST_LIMITS.maxConvoExcerptChars ? '...' : ''}` : ''}${highlightsText}`;
    })
    .join('\n');

  // Truncate conversation context if it exceeds budget
  if (conversationContext.length > DIGEST_LIMITS.promptBudgetChars * 0.6) {
    // Reserve 40% for other sections
    conversationContext = conversationContext.substring(0, Math.floor(DIGEST_LIMITS.promptBudgetChars * 0.6));
  }

  const tasksContext = tasks && tasks.length > 0
    ? `\n\nTasks this week (${tasks.length} total):
${tasks.map((t) => `- "${t.title}" (${t.status})${t.description ? `: ${t.description.substring(0, 100)}` : ''}`).join('\n')}`
    : '';

  const decisionsContext = decisions && decisions.length > 0
    ? `\n\nDecisions made this week (${decisions.length} total):
${decisions.map((d) => `- "${d.title}"${d.content ? `: ${d.content.substring(0, 100)}` : ''}`).join('\n')}`
    : '';

  const changeCountsText = changeCounts
    ? `\n\nActivity Summary:
- ${changeCounts.conversations} conversation${changeCounts.conversations !== 1 ? 's' : ''}
- ${changeCounts.highlights} highlight${changeCounts.highlights !== 1 ? 's' : ''}
- ${changeCounts.tasks} task${changeCounts.tasks !== 1 ? 's' : ''}
- ${changeCounts.decisions} decision${changeCounts.decisions !== 1 ? 's' : ''}`
    : '';

  // Build full prompt
  let prompt = `You are generating a Weekly Log for the period ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}.

THINKING STANCE:
${THINKING_STANCE}

You are given structural activity for this week:
Conversations this week:
${conversationContext}${tasksContext}${decisionsContext}${changeCountsText}

Use this calm, factual, observational tone:
- Describe what happened without judging it.
- You may use light narrative connective tissue.
- Do not give advice, do not coach, do not speculate about motives.

Use these inputs in plain language:
- decisions recorded (titles + short content)
- results recorded or implied in decisions
- structural shifts in work or focus
- tasks and highlights that show movement
- counts of conversations, highlights, tasks, and decisions

STRUCTURE YOUR THINKING INTO FOUR SECTIONS:

1) Week Overview
- 1 short paragraph (2–3 sentences) describing what this week was about.
- Focus on concrete movement the user can see in the data.

2) Structural Changes
- Short bullet list of specific structural changes (e.g., tasks opened/closed, new lines of work started, areas that went quiet).
- Base bullets only on the information and counts provided. Do not invent events or numbers.

3) Decisions and Results
- Start with a short line summarizing how many decisions/results were captured.
- Optionally add 1–3 bullets naming the most important decisions or results in plain language.

4) Open Tension
- Bullet list of open questions, undecided paths, or tensions that remain active.
- If there is truly nothing unresolved, say "None recorded." for this section.

Keep the overall output short. Prefer concise sentences and compact bullets.

Return your response as JSON with this structure:
{
  "summary": "declarative summary (max 3-4 sentences)",
  "whatChanged": {
    "conversations": ${changeCounts?.conversations || 0},
    "highlights": ${changeCounts?.highlights || 0},
    "tasks": ${changeCounts?.tasks || 0},
    "decisions": ${changeCounts?.decisions || 0},
    "narrative": "ledger entry (1-3 sentences)"
  },
  "topThemes": [
    {"theme": "theme name", "weight": 0.8, "description": "brief description"},
    ...
  ],
  "openLoops": [
    {"conversation_id": "uuid or empty", "conversation_title": "title or null", "snippet": "imperative text (no 'we can')", "priority": "high|medium|low"},
    ...
  ],
  "recommendedNextSteps": [
    {"action": "imperative action (<=60 chars)", "reason": "specific payoff or omit", "priority": "high|medium|low"},
    ...
  ]
}

Be decisive. Declare signal, don't narrate activity.`;

  // Enforce prompt budget
  if (prompt.length > DIGEST_LIMITS.promptBudgetChars) {
    prompt = prompt.substring(0, DIGEST_LIMITS.promptBudgetChars - 100) + '\n\n[Prompt truncated to budget]';
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await openaiRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an intelligent assistant that helps users understand patterns in their thinking and work. Return only valid JSON.\n\nTHINKING STANCE:\n${THINKING_STANCE}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: DIGEST_LIMITS.maxOutputTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const parsed = JSON.parse(content);
    
    // Validate and normalize the response
    return {
      summary: parsed.summary || 'No summary generated.',
      whatChanged: parsed.whatChanged ? {
        conversations: typeof parsed.whatChanged.conversations === 'number' ? parsed.whatChanged.conversations : (changeCounts?.conversations || 0),
        highlights: typeof parsed.whatChanged.highlights === 'number' ? parsed.whatChanged.highlights : (changeCounts?.highlights || 0),
        tasks: typeof parsed.whatChanged.tasks === 'number' ? parsed.whatChanged.tasks : (changeCounts?.tasks || 0),
        decisions: typeof parsed.whatChanged.decisions === 'number' ? parsed.whatChanged.decisions : (changeCounts?.decisions || 0),
        narrative: parsed.whatChanged.narrative || 'Activity this week.',
      } : {
        conversations: changeCounts?.conversations || 0,
        highlights: changeCounts?.highlights || 0,
        tasks: changeCounts?.tasks || 0,
        decisions: changeCounts?.decisions || 0,
        narrative: `This week: ${changeCounts?.conversations || 0} conversations, ${changeCounts?.highlights || 0} highlights, ${changeCounts?.tasks || 0} tasks, ${changeCounts?.decisions || 0} decisions.`,
      },
      topThemes: Array.isArray(parsed.topThemes)
        ? parsed.topThemes.map((t: any) => ({
            theme: t.theme || 'Unknown',
            weight: typeof t.weight === 'number' ? Math.max(0, Math.min(1, t.weight)) : 0.5,
            description: t.description || null,
          }))
        : [],
      openLoops: Array.isArray(parsed.openLoops)
        ? parsed.openLoops.map((ol: any) => ({
            conversation_id: ol.conversation_id || '',
            conversation_title: ol.conversation_title || null,
            snippet: ol.snippet || '',
            priority: ['high', 'medium', 'low'].includes(ol.priority) ? ol.priority : 'medium',
          }))
        : [],
      recommendedNextSteps: Array.isArray(parsed.recommendedNextSteps)
        ? parsed.recommendedNextSteps.map((step: any) => ({
            action: step.action || '',
            reason: step.reason || '',
            priority: ['high', 'medium', 'low'].includes(step.priority) ? step.priority : 'medium',
          }))
        : [],
    };
  } catch (error) {
    console.error('Digest generation error:', error);
    // Return a fallback digest
    return {
      summary: `This week you had ${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}. Review them to identify key themes and open loops.`,
      whatChanged: {
        conversations: changeCounts?.conversations || conversations.length,
        highlights: changeCounts?.highlights || 0,
        tasks: changeCounts?.tasks || 0,
        decisions: changeCounts?.decisions || 0,
        narrative: `This week: ${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}${changeCounts ? `, ${changeCounts.highlights} highlight${changeCounts.highlights !== 1 ? 's' : ''}, ${changeCounts.tasks} task${changeCounts.tasks !== 1 ? 's' : ''}, ${changeCounts.decisions} decision${changeCounts.decisions !== 1 ? 's' : ''}` : ''}.`,
      },
      topThemes: [],
      openLoops: [],
      recommendedNextSteps: [],
    };
  }
}


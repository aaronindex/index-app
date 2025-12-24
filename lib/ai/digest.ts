// lib/ai/digest.ts
/**
 * Weekly digest generation using OpenAI
 */

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

  // Build context for the LLM
  const conversationContext = conversations
    .map((conv) => {
      const highlightsText = conv.highlights.length > 0
        ? `\nHighlights: ${conv.highlights.map((h) => h.label || h.content.substring(0, 100)).join('; ')}`
        : '';
      return `- "${conv.title || 'Untitled'}" (${conv.messageCount} messages)${highlightsText}`;
    })
    .join('\n');

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

  const prompt = `You are analyzing a week of AI conversations from ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}.

Conversations this week:
${conversationContext}${tasksContext}${decisionsContext}${changeCountsText}

Generate a comprehensive weekly digest with a multi-section narrative structure:

1. **Summary** (2-3 paragraphs): Main themes, insights, progress, and action items from the week
2. **What Changed** (1 paragraph narrative): A narrative description of what changed this week, highlighting key activities and progress
3. **Top Themes** (3-5 themes): Major themes with weights (0-1 scale) and brief descriptions
4. **Open Loops** (unresolved items): Unresolved questions, incomplete thoughts, or follow-ups needed, with priority levels (high/medium/low)
5. **Recommended Next Steps** (3-5 actions): Specific, actionable next steps with reasons and priority levels

${tasks && tasks.length > 0 ? 'Note: Include any open or in-progress tasks in the summary, open loops, and recommended next steps.' : ''}

Return your response as JSON with this structure:
{
  "summary": "narrative summary text here (2-3 paragraphs)",
  "whatChanged": {
    "conversations": ${changeCounts?.conversations || 0},
    "highlights": ${changeCounts?.highlights || 0},
    "tasks": ${changeCounts?.tasks || 0},
    "decisions": ${changeCounts?.decisions || 0},
    "narrative": "narrative description of what changed (1 paragraph)"
  },
  "topThemes": [
    {"theme": "theme name", "weight": 0.8, "description": "brief description"},
    ...
  ],
  "openLoops": [
    {"conversation_id": "uuid or empty", "conversation_title": "title or null", "snippet": "relevant text", "priority": "high|medium|low"},
    ...
  ],
  "recommendedNextSteps": [
    {"action": "specific action item", "reason": "why this matters", "priority": "high|medium|low"},
    ...
  ]
}

Be concise but insightful. Focus on patterns, actionable insights, and helping the user understand their week.`;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an intelligent assistant that helps users understand patterns in their thinking and work. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
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


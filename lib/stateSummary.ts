// lib/stateSummary.ts
/**
 * Generate state summary (deterministic or LLM)
 */

import { StateQueryResult } from './stateQuery';
import { openaiRequest } from './ai/request';

export interface StateSummary {
  text: string;
  source: 'deterministic' | 'llm';
}

/**
 * Generate deterministic state summary
 */
function generateDeterministicSummary(state: StateQueryResult, scope: 'project' | 'global'): string {
  const lines: string[] = [];
  
  if (state.currentDirection) {
    lines.push(`Current direction: ${state.currentDirection}`);
  }
  
  if (state.newDecisions.length > 0) {
    const decisionText = state.newDecisions.length === 1 
      ? 'decision' 
      : 'decisions';
    lines.push(`${state.newDecisions.length} new ${decisionText} in the last ${state.timeWindowDaysUsed} days.`);
  }
  
  if (state.newOrChangedTasks.length > 0) {
    const taskText = state.newOrChangedTasks.length === 1 
      ? 'task' 
      : 'tasks';
    lines.push(`${state.newOrChangedTasks.length} ${taskText} created or updated.`);
  }
  
  if (state.blockersOrStale.length > 0) {
    const blockerCount = state.blockersOrStale.filter(b => b.reason === 'blocked').length;
    const staleCount = state.blockersOrStale.filter(b => b.reason === 'stale').length;
    
    if (blockerCount > 0) {
      lines.push(`${blockerCount} blocker${blockerCount !== 1 ? 's' : ''} identified.`);
    }
    if (staleCount > 0) {
      lines.push(`${staleCount} task${staleCount !== 1 ? 's' : ''} appear stale (no updates in 14+ days).`);
    }
  }
  
  if (lines.length === 0) {
    return scope === 'project' 
      ? `No changes in this project in the last ${state.timeWindowDaysUsed} days.`
      : `No changes across your projects in the last ${state.timeWindowDaysUsed} days.`;
  }
  
  return lines.join(' ');
}

/**
 * Generate state summary (prefer deterministic, fallback to LLM if needed)
 */
export async function generateStateSummary(
  state: StateQueryResult,
  scope: 'project' | 'global',
  useLLM: boolean = false
): Promise<StateSummary> {
  // Prefer deterministic
  if (!useLLM) {
    return {
      text: generateDeterministicSummary(state, scope),
      source: 'deterministic',
    };
  }
  
  // LLM fallback (if needed in future)
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        text: generateDeterministicSummary(state, scope),
        source: 'deterministic',
      };
    }
    
    const prompt = `Summarize the following project state in 4-8 lines max. Be reductive and actionable. Focus on decisions, tasks, and blockers.

Decisions: ${state.newDecisions.length}
Tasks: ${state.newOrChangedTasks.length}
Blockers/Stale: ${state.blockersOrStale.length}
${state.currentDirection ? `Current direction: ${state.currentDirection}` : ''}

Return ONLY the summary text, no headers or meta-commentary.`;

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
            content: 'You are a concise assistant that summarizes project state. Be reductive and actionable.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 250,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      const summary = data.choices[0]?.message?.content?.trim();
      if (summary) {
        return {
          text: summary,
          source: 'llm',
        };
      }
    }
  } catch (error) {
    console.error('[State Summary] LLM generation failed, using deterministic:', error);
  }
  
  // Fallback to deterministic
  return {
    text: generateDeterministicSummary(state, scope),
    source: 'deterministic',
  };
}

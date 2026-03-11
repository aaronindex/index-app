// app/api/signals/emerging-themes/route.ts
// Derive 2–4 themes from recent signal titles (decisions, tasks, insights). Not persisted.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { openaiRequest } from '@/lib/ai/request';

const MAX_SIGNALS = 20;
const MODEL = 'gpt-4o-mini';

type ThemeResponse = {
  themes: Array<{
    theme_name: string;
    signal_ids: string[];
    interpretation?: string;
  }>;
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { signals?: Array<{ id: string; title: string; type?: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const raw = Array.isArray(body.signals) ? body.signals : [];
  const signals = raw
    .filter((s) => s && typeof s.id === 'string' && typeof s.title === 'string')
    .slice(0, MAX_SIGNALS)
    .map((s) => ({ id: s.id, title: String(s.title).trim(), type: s.type || 'signal' }));

  if (signals.length === 0) {
    return NextResponse.json({ themes: [] });
  }

  const signalList = signals
    .map((s) => `- id: ${s.id}\n  title: ${s.title}`)
    .join('\n');

  const prompt = `You are given a list of recent signals from a project (decisions, tasks, insights). Group them into 2–4 thematic clusters. Each theme should have:
- a short label (2–5 words)
- a one-sentence plain-language interpretation of what the cluster represents
- the list of signal ids that belong to it

Use only the ids provided. A signal may appear in at most one theme. Include every signal in exactly one theme.

Signals:
${signalList}

Return a JSON object with this exact structure:
{
  "themes": [
    {
      "theme_name": "Short label",
      "interpretation": "One-sentence observational description of what this cluster represents.",
      "signal_ids": ["id1", "id2"]
    },
    {
      "theme_name": "Another theme",
      "interpretation": "Another short, observational one-sentence description.",
      "signal_ids": ["id3"]
    }
  ]
}`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const response = await openaiRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You return only valid JSON. No markdown, no explanation.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[EmergingThemes] LLM error', response.status, err.slice(0, 200));
      return NextResponse.json({ error: 'Theme generation failed' }, { status: 502 });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = data.choices?.[0]?.message?.content?.trim() ?? '';
    const cleaned = rawContent.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleaned) as ThemeResponse;

    const themes = Array.isArray(parsed.themes)
      ? parsed.themes.filter(
          (t) =>
            t &&
            typeof t.theme_name === 'string' &&
            Array.isArray(t.signal_ids) &&
            t.signal_ids.every((id) => typeof id === 'string')
        )
      : [];

    const validIds = new Set(signals.map((s) => s.id));
    const themesSanitized = themes.map((t) => ({
      theme_name: String(t.theme_name).trim() || 'Theme',
      interpretation:
        typeof t.interpretation === 'string'
          ? t.interpretation.trim()
          : undefined,
      signal_ids: t.signal_ids.filter((id) => validIds.has(id)),
    }));

    return NextResponse.json({ themes: themesSanitized });
  } catch (e) {
    console.error('[EmergingThemes] Error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Theme generation failed' },
      { status: 502 }
    );
  }
}

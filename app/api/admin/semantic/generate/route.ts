// app/api/admin/semantic/generate/route.ts
// Admin-only: generate semantic overlay (arc titles, pulse headlines, direction) for a state_hash.
// Guarded by INDEX_ADMIN_SECRET. Upserts into semantic_labels; does not alter state_hash inputs.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { openaiRequest } from '@/lib/ai/request';
import { SEMANTIC_DIRECTION_OBJECT_ID } from '@/lib/semantic-overlay/constants';

const PROMPT_VERSION = 'v1';
const MODEL = 'gpt-4o-mini';

function isDevEnv(): boolean {
  return (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development')
  );
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type ArcInput = {
  id: string;
  phase?: number | null;
  summary?: string | null;
  started_at?: string | null;
  last_signal_at?: string | null;
};

type PulseInput = {
  id: string;
  pulse_type?: string;
  project_id?: string | null;
  occurred_at?: string;
};

type StatsInput = {
  active_arc_count?: number;
  pulse_count?: number;
  outcome_count?: number;
  decision_count?: number;
  project_count?: number;
};

type GenerateBody = {
  user_id: string;
  scope_type: 'global' | 'project';
  scope_id?: string | null;
  state_hash: string;
  arcs: ArcInput[];
  pulses: PulseInput[];
  stats?: StatsInput;
};

type LLMResponse = {
  arc_titles: Record<string, string>;
  pulse_headlines: Record<string, string>;
  direction: string;
};

const SEMANTIC_SYSTEM_PROMPT = `You are generating semantic labels for INDEX.

INDEX is a structural ledger for thinking.

Your job is to translate structural signals into short observational labels.

Describe structure only.
Do not invent reasoning or context.

Do not give advice.
Do not ask questions.
Do not speculate.

Tone: calm, factual, observational.
Like a field note written by a systems observer.

Arc titles must be concrete and content-bearing:
- Prefer "Semantic overlay rollout" over "Initial phase of activity"
- Prefer "Homepage direction + timeline clarity" over "Exploration ongoing"
- Avoid generic stage-y phrases: do not use "initial", "phase", "activity", "progress", "ongoing", "work", "effort" as standalone signals
- If arc context includes project/product proper nouns (INDEX, v2, semantic labels, direction, shifts, timeline, import/reduce), include them
- Titles should reflect what is being stabilized or decided, not that something is happening

Pulse headlines should name the structural event in plain language:
- e.g. "Direction logic aligned to semantic overlay", "Result recorded and structure updated"
- Avoid "Structure updated" unless there is no better detail available

Return JSON only.`;

function buildUserPrompt(body: GenerateBody): string {
  const arcs =
    body.arcs.length > 0
      ? body.arcs
          .map(
            (a) =>
              `- ${a.id}: phase=${a.phase ?? 'null'}, summary=${JSON.stringify(a.summary ?? '')}, started_at=${a.started_at ?? 'null'}, last_signal_at=${a.last_signal_at ?? 'null'}`
          )
          .join('\n')
      : '(none)';

  const pulses =
    body.pulses.length > 0
      ? body.pulses
          .map(
            (p) =>
              `- ${p.id}: pulse_type=${p.pulse_type ?? 'unknown'}, project_id=${p.project_id ?? 'null'}, occurred_at=${p.occurred_at ?? 'null'}`
          )
          .join('\n')
      : '(none)';

  const stats = body.stats ?? {};
  const statsStr =
    Object.keys(stats).length > 0
      ? `active_arc_count=${stats.active_arc_count ?? '?'}, pulse_count=${stats.pulse_count ?? '?'}, outcome_count=${stats.outcome_count ?? '?'}, decision_count=${stats.decision_count ?? '?'}, project_count=${stats.project_count ?? '?'}`
      : '(none)';

  return `Generate semantic labels for this INDEX structural state.

Rules:

Arc titles
- 3–7 words, concrete and content-bearing
- No generic placeholders: avoid "Initial phase of activity", "Exploration ongoing"
- No numbering; do not include the word "Arc"; no metaphors
- Reflect what is being stabilized or decided; include product/context nouns (INDEX, v2, direction, timeline, etc.) when relevant

Pulse headlines
- 4–10 words; name the structural event in plain language
- e.g. "Direction logic aligned to semantic overlay", "Result recorded and structure updated"
- Do not output "Structural threshold"; avoid "Structure updated" unless no better detail exists

Direction
- 2–4 sentences
- Observational; no advice; no questions
- Describe overall structural posture

Input data:

Active arcs:
${arcs}

Pulse events:
${pulses}

Structural stats:
${statsStr}

Return JSON:

{
  "arc_titles": {
    "arc_id": "title"
  },
  "pulse_headlines": {
    "pulse_id": "headline"
  },
  "direction": "text"
}`;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-index-admin-secret') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const expected = process.env.INDEX_ADMIN_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { user_id, scope_type, scope_id, state_hash, arcs, pulses } = body;
  if (!user_id || !scope_type || !state_hash || !Array.isArray(arcs) || !Array.isArray(pulses)) {
    return NextResponse.json(
      { error: 'Missing required fields: user_id, scope_type, state_hash, arcs, pulses' },
      { status: 400 }
    );
  }

  if (isDevEnv()) {
    // eslint-disable-next-line no-console
    console.log('[SemanticGenerate][Triggered]', {
      state_hash_prefix: state_hash.substring(0, 16),
      arc_count: arcs.length,
      pulse_count: pulses.length,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  const userPrompt = buildUserPrompt(body);
  let parsed: LLMResponse;

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
          { role: 'system', content: SEMANTIC_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (isDevEnv()) console.error('[SemanticGenerate][LLMError]', response.status, errText.slice(0, 200));
      return NextResponse.json({ error: 'LLM request failed' }, { status: 502 });
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
    // C5: Strict JSON-only — strip markdown code fences then parse (no non-JSON text allowed)
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, '').trim();
    parsed = JSON.parse(cleaned) as LLMResponse;
  } catch (e) {
    if (isDevEnv()) console.error('[SemanticGenerate][ParseError]', e);
    return NextResponse.json({ error: 'LLM response parse failed' }, { status: 502 });
  }

  const arc_titles = typeof parsed.arc_titles === 'object' && parsed.arc_titles !== null ? parsed.arc_titles : {};
  const pulse_headlines = typeof parsed.pulse_headlines === 'object' && parsed.pulse_headlines !== null ? parsed.pulse_headlines : {};
  const direction = typeof parsed.direction === 'string' ? parsed.direction.trim() : '';

  const supabase = getServiceClient();
  const scopeIdVal = scope_type === 'project' && scope_id ? scope_id : null;

  const rows: Array<{
    user_id: string;
    scope_type: string;
    scope_id: string | null;
    object_type: string;
    object_id: string;
    state_hash: string;
    title: string | null;
    body: string | null;
    prompt_version: string;
    model: string;
  }> = [];

  for (const a of arcs) {
    const title = arc_titles[a.id]?.trim() ?? null;
    if (title) rows.push({
      user_id,
      scope_type,
      scope_id: scopeIdVal,
      object_type: 'arc',
      object_id: a.id,
      state_hash,
      title,
      body: null,
      prompt_version: PROMPT_VERSION,
      model: MODEL,
    });
  }

  for (const p of pulses) {
    const title = pulse_headlines[p.id]?.trim() ?? null;
    if (title) rows.push({
      user_id,
      scope_type,
      scope_id: scopeIdVal,
      object_type: 'pulse',
      object_id: p.id,
      state_hash,
      title,
      body: null,
      prompt_version: PROMPT_VERSION,
      model: MODEL,
    });
  }

  if (!direction) {
    if (isDevEnv()) {
      // eslint-disable-next-line no-console
      console.log('[SemanticGenerate][NoDirection]', { state_hash_prefix: state_hash.substring(0, 16) });
    }
  } else {
    // C3: Direction semantics are keyed to state_hash and stored under object_id from constants
    rows.push({
      user_id,
      scope_type,
      scope_id: scopeIdVal,
      object_type: 'direction',
      object_id: SEMANTIC_DIRECTION_OBJECT_ID,
      state_hash,
      title: null,
      body: direction,
      prompt_version: PROMPT_VERSION,
      model: MODEL,
    });
  }

  const direction_upserted = direction ? 1 : 0;
  const arc_titles_upserted = rows.filter((r) => r.object_type === 'arc').length;
  const pulse_headlines_upserted = rows.filter((r) => r.object_type === 'pulse').length;

  if (rows.length > 0) {
    const { error } = await supabase.from('semantic_labels').upsert(rows, {
      onConflict: 'user_id,scope_type,scope_id,object_type,object_id,state_hash',
    });
    if (error) {
      if (isDevEnv()) {
        // eslint-disable-next-line no-console
        console.error('[SemanticGenerate][UpsertError]', error.message);
      }
      return NextResponse.json({ error: 'Failed to save semantic labels' }, { status: 500 });
    }
  }

  if (isDevEnv()) {
    // eslint-disable-next-line no-console
    console.log('[SemanticGenerate][Upserts]', {
      direction: direction_upserted,
      arcs: arc_titles_upserted,
      pulses: pulse_headlines_upserted,
      state_hash_prefix: state_hash.substring(0, 16),
    });
  }

  return NextResponse.json({
    arc_titles,
    pulse_headlines,
    direction: direction || null,
  });
}

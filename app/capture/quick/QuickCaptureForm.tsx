'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { setExtensionCaptureUsed } from '@/lib/extension-nudge/state';

const SESSION_KEY = 'INDEX_QUICK_CAPTURE_PAYLOAD';
const MAX_TEXT_LENGTH = 200_000;

type ThinkingChoice = 'today' | 'yesterday' | 'last_week' | 'last_month';

interface ExtensionPayload {
  text: string;
  url?: string;
  title?: string;
}

function loadPayloadFromSession(): ExtensionPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'text' in parsed && typeof (parsed as ExtensionPayload).text === 'string') {
      return {
        text: (parsed as ExtensionPayload).text,
        url: typeof (parsed as ExtensionPayload).url === 'string' ? (parsed as ExtensionPayload).url : undefined,
        title: typeof (parsed as ExtensionPayload).title === 'string' ? (parsed as ExtensionPayload).title : undefined,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

function savePayloadToSession(payload: ExtensionPayload) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export default function QuickCaptureForm() {
  const [payload, setPayload] = useState<ExtensionPayload | null>(() => loadPayloadFromSession());
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [thinkingChoice, setThinkingChoice] = useState<ThinkingChoice>('today');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ projectId: string | null; projectName?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for postMessage from extension: strict origin equality only (no '*' or substring)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== 'object' || typeof (data as ExtensionPayload).text !== 'string') return;
      const payload: ExtensionPayload = {
        text: (data as ExtensionPayload).text,
        url: typeof (data as ExtensionPayload).url === 'string' ? (data as ExtensionPayload).url : undefined,
        title: typeof (data as ExtensionPayload).title === 'string' ? (data as ExtensionPayload).title : undefined,
      };
      if (payload.text.length > MAX_TEXT_LENGTH) {
        setError('Selection is too large to capture. Try a smaller selection.');
        return;
      }
      setError(null);
      savePayloadToSession(payload);
      setPayload(payload);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Hydrate from sessionStorage on mount (so refresh keeps payload)
  useEffect(() => {
    setPayload(loadPayloadFromSession());
  }, []);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setProjects(data || []);
    };
    fetchProjects();
  }, []);

  const filteredProjects = projectSearch.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(projectSearch.trim().toLowerCase()))
    : projects;

  const handleSave = useCallback(async () => {
    if (!payload?.text?.trim()) {
      setError('No content to save');
      return;
    }
    if (payload.text.length > MAX_TEXT_LENGTH) {
      setError('Selection is too large to capture. Try a smaller selection.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const container = selectedProjectId
        ? { kind: 'project' as const, project_id: selectedProjectId }
        : { kind: 'me' as const };
      const body = {
        content: payload.text.trim(),
        container,
        thinking_choice: thinkingChoice,
        metadata: {
          ...(payload.url && { url: payload.url }),
          ...(payload.title && { title: payload.title }),
        },
        source_mode: 'durable' as const,
        source_type: 'extension' as const,
      };
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Save failed');
        return;
      }
      const projectName = container.kind === 'project'
        ? projects.find((p) => p.id === container.project_id)?.name ?? null
        : null;
      setSaved({
        projectId: container.kind === 'project' ? container.project_id : null,
        projectName,
      });
      setExtensionCaptureUsed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [payload, selectedProjectId, thinkingChoice, projects]);

  if (saved) {
    const projectName = saved.projectName ?? 'Me';
    const sourcesHref = saved.projectId
      ? `/projects/${saved.projectId}?tab=sources`
      : '/me';
    return (
      <div className="space-y-6">
        <p className="text-sm text-[rgb(var(--muted))]">
          Saved to: {projectName}
        </p>
        <p className="text-sm text-[rgb(var(--muted))] leading-relaxed">
          Sources accumulate here.
          <br />
          Distill signals when a conversation still matters.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link
            href={sourcesHref}
            className="w-full px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg font-medium text-center hover:opacity-90"
          >
            View sources
          </Link>
          <Link
            href={sourcesHref}
            className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.2)] rounded-lg font-medium text-center text-[rgb(var(--text))] hover:bg-[rgb(var(--ring)/0.06)]"
          >
            Distill now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!payload?.text ? (
        <p className="text-sm text-[rgb(var(--muted))]">
          Select text in your browser and use the INDEX extension to send it here. No content received yet.
        </p>
      ) : (
        <div className="rounded-lg border border-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] p-3">
          <p className="text-xs text-[rgb(var(--muted))] mb-1">Captured text</p>
          <textarea
            readOnly
            rows={4}
            value={payload.text}
            className="w-full text-sm text-[rgb(var(--text))] whitespace-pre-wrap resize-none overflow-y-auto bg-transparent border-0 p-0 focus:outline-none focus:ring-0 cursor-default"
            aria-label="Captured text (read-only)"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">Project</label>
        <input
          type="text"
          placeholder="Search projects…"
          value={projectSearch}
          onChange={(e) => setProjectSearch(e.target.value)}
          className="w-full px-3 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] mb-2"
        />
        <div className="border border-[rgb(var(--ring)/0.12)] rounded-lg max-h-40 overflow-y-auto">
          <button
            type="button"
            onClick={() => setSelectedProjectId('')}
            className={`block w-full text-left px-3 py-2 text-sm ${!selectedProjectId ? 'bg-[rgb(var(--ring)/0.08)]' : ''} text-[rgb(var(--text))] hover:bg-[rgb(var(--ring)/0.06)]`}
          >
            Me (unassigned)
          </button>
          {filteredProjects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedProjectId(p.id)}
              className={`block w-full text-left px-3 py-2 text-sm ${selectedProjectId === p.id ? 'bg-[rgb(var(--ring)/0.08)]' : ''} text-[rgb(var(--text))] hover:bg-[rgb(var(--ring)/0.06)]`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">When did this thinking happen?</label>
        <select
          value={thinkingChoice}
          onChange={(e) => setThinkingChoice(e.target.value as ThinkingChoice)}
          className="w-full px-3 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
          disabled={saving}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last_week">Last week</option>
          <option value="last_month">Last month</option>
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !payload?.text?.trim()}
        className="w-full px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

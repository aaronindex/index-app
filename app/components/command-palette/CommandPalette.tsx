// app/components/command-palette/CommandPalette.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ModalShell from '@/app/components/ui/ModalShell';
import { useKeyboardShortcut } from '@/app/hooks/useKeyboardShortcut';

interface Command {
  id: string;
  label: string;
  description?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CommandPalette({ isOpen: externalIsOpen, onClose: externalOnClose }: CommandPaletteProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Use external state if provided, otherwise use internal
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = useCallback((value: boolean) => {
    if (externalOnClose && !value) {
      externalOnClose();
    } else if (externalIsOpen === undefined) {
      setInternalIsOpen(value);
    }
  }, [externalOnClose, externalIsOpen]);

  // Extract project ID from pathname if we're in a project
  const projectIdMatch = pathname.match(/^\/projects\/([^/]+)/);
  const currentProjectId = projectIdMatch?.[1] || null;

  // Define commands
  const allCommands: Command[] = [
    {
      id: 'ask-index',
      label: 'Ask Index',
      description: 'Search your conversations',
      action: () => {
        router.push('/ask');
        setIsOpen(false);
      },
    },
    {
      id: 'new-project',
      label: 'New Project',
      description: 'Create a new project',
      action: () => {
        router.push('/projects');
        setIsOpen(false);
        // Try to trigger create button if it exists
        setTimeout(() => {
          const createButton = document.querySelector('[data-create-project]') as HTMLButtonElement;
          if (createButton) {
            createButton.click();
          }
        }, 100);
      },
    },
    {
      id: 'quick-import',
      label: 'Quick Import',
      description: 'Paste one conversation',
      action: () => {
        router.push('/import?quick=true');
        setIsOpen(false);
      },
    },
    {
      id: 'import-jobs',
      label: 'Import Jobs',
      description: 'View import progress',
      action: () => {
        router.push('/import');
        setIsOpen(false);
      },
    },
    {
      id: 'library',
      label: 'Library',
      description: currentProjectId ? 'View project library' : 'View projects',
      action: () => {
        if (currentProjectId) {
          router.push(`/projects/${currentProjectId}?tab=library`);
        } else {
          router.push('/projects');
        }
        setIsOpen(false);
      },
    },
    {
      id: 'generate-digest',
      label: 'Generate Digest',
      description: 'Create weekly digest',
      action: () => {
        router.push('/tools');
        setIsOpen(false);
        // Focus the generate digest button if it exists
        setTimeout(() => {
          const digestButton = document.querySelector('[data-generate-digest]') as HTMLButtonElement;
          if (digestButton) {
            digestButton.focus();
          }
        }, 100);
      },
    },
    {
      id: 'home',
      label: 'Home',
      description: 'Go to homepage',
      action: () => {
        router.push('/');
        setIsOpen(false);
      },
    },
  ];

  // Filter commands based on query
  const filteredCommands = allCommands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(query.toLowerCase())
  );

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard shortcut: Cmd+K / Ctrl+K (only if not externally controlled)
  useKeyboardShortcut({
    key: 'k',
    metaKey: true,
    onPress: () => {
      if (externalIsOpen === undefined) {
        setIsOpen(true);
      } else if (externalOnClose) {
        // Toggle if externally controlled
        externalOnClose();
      }
    },
    enabled: externalIsOpen === undefined,
  });

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    },
    [filteredCommands, selectedIndex, setIsOpen]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0 && filteredCommands.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, filteredCommands.length]);

  if (!isOpen) return null;

  return (
    <ModalShell onClose={() => setIsOpen(false)}>
      <div className="space-y-4">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Jump to…"
          className="w-full px-4 py-3 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] text-sm"
          autoFocus
        />

        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto space-y-1"
          role="listbox"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[rgb(var(--muted))]">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => cmd.action()}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] ${
                  index === selectedIndex
                    ? 'bg-[rgb(var(--surface2))] text-[rgb(var(--text))]'
                    : 'text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))]'
                }`}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <div className="font-medium text-sm">{cmd.label}</div>
                {cmd.description && (
                  <div className="text-xs text-[rgb(var(--muted))] mt-0.5">{cmd.description}</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </ModalShell>
  );
}

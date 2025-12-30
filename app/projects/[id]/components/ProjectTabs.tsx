// app/projects/[id]/components/ProjectTabs.tsx
'use client';

import Link from 'next/link';

type Tab = 'overview' | 'chats' | 'highlights' | 'decisions' | 'tasks' | 'library';

interface ProjectTabsProps {
  projectId: string;
  activeTab: Tab;
}

export default function ProjectTabs({ projectId, activeTab }: ProjectTabsProps) {
  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: 'overview', label: 'Overview', href: `/projects/${projectId}?tab=overview` },
    { id: 'chats', label: 'Chats', href: `/projects/${projectId}?tab=chats` },
    { id: 'highlights', label: 'Highlights', href: `/projects/${projectId}?tab=highlights` },
    { id: 'decisions', label: 'Decisions', href: `/projects/${projectId}?tab=decisions` },
    { id: 'tasks', label: 'Tasks', href: `/projects/${projectId}?tab=tasks` },
    { id: 'library', label: 'Library', href: `/projects/${projectId}?tab=library` },
  ];

  return (
    <div className="border-b border-[rgb(var(--ring)/0.08)] mb-6">
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  isActive
                    ? 'border-[rgb(var(--text))] text-[rgb(var(--text))]'
                    : 'border-transparent text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] hover:border-[rgb(var(--ring)/0.2)]'
                }
              `}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}


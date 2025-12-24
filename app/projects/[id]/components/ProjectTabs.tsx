// app/projects/[id]/components/ProjectTabs.tsx
'use client';

import Link from 'next/link';

type Tab = 'overview' | 'chats' | 'highlights' | 'decisions' | 'tasks';

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
  ];

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 mb-6">
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
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
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


// app/projects/[id]/components/ProjectTabs.tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

type Tab = 'read' | 'chats' | 'decisions' | 'tasks';

interface ProjectTabsProps {
  projectId: string;
  activeTab: Tab;
}

export default function ProjectTabs({ projectId, activeTab }: ProjectTabsProps) {
  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: 'read', label: 'Read', href: `/projects/${projectId}?tab=read` },
    { id: 'decisions', label: 'Decisions', href: `/projects/${projectId}?tab=decisions` },
    { id: 'tasks', label: 'Tasks', href: `/projects/${projectId}?tab=tasks` },
    { id: 'chats', label: 'Chats', href: `/projects/${projectId}?tab=chats` },
  ];

  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Scroll active tab into view on mount and when activeTab changes
  useEffect(() => {
    if (activeTabRef.current && window.innerWidth < 640) {
      // Only scroll on mobile
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeTab]);

  return (
    <div className="border-b border-[rgb(var(--ring)/0.08)] mb-6 relative">
      {/* Left fade gradient (mobile only) - positioned over scrollable area */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[rgb(var(--bg))] to-transparent pointer-events-none z-10 sm:hidden" />
      
      {/* Right fade gradient (mobile only) - positioned over scrollable area */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[rgb(var(--bg))] to-transparent pointer-events-none z-10 sm:hidden" />
      
      {/* Scrollable nav container - negative margin to extend to page edges on mobile */}
      <nav
        ref={navRef}
        className="flex space-x-8 overflow-x-auto hide-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0 w-full"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
        aria-label="Tabs"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              href={tab.href}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0
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


// app/projects/[id]/components/OverviewTab.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import WhatChangedThisWeek from './WhatChangedThisWeek';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';

interface OverviewTabProps {
  projectId: string;
  projectName: string;
}

export default function OverviewTab({ projectId, projectName }: OverviewTabProps) {
  const [hasConversations, setHasConversations] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkConversations() {
      try {
        const response = await fetch(`/api/projects/${projectId}/has-conversations`);
        if (response.ok) {
          const data = await response.json();
          setHasConversations(data.hasConversations);
        } else {
          // Default to showing content if we can't determine
          setHasConversations(true);
        }
      } catch (error) {
        console.error('Error checking conversations:', error);
        setHasConversations(true); // Default to showing content on error
      } finally {
        setLoading(false);
      }
    }
    checkConversations();
  }, [projectId]);

  // Show empty state if no conversations
  if (!loading && hasConversations === false) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-12 text-center">
          <h3 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-3">
            Import your first chat to get started
          </h3>
          <p className="text-sm text-[rgb(var(--muted))] mb-6">
            Once you import a conversation, INDEX will extract insights, tasks, and decisions.
          </p>
          <Link href="/import">
            <Button variant="primary">
              Import chat
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WhatChangedThisWeek projectId={projectId} />
      {/* Themes hidden from UI - kept as internal signal layer only */}
    </div>
  );
}


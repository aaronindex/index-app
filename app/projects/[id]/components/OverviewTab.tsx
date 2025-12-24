// app/projects/[id]/components/OverviewTab.tsx
'use client';

import WhatChangedThisWeek from './WhatChangedThisWeek';

interface OverviewTabProps {
  projectId: string;
  projectName: string;
}

export default function OverviewTab({ projectId, projectName }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <WhatChangedThisWeek projectId={projectId} />
      {/* Themes hidden from UI - kept as internal signal layer only */}
    </div>
  );
}


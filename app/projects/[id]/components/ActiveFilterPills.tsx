// app/projects/[id]/components/ActiveFilterPills.tsx
'use client';

import { useState } from 'react';

type Filter = 'active' | 'all' | 'inactive';

interface ActiveFilterPillsProps {
  activeCount: number;
  inactiveCount: number;
  onFilterChange: (filter: Filter) => void;
}

export default function ActiveFilterPills({ activeCount, inactiveCount, onFilterChange }: ActiveFilterPillsProps) {
  const [currentFilter, setCurrentFilter] = useState<Filter>('active');

  const handleFilterChange = (filter: Filter) => {
    setCurrentFilter(filter);
    onFilterChange(filter);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => handleFilterChange('active')}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-full transition-all
          ${
            currentFilter === 'active'
              ? 'bg-[rgb(var(--text))] text-[rgb(var(--bg))]'
              : 'bg-[rgb(var(--surface2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface))] hover:text-[rgb(var(--text))]'
          }
        `}
      >
        Active ({activeCount})
      </button>
      <button
        onClick={() => handleFilterChange('all')}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-full transition-all
          ${
            currentFilter === 'all'
              ? 'bg-[rgb(var(--text))] text-[rgb(var(--bg))]'
              : 'bg-[rgb(var(--surface2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface))] hover:text-[rgb(var(--text))]'
          }
        `}
      >
        All ({activeCount + inactiveCount})
      </button>
      {inactiveCount > 0 && (
        <button
          onClick={() => handleFilterChange('inactive')}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-full transition-all
            ${
              currentFilter === 'inactive'
                ? 'bg-[rgb(var(--text))] text-[rgb(var(--bg))]'
                : 'bg-[rgb(var(--surface2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface))] hover:text-[rgb(var(--text))]'
            }
          `}
        >
          Inactive ({inactiveCount})
        </button>
      )}
    </div>
  );
}


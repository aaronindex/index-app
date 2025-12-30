// app/projects/components/ProjectFilterPills.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type Filter = 'business' | 'all' | 'personal';

export default function ProjectFilterPills() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = (searchParams.get('filter') || 'business') as Filter;

  const handleFilterChange = (filter: Filter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'business') {
      params.delete('filter'); // Default, so remove param
    } else {
      params.set('filter', filter);
    }
    router.push(`/projects?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => handleFilterChange('business')}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-full transition-all
          ${
            currentFilter === 'business'
              ? 'bg-[rgb(var(--text))] text-[rgb(var(--bg))]'
              : 'bg-[rgb(var(--surface2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface))] hover:text-[rgb(var(--text))]'
          }
        `}
      >
        Business
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
        All
      </button>
      <button
        onClick={() => handleFilterChange('personal')}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-full transition-all
          ${
            currentFilter === 'personal'
              ? 'bg-[rgb(var(--text))] text-[rgb(var(--bg))]'
              : 'bg-[rgb(var(--surface2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface))] hover:text-[rgb(var(--text))]'
          }
        `}
      >
        Personal
      </button>
    </div>
  );
}


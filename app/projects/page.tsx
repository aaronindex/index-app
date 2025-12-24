// app/projects/page.tsx
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import Link from 'next/link';
import CreateProjectButton from './components/CreateProjectButton';

type Status = 'priority' | 'open' | 'complete' | 'dormant';

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  
  const statusColors: Record<Status, string> = {
    priority: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    complete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dormant: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500',
  };

  const colorClass = statusColors[status as Status] || statusColors.dormant;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) {
    // Middleware should handle this, but just in case
    return null;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Projects</h1>
          <CreateProjectButton />
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-400">Error loading projects.</p>
          </div>
        )}

        {!error && (!data || data.length === 0) && (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">No projects yet.</p>
            <CreateProjectButton />
          </div>
        )}

        {!error && data && data.length > 0 && (
          <div className="space-y-4">
            {data.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors bg-white dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-medium text-foreground">
                    {project.name}
                  </h2>
                  <StatusPill status={project.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

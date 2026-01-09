// app/projects/page.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import Link from 'next/link';
import CreateProjectButton from './components/CreateProjectButton';
import ProjectFilterPills from './components/ProjectFilterPills';
import Card from '../components/ui/Card';

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

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/signin');
  }

  const { filter = 'business' } = await searchParams;
  const supabase = await getSupabaseServerClient();
  
  let query = supabase
    .from('projects')
    .select('id, name, status, is_personal')
    .eq('user_id', user.id);

  // No filtering - show all projects
  // Users can create 1 project per client or 1 personal project if they want
  // 'all' means no filter

  const { data, error } = await query.order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))]">Projects</h1>
          <CreateProjectButton />
        </div>
        
        <ProjectFilterPills />
        
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800">
            <p className="text-red-800 dark:text-red-400">Error loading projects.</p>
          </div>
        )}

        {!error && (!data || data.length === 0) && (
          <div className="text-center py-12">
            <p className="text-[rgb(var(--muted))] mb-4">No projects yet.</p>
            <CreateProjectButton />
          </div>
        )}

        {!error && data && data.length > 0 && (
          <div className="space-y-4">
            {data.map((project) => (
              <Card key={project.id} hover>
                <Link
                  href={`/projects/${project.id}`}
                  className="block p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-xl font-medium text-[rgb(var(--text))]">
                        {project.name}
                      </h2>
                    </div>
                    <StatusPill status={project.status} />
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

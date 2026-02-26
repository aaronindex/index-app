// app/projects/page.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import Link from 'next/link';
import CreateProjectButton from './components/CreateProjectButton';
import ProjectFilterPills from './components/ProjectFilterPills';
import Card from '../components/ui/Card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Projects | INDEX",
  description: "Organize your conversations and thinking into projects",
};

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

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
    .select('id, name, is_personal')
    .eq('user_id', user.id);

  // No filtering - show all projects
  // Users can create 1 project per client or 1 personal project if they want
  // 'all' means no filter

  const { data, error } = await query.order('created_at', { ascending: false });

  // Check if user has created a project before (for friendly messaging)
  // If this query fails, default to showing friendly message (safe fallback)
  let isFirstTime = true;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_created_project')
      .eq('id', user.id)
      .single();
    
    isFirstTime = !profile?.has_created_project;
  } catch (profileError) {
    // If profile query fails, default to first-time messaging (safe fallback)
    isFirstTime = true;
  }

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
            <p className="text-red-800 dark:text-red-400 mb-2">Error loading projects.</p>
            <p className="text-sm text-red-700 dark:text-red-500">
              {error.message || 'Please try refreshing the page.'}
            </p>
          </div>
        )}

        {!error && (!data || data.length === 0) && (
          <div className="text-center py-12">
            {isFirstTime ? (
              <>
                <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-2">
                  Create your first project
                </h2>
                <p className="text-[rgb(var(--muted))] mb-6">
                  Projects help you organize your conversations and thinking.
                </p>
                <CreateProjectButton />
              </>
            ) : (
              <>
                <p className="text-[rgb(var(--muted))] mb-4">No projects yet.</p>
                <CreateProjectButton />
              </>
            )}
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
                    <h2 className="font-serif text-xl font-medium text-[rgb(var(--text))]">
                      {project.name}
                    </h2>
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

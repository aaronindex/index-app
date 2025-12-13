// app/projects/page.tsx
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export default async function ProjectsPage() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
  }

  return (
    <main>
      <h1>Projects</h1>
      {error && <p>Error loading projects.</p>}
      {!error && (!data || data.length === 0) && <p>No projects yet.</p>}
      <ul>
        {data?.map((p) => (
          <li key={p.id}>
            {p.name} ({p.status})
          </li>
        ))}
      </ul>
    </main>
  );
}

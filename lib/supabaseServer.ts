// lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function getSupabaseServerClient() {
  const cookieStore = await cookies(); // TS sees cookies() as Promise

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // you can add set/remove later if you need full auth session handling:
        // set(name, value, options) {
        //   cookieStore.set({ name, value, ...options });
        // },
        // remove(name, options) {
        //   cookieStore.delete({ name, ...options });
        // },
      },
    }
  );
}

// app/capture/quick/page.tsx
// Quick capture page for browser extension: postMessage payload, project picker, durable capture.

import { getCurrentUser } from '@/lib/getUser';
import { redirect } from 'next/navigation';
import QuickCaptureForm from './QuickCaptureForm';

export const dynamic = 'force-dynamic';

export default async function QuickCapturePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/signin?redirect=/capture/quick');
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-6">
          Quick Capture
        </h1>
        <QuickCaptureForm />
      </div>
    </main>
  );
}

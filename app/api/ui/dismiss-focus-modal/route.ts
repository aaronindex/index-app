// app/api/ui/dismiss-focus-modal/route.ts
// Sets cookie so "Your conversations are in…" modal is not shown again.

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';

const COOKIE_NAME = 'index_focus_modal_dismissed';
const MAX_AGE = 31536000; // 1 year

export async function POST() {
  try {
    await getCurrentUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '1', {
    path: '/',
    maxAge: MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  });
  return response;
}

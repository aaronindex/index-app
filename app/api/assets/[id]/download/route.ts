// app/api/assets/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await getSupabaseServerClient();

    // Get asset and verify ownership
    const { data: asset, error: fetchError } = await supabase
      .from('project_assets')
      .select('id, user_id, storage_path, mime_type, title')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (!asset.storage_path) {
      return NextResponse.json({ error: 'No file associated with this asset' }, { status: 400 });
    }

    // Get signed URL from storage
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('project-assets')
      .createSignedUrl(asset.storage_path, 3600); // 1 hour expiry

    if (urlError || !signedUrlData) {
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    // Redirect to signed URL
    return NextResponse.redirect(signedUrlData.signedUrl);
  } catch (error) {
    console.error('Download asset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download asset' },
      { status: 500 }
    );
  }
}


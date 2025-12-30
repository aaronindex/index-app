// app/api/assets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

// Update asset (title and note only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, note } = body;

    const supabase = await getSupabaseServerClient();

    // Verify asset belongs to user
    const { data: existingAsset, error: fetchError } = await supabase
      .from('project_assets')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Update only title and note
    const updateData: { title?: string; note?: string | null } = {};
    if (title !== undefined) {
      updateData.title = title.trim();
    }
    if (note !== undefined) {
      updateData.note = note?.trim() || null;
    }

    const { data: asset, error: updateError } = await supabase
      .from('project_assets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update asset' },
        { status: 500 }
      );
    }

    return NextResponse.json({ asset });
  } catch (error) {
    console.error('Update asset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update asset' },
      { status: 500 }
    );
  }
}

// Delete asset
export async function DELETE(
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

    // Get asset to check ownership and get storage path
    const { data: asset, error: fetchError } = await supabase
      .from('project_assets')
      .select('id, user_id, storage_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Delete from storage if file asset
    if (asset.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('project-assets')
        .remove([asset.storage_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue with DB deletion even if storage delete fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('project_assets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete asset' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete asset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete asset' },
      { status: 500 }
    );
  }
}


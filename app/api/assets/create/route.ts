// app/api/assets/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

// Helper to parse domain from URL
function parseDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// Helper to detect YouTube URL
function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
  } catch {
    return false;
  }
}

// Helper to fetch page title (with timeout)
async function fetchPageTitle(url: string, timeoutMs = 2000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; INDEX/1.0)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : null;
  } catch {
    return null;
  }
}

// Helper to fetch YouTube title and thumbnail via oEmbed
async function fetchYouTubeMetadata(url: string): Promise<{ title: string | null; thumbnail: string | null }> {
  try {
    // Extract video ID
    let videoId: string | null = null;
    const urlObj = new URL(url);
    
    if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.slice(1);
    }

    if (!videoId) {
      return { title: null, thumbnail: null };
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      return { title: null, thumbnail: null };
    }

    const data = await response.json();
    return {
      title: data.title || null,
      thumbnail: data.thumbnail_url || null,
    };
  } catch {
    return { title: null, thumbnail: null };
  }
}

// Helper to fetch Open Graph image from a URL
async function fetchOpenGraphImage(url: string, timeoutMs = 2000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; INDEX/1.0)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    
    // Try Open Graph image first
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImageMatch) {
      return ogImageMatch[1].trim();
    }

    // Try Twitter card image
    const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (twitterImageMatch) {
      return twitterImageMatch[1].trim();
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const projectId = formData.get('project_id') as string;
    const type = formData.get('type') as 'link' | 'youtube' | 'file';
    const url = formData.get('url') as string | null;
    const title = formData.get('title') as string | null;
    const note = formData.get('note') as string | null;
    const file = formData.get('file') as File | null;

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    if (!type || !['link', 'youtube', 'file'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check asset limit for project
    const { checkAssetLimit } = await import('@/lib/limits.js');
    const limitCheck = await checkAssetLimit(projectId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message || 'Asset limit reached for this project' },
        { status: 429 }
      );
    }

    let finalType = type;
    let finalUrl = url;
    let finalTitle = title?.trim() || null;
    let domain: string | null = null;
    let storagePath: string | null = null;
    let mimeType: string | null = null;
    let fileSize: number | null = null;
    let width: number | null = null;
    let height: number | null = null;
    let thumbnailUrl: string | null = null;

    if (type === 'link' || type === 'youtube') {
      if (!url) {
        return NextResponse.json({ error: 'url is required for link/youtube' }, { status: 400 });
      }

      // Detect YouTube
      if (isYouTubeUrl(url)) {
        finalType = 'youtube';
      }

      domain = parseDomain(url);

      // Auto-fetch title and thumbnail if not provided
      if (!finalTitle || finalType === 'youtube') {
        if (finalType === 'youtube') {
          const youtubeData = await fetchYouTubeMetadata(url);
          if (youtubeData.title) {
            finalTitle = youtubeData.title;
          }
          if (youtubeData.thumbnail) {
            thumbnailUrl = youtubeData.thumbnail;
          }
          if (!finalTitle) {
            finalTitle = `${domain} video`;
          }
        } else {
          if (!finalTitle) {
            finalTitle = await fetchPageTitle(url) || domain;
          }
          // Try to fetch Open Graph image for links
          thumbnailUrl = await fetchOpenGraphImage(url);
        }
      }
    } else if (type === 'file') {
      if (!file) {
        return NextResponse.json({ error: 'file is required' }, { status: 400 });
      }

      // Validate file type
      const allowedMimeTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
      ];

      if (!allowedMimeTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only PDF and images (PNG, JPG, JPEG, WEBP) are allowed.' },
          { status: 400 }
        );
      }

      // Validate file size (20MB max)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size exceeds 20MB limit' },
          { status: 400 }
        );
      }

      mimeType = file.type;
      fileSize = file.size;

      // Auto-fill title from filename if not provided
      if (!finalTitle) {
        finalTitle = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePathValue = `${user.id}/${projectId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-assets')
        .upload(storagePathValue, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload file' },
          { status: 500 }
        );
      }

      storagePath = uploadData.path;

      // For images, generate a signed URL for thumbnail
      if (mimeType?.startsWith('image/')) {
        const { data: signedUrlData } = await supabase.storage
          .from('project-assets')
          .createSignedUrl(storagePath, 31536000); // 1 year expiry for thumbnails
        
        if (signedUrlData) {
          thumbnailUrl = signedUrlData.signedUrl;
        }
      }

      // For images, we could extract dimensions later if needed
      // For now, skip dimension extraction in v0
    }

    // Create asset record
    const { data: asset, error: insertError } = await supabase
      .from('project_assets')
      .insert({
        user_id: user.id,
        project_id: projectId,
        type: finalType,
        title: finalTitle || 'Untitled',
        url: finalUrl,
        domain,
        note: note?.trim() || null,
        storage_path: storagePath,
        mime_type: mimeType,
        file_size: fileSize,
        width,
        height,
        thumbnail_url: thumbnailUrl,
      })
      .select()
      .single();

    if (insertError) {
      // Clean up uploaded file if asset creation fails
      if (storagePath) {
        await supabase.storage.from('project-assets').remove([storagePath]);
      }
      return NextResponse.json(
        { error: insertError.message || 'Failed to create asset' },
        { status: 500 }
      );
    }

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('Create asset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create asset' },
      { status: 500 }
    );
  }
}


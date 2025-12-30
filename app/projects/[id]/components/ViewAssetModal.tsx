// app/projects/[id]/components/ViewAssetModal.tsx
'use client';

import ModalShell from '@/app/components/ui/ModalShell';

interface ViewAssetModalProps {
  asset: {
    id: string;
    type: 'link' | 'youtube' | 'file';
    title: string;
    url: string | null;
    storage_path: string | null;
    mime_type: string | null;
    thumbnail_url: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewAssetModal({ asset, isOpen, onClose }: ViewAssetModalProps) {
  if (!isOpen) return null;

  const getMediaUrl = () => {
    if (asset.type === 'file' && asset.storage_path) {
      // For files, we'll use the download endpoint which generates a signed URL
      return `/api/assets/${asset.id}/download`;
    }
    if (asset.type === 'youtube' && asset.url) {
      // Convert YouTube URL to embed format
      let videoId: string | null = null;
      try {
        const urlObj = new URL(asset.url);
        if (urlObj.hostname.includes('youtube.com')) {
          videoId = urlObj.searchParams.get('v');
        } else if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        }
      } catch {
        // Invalid URL
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    return null;
  };

  const mediaUrl = getMediaUrl();
  const isImage = asset.mime_type?.startsWith('image/');
  const isVideo = asset.type === 'youtube';

  return (
    <ModalShell onClose={onClose} className="max-w-4xl">
      <div className="p-6">
        <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4">
          {asset.title}
        </h2>

        {isImage && mediaUrl && (
          <div className="w-full rounded-lg overflow-hidden bg-[rgb(var(--surface2))]">
            <img
              src={mediaUrl}
              alt={asset.title}
              className="w-full h-auto max-h-[70vh] object-contain mx-auto"
            />
          </div>
        )}

        {isVideo && mediaUrl && (
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-[rgb(var(--surface2))]">
            <iframe
              src={mediaUrl}
              title={asset.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {!isImage && !isVideo && (
          <div className="text-center py-12">
            <p className="text-[rgb(var(--muted))] mb-4">
              This asset cannot be previewed here.
            </p>
            {asset.url && (
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[rgb(var(--text))] hover:underline"
              >
                Open in new tab →
              </a>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}


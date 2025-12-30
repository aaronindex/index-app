// app/projects/[id]/components/LibraryTab.tsx
'use client';

import { useState, useMemo } from 'react';
import Card from '@/app/components/ui/Card';
import SectionHeader from '@/app/components/ui/SectionHeader';
import ActiveFilterPills from './ActiveFilterPills';
import AddAssetButton from './AddAssetButton';
import EditAssetButton from './EditAssetButton';
import DeleteAssetButton from './DeleteAssetButton';
import ToggleInactiveButton from './ToggleInactiveButton';
import ViewAssetModal from './ViewAssetModal';
import Badge from '@/app/components/ui/Badge';

interface Asset {
  id: string;
  type: 'link' | 'youtube' | 'file';
  title: string;
  url: string | null;
  domain: string | null;
  note: string | null;
  storage_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  thumbnail_url: string | null;
  created_at: string;
  is_inactive?: boolean;
}

interface LibraryTabProps {
  assets: Asset[];
  projectId: string;
}

type ActiveFilter = 'active' | 'all' | 'inactive';

export default function LibraryTab({ assets, projectId }: LibraryTabProps) {
  const [filter, setFilter] = useState<ActiveFilter>('active');
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);

  const { activeAssets, inactiveAssets } = useMemo(() => {
    const active = assets.filter((a) => !a.is_inactive);
    const inactive = assets.filter((a) => a.is_inactive);
    return { activeAssets: active, inactiveAssets: inactive };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    if (filter === 'active') return activeAssets;
    if (filter === 'inactive') return inactiveAssets;
    return [...activeAssets, ...inactiveAssets];
  }, [filter, activeAssets, inactiveAssets]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'youtube':
        return <Badge variant="default">YouTube</Badge>;
      case 'link':
        return <Badge variant="default">Link</Badge>;
      case 'file':
        return <Badge variant="default">File</Badge>;
      default:
        return null;
    }
  };

  const handleOpen = (asset: Asset) => {
    const isImage = asset.mime_type?.startsWith('image/');
    const isVideo = asset.type === 'youtube';
    
    // Open modal for images and videos
    if (isImage || isVideo) {
      setViewingAsset(asset);
    } else {
      // Open in new tab for PDFs and links
      if (asset.type === 'file' && asset.storage_path) {
        window.open(`/api/assets/${asset.id}/download`, '_blank');
      } else if (asset.url) {
        window.open(asset.url, '_blank');
      }
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader action={<AddAssetButton projectId={projectId} />}>
        Library
      </SectionHeader>

      {assets.length > 0 && (
        <ActiveFilterPills
          activeCount={activeAssets.length}
          inactiveCount={inactiveAssets.length}
          onFilterChange={setFilter}
        />
      )}

      {assets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[rgb(var(--muted))] mb-4">
            No assets in this project yet. Add links, YouTube videos, or files to build your library.
          </p>
          <AddAssetButton projectId={projectId} />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssets.map((asset) => (
            <Card
              key={asset.id}
              className={asset.is_inactive ? 'opacity-60' : ''}
            >
              <div className="p-4">
                <div className="flex items-start gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-[rgb(var(--text))] truncate">{asset.title}</h3>
                      {asset.is_inactive && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[rgb(var(--surface2))] text-[rgb(var(--muted))]">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeBadge(asset.type)}
                      <span className="text-xs text-[rgb(var(--muted))]">
                        {asset.type === 'file' 
                          ? `${asset.mime_type?.split('/')[1]?.toUpperCase() || 'File'} • ${formatFileSize(asset.file_size)}`
                          : asset.domain || 'Link'}
                      </span>
                    </div>
                    {asset.note && (
                      <p className="text-sm text-[rgb(var(--text))] mb-2 line-clamp-2">
                        {asset.note}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-[rgb(var(--muted))]">
                      <span>Created: {formatDate(asset.created_at)}</span>
                    </div>
                  </div>
                  {asset.thumbnail_url && (
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-[rgb(var(--surface2))] border border-[rgb(var(--ring)/0.08)]">
                        <img
                          src={asset.thumbnail_url}
                          alt={asset.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide thumbnail if image fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgb(var(--ring)/0.08)]">
                  <button
                    onClick={() => handleOpen(asset)}
                    className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
                  >
                    {asset.type === 'file' ? 'View' : 'Open'}
                  </button>
                  <span className="text-[rgb(var(--ring)/0.2)]">•</span>
                  <EditAssetButton assetId={asset.id} assetTitle={asset.title} assetNote={asset.note} />
                  <span className="text-[rgb(var(--ring)/0.2)]">•</span>
                  <ToggleInactiveButton
                    type="asset"
                    id={asset.id}
                    isInactive={asset.is_inactive || false}
                  />
                  <span className="text-[rgb(var(--ring)/0.2)]">•</span>
                  <DeleteAssetButton assetId={asset.id} assetTitle={asset.title} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewingAsset && (
        <ViewAssetModal
          asset={viewingAsset}
          isOpen={!!viewingAsset}
          onClose={() => setViewingAsset(null)}
        />
      )}
    </div>
  );
}


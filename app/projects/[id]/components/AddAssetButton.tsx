// app/projects/[id]/components/AddAssetButton.tsx
'use client';

import { useState } from 'react';
import Button from '@/app/components/ui/Button';
import ModalShell from '@/app/components/ui/ModalShell';
import { showError, showSuccess } from '@/app/components/ErrorNotification';

interface AddAssetButtonProps {
  projectId: string;
}

export default function AddAssetButton({ projectId }: AddAssetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'select' | 'link' | 'file'>('select');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    setMode('select');
    setUrl('');
    setTitle('');
    setNote('');
    setFile(null);
  };

  const handleUrlPaste = async (pastedUrl: string) => {
    setUrl(pastedUrl);
    // Auto-detect YouTube
    const isYouTube = pastedUrl.includes('youtube.com') || pastedUrl.includes('youtu.be');
    if (isYouTube) {
      // Title will be auto-fetched by API
      setTitle('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill title from filename
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'link') {
      if (!url.trim()) {
        showError('Please enter a URL');
        return;
      }
    } else if (mode === 'file') {
      if (!file) {
        showError('Please select a file');
        return;
      }
    } else {
      return; // Should not happen
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('project_id', projectId);
      
      if (mode === 'file' && file) {
        formData.append('type', 'file');
        formData.append('file', file);
        if (title.trim()) formData.append('title', title.trim());
        if (note.trim()) formData.append('note', note.trim());
      } else if (mode === 'link') {
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        formData.append('type', isYouTube ? 'youtube' : 'link');
        formData.append('url', url.trim());
        if (title.trim()) formData.append('title', title.trim());
        if (note.trim()) formData.append('note', note.trim());
      }

      const response = await fetch('/api/assets/create', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create asset');
      }

      showSuccess('Asset added successfully');
      handleClose();
      window.location.reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        Add
      </Button>

      {isOpen && (
        <ModalShell onClose={handleClose}>
          <div className="p-6">
            <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4">
              Add to Library
            </h2>

            {mode === 'select' && (
              <div className="space-y-3">
                <button
                  onClick={() => setMode('link')}
                  className="w-full p-4 rounded-xl bg-[rgb(var(--surface))] ring-1 ring-[rgb(var(--ring)/0.08)] hover:ring-[rgb(var(--ring)/0.12)] transition-all text-left"
                >
                  <div className="font-medium text-[rgb(var(--text))] mb-1">Add Link</div>
                  <div className="text-sm text-[rgb(var(--muted))]">Add a web link or YouTube video</div>
                </button>
                <button
                  onClick={() => setMode('file')}
                  className="w-full p-4 rounded-xl bg-[rgb(var(--surface))] ring-1 ring-[rgb(var(--ring)/0.08)] hover:ring-[rgb(var(--ring)/0.12)] transition-all text-left"
                >
                  <div className="font-medium text-[rgb(var(--text))] mb-1">Upload File</div>
                  <div className="text-sm text-[rgb(var(--muted))]">PDF or image (PNG, JPG, WEBP)</div>
                </button>
              </div>
            )}

            {mode === 'link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                    URL *
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleUrlPaste(e.target.value)}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      handleUrlPaste(pasted);
                    }}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                    Title (auto-filled if empty)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title will be fetched automatically"
                    className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                    Note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Why does this matter? Add context..."
                    rows={3}
                    className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setMode('select')} disabled={loading}>
                    Back
                  </Button>
                  <Button variant="primary" onClick={handleSubmit} disabled={loading || !url.trim()}>
                    {loading ? 'Adding...' : 'Add Link'}
                  </Button>
                </div>
              </div>
            )}

            {mode === 'file' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                    File *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileSelect}
                    className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                  />
                  {file && (
                    <p className="text-xs text-[rgb(var(--muted))] mt-1">
                      Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                    Title (auto-filled from filename)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title from filename"
                    className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                    Note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Why does this matter? Add context..."
                    rows={3}
                    className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setMode('select')} disabled={loading}>
                    Back
                  </Button>
                  <Button variant="primary" onClick={handleSubmit} disabled={loading || !file}>
                    {loading ? 'Uploading...' : 'Upload File'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </>
  );
}


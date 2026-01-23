'use client';

import { useState, useCallback } from 'react';
import {
  GripVertical,
  Trash2,
  Plus,
  Image as ImageIcon,
  Film,
  Loader2,
  Save,
  X,
  Upload,
  CheckCircle2
} from 'lucide-react';
import Image from 'next/image';
import { cn, getImageUrl } from '@/lib/utils';
import type { GalleryItemAdmin } from '@/types/admin';

interface GalleryManagerProps {
  adminKey: string;
  modelId: string;
  modelSlug: string;
  initialItems: GalleryItemAdmin[];
  onUpdate: () => void;
}

export function GalleryManager({
  adminKey,
  modelId,
  modelSlug,
  initialItems,
  onUpdate
}: GalleryManagerProps) {
  const [items, setItems] = useState<GalleryItemAdmin[]>(
    [...initialItems].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Video Modal State
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [mp4File, setMp4File] = useState<File | null>(null);

  const [webmFile, setWebmFile] = useState<File | null>(null);

  // Delete Modal State
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = items.findIndex(i => i.id === draggedItem);
    const targetIndex = items.findIndex(i => i.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    // Update sort_order
    newItems.forEach((item, index) => {
      item.sort_order = index;
    });

    setItems(newItems);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/gallery/reorder?key=${adminKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item, index) => ({
            id: item.id,
            sort_order: index,
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setHasChanges(false);
        onUpdate();
      } else {
        alert('Failed to save order: ' + json.error);
      }
    } catch (err) {
      console.error('Save order error:', err);
      alert('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const res = await fetch(`/api/admin/gallery/${itemToDelete}?key=${adminKey}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (json.success) {
        setItems(items.filter(i => i.id !== itemToDelete));
        onUpdate();
        setItemToDelete(null); // Close modal
      } else {
        alert('Failed to delete: ' + json.error);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete item');
    }
  };

  const deleteItem = (itemId: string) => {
    setItemToDelete(itemId);
  };

  const uploadFile = async (file: File, mediaType: 'image' | 'video', customFilename?: string): Promise<string | null> => {
    try {
      // Get file extension
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const contentType = mediaType === 'video'
        ? (ext === 'webm' ? 'video/webm' : 'video/mp4')
        : (file.type || 'image/webp');

      // Generate filename: model-slug/timestamp-filename.ext
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = customFilename || `${modelSlug}/${timestamp}-${sanitizedName}`;

      // Use proxy upload to avoid CORS issues
      setUploadProgress(`Uploading ${file.name}...`);
      const formData = new FormData();

      formData.append('file', file);
      formData.append('filename', filename);
      formData.append('contentType', contentType);
      formData.append('bucket', 'models'); // Gallery items go to models bucket

      const uploadRes = await fetch(`/api/upload/proxy?key=${adminKey}`, {
        method: 'POST',
        body: formData,
      });

      // Check content type before parsing
      const responseContentType = uploadRes.headers.get("content-type") || "";
      const isJson = responseContentType.includes("application/json");

      if (!uploadRes.ok) {
        // Try to parse JSON error, fallback to status text
        let errorMessage = `Upload failed: ${uploadRes.status} ${uploadRes.statusText}`;

        if (isJson) {
          try {
            const error = await uploadRes.json();
            errorMessage = error.error || error.message || errorMessage;
          } catch (parseError) {
            console.error("Failed to parse error JSON:", parseError);
            const text = await uploadRes.text();
            errorMessage = text.substring(0, 200) || errorMessage;
          }
        } else {
          // Response is not JSON (likely HTML error page)
          const text = await uploadRes.text();
          errorMessage = `Server error (${uploadRes.status}): ${text.substring(0, 200)}`;
        }

        throw new Error(errorMessage);
      }

      // Parse successful response
      if (!isJson) {
        const text = await uploadRes.text();
        throw new Error(`Unexpected response format: ${text.substring(0, 200)}`);
      }

      const result = await uploadRes.json();
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return result.key;
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  };

  const handleUpload = async (files: FileList | null, mediaType: 'image' | 'video') => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress('Starting upload...');

    try {
      const uploadedFiles: { media_url: string; poster_url?: string }[] = [];
      const timestamp = Date.now();

      if (mediaType === 'video') {
        // Group files by base name (without extension) to handle mp4 + webm pairs
        const groups: Record<string, File[]> = {};
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          if (!groups[baseName]) groups[baseName] = [];
          groups[baseName].push(file);
        }

        // Validation: Ensure every group has both a main video (mp4/mov) and a webm
        const missingPairs: string[] = [];
        for (const baseName in groups) {
          const groupFiles = groups[baseName];
          const hasMain = groupFiles.some(f => !f.name.toLowerCase().endsWith('.webm'));
          const hasWebm = groupFiles.some(f => f.name.toLowerCase().endsWith('.webm'));

          if (!hasMain || !hasWebm) {
            missingPairs.push(baseName);
          }
        }

        if (missingPairs.length > 0) {
          alert(`Missing file pairs for: ${missingPairs.join(', ')}\n\nBoth an MP4/MOV and a WebM file are required for each video.`);
          setUploading(false);
          setUploadProgress('');
          return;
        }

        for (const baseName in groups) {
          const groupFiles = groups[baseName];
          // Find main video (non-webm) and webm (guaranteed to exist by validation above)
          const mainVideo = groupFiles.find(f => !f.name.toLowerCase().endsWith('.webm'))!;
          const webmVideo = groupFiles.find(f => f.name.toLowerCase().endsWith('.webm'))!;

          const sanitizedBase = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
          const mainExt = mainVideo.name.split('.').pop();
          const mainFilename = `${modelSlug}/${timestamp}-${sanitizedBase}.${mainExt}`;

          setUploadProgress(`Uploading ${mainVideo.name}...`);
          const mainUrl = await uploadFile(mainVideo, 'video', mainFilename);

          if (webmVideo) {
            setUploadProgress(`Uploading ${webmVideo.name} (optimized)...`);
            // Name it exactly as profile-gallery.tsx expects it (replacing extension with .webm)
            const webmFilename = `${modelSlug}/${timestamp}-${sanitizedBase}.webm`;
            await uploadFile(webmVideo, 'video', webmFilename);
          }

          if (mainUrl) {
            uploadedFiles.push({ media_url: mainUrl });
          }
        }
      } else {
        // Handle images (one-by-one as before)
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgress(`Processing ${i + 1}/${files.length}: ${file.name}...`);

          // Upload main file
          const mediaUrl = await uploadFile(file, mediaType);
          if (mediaUrl) {
            uploadedFiles.push({ media_url: mediaUrl });
          }
        }
      }

      // Create gallery items
      setUploadProgress('Creating gallery items...');
      for (const file of uploadedFiles) {
        const res = await fetch(`/api/admin/gallery?key=${adminKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_id: modelId,
            media_url: file.media_url,
            media_type: mediaType,
            poster_url: file.poster_url || null,
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          console.error('Failed to create gallery item:', json.error);
        }
      }

      // Refresh items
      onUpdate();
      setUploadProgress('');
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleDualUpload = async () => {
    if (!mp4File || !webmFile) return;

    setUploading(true);
    setUploadProgress('Starting upload...');
    setShowVideoModal(false); // Close modal

    try {
      const timestamp = Date.now();
      const baseName = mp4File.name.replace(/\.[^/.]+$/, "");
      const sanitizedBase = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');

      // MP4 Upload
      const mp4Ext = mp4File.name.split('.').pop();
      const mp4Filename = `${modelSlug}/${timestamp}-${sanitizedBase}.${mp4Ext}`;
      setUploadProgress(`Uploading ${mp4File.name}...`);
      const mp4Url = await uploadFile(mp4File, 'video', mp4Filename);

      // WebM Upload
      const webmFilename = `${modelSlug}/${timestamp}-${sanitizedBase}.webm`;
      setUploadProgress(`Uploading ${webmFile.name}...`);
      await uploadFile(webmFile, 'video', webmFilename);

      if (mp4Url) {
        // Create gallery item
        setUploadProgress('Creating gallery item...');
        const res = await fetch(`/api/admin/gallery?key=${adminKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_id: modelId,
            media_url: mp4Url,
            media_type: 'video',
            poster_url: null,
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          console.error('Failed to create gallery item:', json.error);
        }

        // Refresh items and cleanup
        onUpdate();
        setMp4File(null);
        setWebmFile(null);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setShowVideoModal(true); // Re-open modal on error
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-bold text-glass-primary">
          Gallery Items ({items.length})
        </h3>

        <div className="flex gap-2 flex-wrap">
          {/* Upload Buttons */}
          <label className="flex items-center gap-2 px-4 py-2 bg-glass-surface border border-obsidian-rim rounded-xl text-glass-primary cursor-pointer hover:bg-glass-surface/80 transition-all font-bold shadow-sm active:scale-95">
            <ImageIcon className="w-4 h-4" />
            <span className="text-sm">Add Image</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files, 'image')}
              disabled={uploading}
            />
          </label>

          <button
            onClick={() => setShowVideoModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-glass-surface border border-obsidian-rim rounded-xl text-glass-primary hover:bg-glass-surface/80 transition-all font-bold shadow-sm active:scale-95"
          >
            <Film className="w-4 h-4" />
            <span className="text-sm">Add Video</span>
          </button>

          {/* Save Order Button */}
          {hasChanges && (
            <button
              onClick={saveOrder}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-accent-emerald text-black rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-accent-emerald/20 active:scale-95"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Order
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <p className="text-sm text-glass-muted font-bold">
        Drag items to reorder. The first item is the profile cover. The last item becomes the locked VIP teaser.
      </p>

      {/* Gallery Grid */}
      {items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-obsidian-rim rounded-2xl bg-glass-surface/30">
          <ImageIcon className="w-12 h-12 text-glass-muted mx-auto mb-3" />
          <p className="text-glass-muted font-bold">No gallery items yet</p>
          <p className="text-sm text-glass-muted/60 mt-1">
            Upload images or videos to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing shadow-sm",
                draggedItem === item.id
                  ? "border-accent-violet opacity-50 scale-95"
                  : "border-obsidian-rim hover:border-accent-violet/30",
                index === 0 && "ring-2 ring-accent-emerald shadow-lg shadow-accent-emerald/20",
                index === items.length - 1 && "ring-2 ring-accent-amber shadow-lg shadow-accent-amber/20"
              )}
            >
              {/* Media */}
              {item.media_type === 'video' ? (
                <video
                  src={getImageUrl(item.media_url)}
                  poster={item.poster_url ? getImageUrl(item.poster_url) : undefined}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  playsInline
                />
              ) : (
                <Image
                  src={getImageUrl(item.media_url)}
                  alt={`Gallery item ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  unoptimized
                />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                {/* Position badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <GripVertical className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">#{index + 1}</span>
                </div>

                {/* Type badge */}
                <div className="absolute top-2 right-2">
                  {item.media_type === 'video' ? (
                    <Film className="w-4 h-4 text-white" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem(item.id);
                  }}
                  className="absolute bottom-2 right-2 p-2 bg-red-500/80 rounded-lg text-white hover:bg-red-500 transition-colors"
                  aria-label={`Delete gallery item ${index + 1}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Labels */}
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 px-2 py-1 bg-accent-emerald text-black text-[10px] rounded-lg font-bold uppercase tracking-wider">
                    Cover
                  </span>
                )}
                {index === items.length - 1 && (
                  <span className="absolute bottom-2 left-2 px-2 py-1 bg-accent-amber text-black text-[10px] rounded-lg font-bold uppercase tracking-wider">
                    VIP Teaser
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload indicator */}
      {uploading && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-thick flex items-center justify-center z-[100]">
          <div className="bg-glass-surface border border-obsidian-rim p-6 rounded-2xl text-center min-w-[300px] shadow-ao-stack">
            <Loader2 className="w-8 h-8 animate-spin text-accent-violet mx-auto mb-4" />
            <p className="text-glass-primary font-bold mb-1">Uploading...</p>
            {uploadProgress && (
              <p className="text-sm text-glass-muted font-bold px-4">{uploadProgress}</p>
            )}
          </div>
        </div>
      )}


      {/* Video Upload Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-thick flex items-center justify-center z-50 p-4">
          <div className="bg-glass-surface border border-obsidian-rim rounded-2xl p-6 w-full max-w-md shadow-ao-stack space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-glass-primary">Upload Video Pair</h3>
              <button
                onClick={() => setShowVideoModal(false)}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-yellow-400/10 dark:bg-yellow-500/10 border border-yellow-400/20 dark:border-yellow-500/20 rounded-xl text-yellow-700 dark:text-yellow-200/90 text-sm font-medium">
                Both formats are required for optimal playback across all devices.
              </div>

              {/* MP4 Input */}
              <div className="space-y-2">
                <label htmlFor="mp4-upload" className="text-sm font-bold text-glass-primary block px-1">
                  1. Main Video (MP4/MOV)
                </label>
                <div className={cn(
                  "border-2 border-dashed rounded-xl p-5 transition-all duration-300 cursor-pointer group/upload",
                  mp4File
                    ? "border-accent-emerald bg-accent-emerald/5"
                    : "border-obsidian-rim hover:border-accent-violet/30 hover:bg-glass-surface/30"
                )}>
                  <label className="flex items-center justify-center gap-3 cursor-pointer w-full h-full">
                    {mp4File ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-accent-emerald" />
                        <span className="text-sm text-glass-primary font-bold truncate max-w-[200px]">{mp4File.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-glass-muted group-hover/upload:text-glass-primary transition-colors" />
                        <span className="text-sm text-glass-muted group-hover/upload:text-glass-primary transition-colors">Select MP4 or MOV</span>
                      </>
                    )}
                    <input
                      id="mp4-upload"
                      type="file"
                      accept="video/mp4,video/quicktime,.mp4,.mov"
                      className="hidden"
                      onChange={(e) => setMp4File(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              {/* WebM Input */}
              <div className="space-y-2">
                <label htmlFor="webm-upload" className="text-sm font-bold text-glass-primary block px-1">
                  2. Optimized Video (WebM)
                </label>
                <div className={cn(
                  "border-2 border-dashed rounded-xl p-5 transition-all duration-300 cursor-pointer group/upload",
                  webmFile
                    ? "border-accent-emerald bg-accent-emerald/5"
                    : "border-obsidian-rim hover:border-accent-violet/30 hover:bg-glass-surface/30"
                )}>
                  <label className="flex items-center justify-center gap-3 cursor-pointer w-full h-full">
                    {webmFile ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-accent-emerald" />
                        <span className="text-sm text-glass-primary font-bold truncate max-w-[200px]">{webmFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-glass-muted group-hover/upload:text-glass-primary transition-colors" />
                        <span className="text-sm text-glass-muted group-hover/upload:text-glass-primary transition-colors">Select WebM</span>
                      </>
                    )}
                    <input
                      id="webm-upload"
                      type="file"
                      accept="video/webm,.webm"
                      className="hidden"
                      onChange={(e) => setWebmFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleDualUpload}
                  disabled={!mp4File || !webmFile}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-violet text-white rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-violet/20 active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  Upload Video Pair
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-thick flex items-center justify-center z-50 p-4">
          <div className="bg-glass-surface border border-obsidian-rim rounded-2xl p-6 w-full max-w-sm shadow-ao-stack space-y-6">
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-glass-primary">Delete Item?</h3>
                <p className="text-sm text-glass-muted font-bold">
                  This action cannot be undone. This gallery item will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 px-4 py-2.5 bg-glass-surface border border-obsidian-rim hover:bg-glass-surface/80 text-glass-primary rounded-xl transition-all font-bold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-accent-red hover:opacity-90 text-white rounded-xl transition-all font-bold shadow-lg shadow-accent-red/20 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

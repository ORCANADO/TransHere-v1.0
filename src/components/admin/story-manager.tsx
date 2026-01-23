'use client';

import { useState, useEffect } from 'react';
import {
  Film,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Pin,
  Clock,
  X,
  CheckCircle2
} from 'lucide-react';
import Image from 'next/image';
import { cn, getImageUrl } from '@/lib/utils';
import type { StoryGroupAdmin } from '@/types/admin';

interface StoryManagerProps {
  adminKey: string;
  modelId: string;
  modelSlug: string;
  storyGroups: StoryGroupAdmin[];
  onUpdate: () => void;
}

export function StoryManager({
  adminKey,
  modelId,
  modelSlug,
  storyGroups: initialGroups,
  onUpdate
}: StoryManagerProps) {
  const [groups, setGroups] = useState<StoryGroupAdmin[]>(initialGroups);

  // Sync state when props update
  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [mediaMode, setMediaMode] = useState<'image' | 'video'>('image');

  // Video Modal State
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [mp4File, setMp4File] = useState<File | null>(null);
  const [webmFile, setWebmFile] = useState<File | null>(null);
  const [webpFile, setWebpFile] = useState<File | null>(null);
  const [isPinnedForModal, setIsPinnedForModal] = useState(false);

  // Separate pinned and recent groups
  const pinnedGroups = groups.filter(g => g.is_pinned);
  const recentGroups = groups.filter(g => !g.is_pinned);

  const uploadFile = async (file: File, mediaType: 'image' | 'video', customFilename?: string): Promise<string> => {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const contentType = mediaType === 'video'
        ? (ext === 'webm' ? 'video/webm' : 'video/mp4')
        : (file.type || 'image/webp');

      const timestamp = Date.now();
      const sanitizedBase = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = customFilename || `${modelSlug}/${timestamp}-${sanitizedBase}.${ext}`;

      setUploadProgress(`Uploading ${file.name}...`);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', filename);
      formData.append('contentType', contentType);
      formData.append('bucket', 'stories');

      const uploadRes = await fetch(`/api/upload/proxy?key=${adminKey}`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Upload failed: ${uploadRes.status} - ${errorText.substring(0, 100)}`);
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

  const handleUpload = async (files: FileList | null, isPinned: boolean = false) => {
    if (!files || files.length === 0) return;

    // If video, open modal (unless we're already handling from modal)
    if (mediaMode === 'video') {
      setIsPinnedForModal(isPinned);
      setMp4File(null);
      setWebmFile(null);
      setWebpFile(null);
      setShowVideoModal(true);
      return;
    }

    setUploading(true);
    setUploadProgress('Starting upload...');

    try {
      const file = files[0];
      const mediaUrl = await uploadFile(file, 'image');

      setUploadProgress('Creating story...');
      const res = await fetch(`/api/admin/stories?key=${adminKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          is_pinned: isPinned,
          title: isPinned ? 'Pinned' : null,
          media_url: mediaUrl,
          cover_url: mediaUrl,
          media_type: 'image',
          duration: 5,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onUpdate();
      } else {
        alert('Failed to create story: ' + json.error);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleVideoStoryUpload = async () => {
    if (!mp4File || !webmFile || !webpFile) return;

    setUploading(true);
    setUploadProgress('Starting upload...');
    setShowVideoModal(false);

    try {
      const timestamp = Date.now();
      const baseName = mp4File.name.replace(/\.[^/.]+$/, "");
      const sanitizedBase = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');

      // MP4 Upload
      const mp4Ext = mp4File.name.split('.').pop() || 'mp4';
      const mp4Filename = `${modelSlug}/${timestamp}-${sanitizedBase}.${mp4Ext}`;
      const mp4Url = await uploadFile(mp4File, 'video', mp4Filename);

      // WebM Upload
      const webmFilename = `${modelSlug}/${timestamp}-${sanitizedBase}.webm`;
      await uploadFile(webmFile, 'video', webmFilename);

      // WebP Preview Upload
      const webpFilename = `${modelSlug}/${timestamp}-${sanitizedBase}.webp`;
      const posterUrl = await uploadFile(webpFile, 'image', webpFilename);

      setUploadProgress('Creating video story...');
      const res = await fetch(`/api/admin/stories?key=${adminKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          is_pinned: isPinnedForModal,
          title: isPinnedForModal ? 'Pinned' : null,
          media_url: mp4Url,
          cover_url: posterUrl,
          poster_url: posterUrl,
          media_type: 'video',
          duration: 15,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onUpdate();
        // Cleanup
        setMp4File(null);
        setWebmFile(null);
        setWebpFile(null);
      } else {
        alert('Failed to create story: ' + json.error);
        setShowVideoModal(true);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setShowVideoModal(true);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const deleteStory = async (storyId: string, groupId: string) => {
    if (!confirm('Delete this story?')) return;

    try {
      const res = await fetch(`/api/admin/stories/${storyId}?key=${adminKey}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (json.success) {
        setGroups(groups.map(g =>
          g.id === groupId
            ? { ...g, stories: g.stories.filter(s => s.id !== storyId) }
            : g
        ));
        onUpdate();
      } else {
        alert('Failed to delete: ' + json.error);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Delete this story group and all its stories?')) return;

    try {
      const res = await fetch(`/api/admin/story-groups/${groupId}?key=${adminKey}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (json.success) {
        setGroups(groups.filter(g => g.id !== groupId));
        onUpdate();
      } else {
        alert('Failed to delete: ' + json.error);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Film className="w-5 h-5 text-accent-violet" />
            Stories ({groups.reduce((acc, g) => acc + (g.stories?.length || 0), 0)})
          </h3>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Manage recent and pinned story groups
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={mediaMode}
            onChange={(e) => setMediaMode(e.target.value as 'image' | 'video')}
            className="px-3 py-2 bg-black/[0.03] dark:bg-white/5 border border-border dark:border-white/10 rounded-lg text-foreground text-sm font-medium focus:ring-2 focus:ring-[#7A27FF]/20 outline-none transition-all"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>

          {mediaMode === 'image' ? (
            <label className="flex items-center gap-2 px-4 py-2 bg-black/[0.03] dark:bg-white/5 border border-border dark:border-white/10 rounded-lg text-foreground cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/10 transition-all active:scale-95">
              <ImageIcon className="w-4 h-4 text-accent-violet" />
              <span className="text-sm font-medium">Add to Recent</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files, false)}
                disabled={uploading}
              />
            </label>
          ) : (
            <button
              onClick={() => {
                setIsPinnedForModal(false);
                setMp4File(null);
                setWebmFile(null);
                setWebpFile(null);
                setShowVideoModal(true);
              }}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-black/[0.03] dark:bg-white/5 border border-border dark:border-white/10 rounded-lg text-foreground cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              <Film className="w-4 h-4 text-accent-red" />
              <span className="text-sm font-medium">Add to Recent</span>
            </button>
          )}
        </div>
      </div>

      {/* Pinned Groups */}
      {pinnedGroups.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider px-1">
            <Pin className="w-4 h-4 text-accent-amber" />
            Pinned Blocks
          </h4>
          {pinnedGroups.map((group) => (
            <div
              key={group.id}
              className="bg-black/[0.02] dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-foreground">{group.title || 'Pinned'}</h5>
                  <span className="text-xs text-muted-foreground font-medium bg-black/[0.04] dark:bg-white/10 px-2 py-0.5 rounded-full">
                    {group.stories?.length || 0} stories
                  </span>
                </div>
                <button
                  onClick={() => deleteGroup(group.id)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {group.stories && group.stories.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {group.stories.map((story) => (
                    <div
                      key={story.id}
                      className="relative w-16 h-20 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 group"
                    >
                      {story.media_type === 'video' ? (
                        <video
                          src={getImageUrl(story.media_url)}
                          poster={story.poster_url ? getImageUrl(story.poster_url) : undefined}
                          className="absolute inset-0 w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <Image
                          src={getImageUrl(story.media_url)}
                          alt="Story"
                          fill
                          className="object-cover"
                          sizes="64px"
                          unoptimized
                        />
                      )}

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => deleteStory(story.id, group.id)}
                          className="p-1 bg-red-500 rounded text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {story.media_type === 'video' && (
                        <Film className="absolute top-1 right-1 w-3 h-3 text-white" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No stories in this pinned block
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent Stories */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider px-1">
          <Clock className="w-4 h-4 text-accent-violet" />
          Recent Stories
        </h4>

        {recentGroups.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border dark:border-white/10 rounded-2xl">
            <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground font-bold">No recent stories yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload stories to get started
            </p>
          </div>
        ) : (
          recentGroups.map((group) => (
            <div
              key={group.id}
              className="bg-black/[0.02] dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-foreground">Recent Stories</h5>
                  <span className="text-xs text-muted-foreground font-medium bg-black/[0.04] dark:bg-white/10 px-2 py-0.5 rounded-full">
                    {group.stories?.length || 0} stories
                  </span>
                </div>
                <button
                  onClick={() => deleteGroup(group.id)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {group.stories && group.stories.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {group.stories.map((story) => (
                    <div
                      key={story.id}
                      className="relative w-16 h-20 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 group"
                    >
                      {story.media_type === 'video' ? (
                        <video
                          src={getImageUrl(story.media_url)}
                          poster={story.poster_url ? getImageUrl(story.poster_url) : undefined}
                          className="absolute inset-0 w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <Image
                          src={getImageUrl(story.media_url)}
                          alt="Story"
                          fill
                          className="object-cover"
                          sizes="64px"
                          unoptimized
                        />
                      )}

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => deleteStory(story.id, group.id)}
                          className="p-1 bg-red-500 rounded text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {story.media_type === 'video' && (
                        <Film className="absolute top-1 right-1 w-3 h-3 text-white" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No stories yet
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Upload indicator */}
      {uploading && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110]">
          <div className="bg-card border border-border dark:border-white/10 p-6 rounded-2xl text-center min-w-[300px] shadow-2xl liquid-glass-elevated">
            <Loader2 className="w-8 h-8 animate-spin text-accent-violet mx-auto mb-4" />
            <p className="text-foreground font-bold mb-1">Uploading...</p>
            {uploadProgress && (
              <p className="text-sm text-muted-foreground font-medium px-4">{uploadProgress}</p>
            )}
          </div>
        </div>
      )}

      {/* Video Story Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-thick flex items-center justify-center z-[110]">
          <div className="bg-glass-surface border border-obsidian-rim p-6 rounded-2xl w-full max-w-sm shadow-ao-stack space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-glass-primary">Upload Video Story</h3>
              <button
                onClick={() => setShowVideoModal(false)}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-muted-foreground font-medium px-1">
                All 3 files are required for video stories.
              </p>

              {/* MP4 Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">1. Main Video (MP4)</label>
                <div className={cn(
                  "border-2 border-dashed rounded-xl p-4 transition-all duration-300 cursor-pointer",
                  mp4File ? "border-emerald-500 bg-emerald-500/5" : "border-border dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                )}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    {mp4File ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm text-foreground font-medium truncate">{mp4File ? mp4File.name : "Select MP4"}</span>
                    <input type="file" accept="video/mp4" className="hidden" onChange={(e) => setMp4File(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              {/* WebM Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">2. Optimized Video (WebM)</label>
                <div className={cn(
                  "border-2 border-dashed rounded-xl p-4 transition-all duration-300 cursor-pointer",
                  webmFile ? "border-emerald-500 bg-emerald-500/5" : "border-border dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                )}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    {webmFile ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm text-foreground font-medium truncate">{webmFile ? webmFile.name : "Select WebM"}</span>
                    <input type="file" accept="video/webm" className="hidden" onChange={(e) => setWebmFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              {/* WebP Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">3. Preview Image (WebP)</label>
                <div className={cn(
                  "border-2 border-dashed rounded-xl p-4 transition-all duration-300 cursor-pointer",
                  webpFile ? "border-emerald-500 bg-emerald-500/5" : "border-border dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                )}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    {webpFile ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm text-foreground font-medium truncate">{webpFile ? webpFile.name : "Select WebP"}</span>
                    <input type="file" accept="image/webp" className="hidden" onChange={(e) => setWebpFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleVideoStoryUpload}
                  disabled={!mp4File || !webmFile || !webpFile}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-violet text-white rounded-xl font-bold transition-all shadow-lg shadow-accent-violet/20 disabled:opacity-50 active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  Upload 3-File Story
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

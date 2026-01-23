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
  CheckCircle2,
  Grid3x3
} from 'lucide-react';
import Image from 'next/image';
import { cn, getImageUrl } from '@/lib/utils';
import { useAdminTheme } from '@/hooks/use-admin-theme';
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

  const { isLightMode } = useAdminTheme();

  return (
    <div className="space-y-6">
      {/* Task 8.5: Stories Manager Panel - 3 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Story Groups */}
        <div className={cn(
          "rounded-2xl p-5 h-fit",
          "bg-[#353839]/40 border border-[#555D50]/30",
          "data-[theme=light]:bg-white/50 data-[theme=light]:border-[#CED9EF]/30"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
          <div className="flex items-center gap-2 mb-4">
            <Grid3x3 className={cn(
              "w-5 h-5",
              "text-[#9E9E9E]",
              "data-[theme=light]:text-[#6B6B7B]"
            )} data-theme={isLightMode ? 'light' : 'dark'} />
            <h3 className={cn(
              "font-semibold",
              "text-[#E2DFD2]",
              "data-[theme=light]:text-[#2E293A]"
            )} data-theme={isLightMode ? 'light' : 'dark'}>
              Story Groups ({groups.length})
            </h3>
          </div>
          <p className={cn(
            "text-sm mb-6",
            "text-[#9E9E9E]",
            "data-[theme=light]:text-[#6B6B7B]"
          )} data-theme={isLightMode ? 'light' : 'dark'}>
            Manage recent and pinned story groups
          </p>

          <div className="space-y-6">
            {/* Pinned Section */}
            <div>
              <div className={cn(
                "flex items-center gap-2 py-2 mb-2",
                "text-[10px] font-bold uppercase tracking-[0.2em]",
                "text-[#00FF85]",
              )}>
                <Pin className="w-3.5 h-3.5" />
                PINNED BLOCKS
              </div>
              <div className="space-y-2">
                {pinnedGroups.length === 0 ? (
                  <p className="text-xs text-[#9E9E9E]/40 italic px-2">No pinned blocks</p>
                ) : pinnedGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all",
                      selectedGroup === group.id
                        ? "bg-[#5B4965]/40 text-[#E2DFD2]"
                        : "hover:bg-[#5B4965]/20 text-[#9E9E9E]"
                    )}
                  >
                    <span className="text-sm font-medium truncate">{group.title || 'Pinned'}</span>
                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-lg">{group.stories?.length || 0}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Section */}
            <div>
              <div className={cn(
                "flex items-center gap-2 py-2 mb-2",
                "text-[10px] font-bold uppercase tracking-[0.2em]",
                "text-[#9E9E9E]",
                "data-[theme=light]:text-[#6B6B7B]"
              )} data-theme={isLightMode ? 'light' : 'dark'}>
                <Clock className="w-3.5 h-3.5" />
                RECENT STORIES
              </div>
              <div className="space-y-2">
                {recentGroups.length === 0 ? (
                  <p className="text-xs text-[#9E9E9E]/40 italic px-2">No recent stories</p>
                ) : recentGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all",
                      selectedGroup === group.id
                        ? "bg-[#5B4965]/40 text-[#E2DFD2]"
                        : "hover:bg-[#5B4965]/20 text-[#9E9E9E]"
                    )}
                  >
                    <span className="text-sm font-medium">Auto-Created Group</span>
                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-lg">{group.stories?.length || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Upload Area */}
        <div className={cn(
          "rounded-2xl p-5 h-fit",
          "bg-[#353839]/40 border border-[#555D50]/30",
          "data-[theme=light]:bg-white/50 data-[theme=light]:border-[#CED9EF]/30"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn(
              "font-semibold",
              "text-[#E2DFD2]",
              "data-[theme=light]:text-[#2E293A]"
            )} data-theme={isLightMode ? 'light' : 'dark'}>
              Upload New Story
            </h3>
            <div className="flex gap-1 bg-black/20 rounded-lg p-0.5">
              <button
                onClick={() => setMediaMode('image')}
                className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", mediaMode === 'image' ? "bg-[#5B4965] text-white" : "text-[#9E9E9E]")}
              >IMAGE</button>
              <button
                onClick={() => setMediaMode('video')}
                className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", mediaMode === 'video' ? "bg-[#5B4965] text-white" : "text-[#9E9E9E]")}
              >VIDEO</button>
            </div>
          </div>

          {mediaMode === 'image' ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-[#00FF85] mb-2 uppercase tracking-wider">
                MAIN IMAGE (WEBP/JPG)
              </p>
              <div className={cn(
                "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300",
                "border-[#555D50] hover:border-[#00FF85] hover:bg-[#00FF85]/5",
                "data-[theme=light]:border-[#CED9EF] data-[theme=light]:hover:border-[#00FF85]"
              )} data-theme={isLightMode ? 'light' : 'dark'}>
                <label className="cursor-pointer block">
                  <Upload className="w-8 h-8 mx-auto mb-3 text-[#9E9E9E]" />
                  <p className="text-sm font-bold text-[#E2DFD2] data-[theme=light]:text-[#2E293A]" data-theme={isLightMode ? 'light' : 'dark'}>
                    Click to select images
                  </p>
                  <p className="text-[10px] text-[#9E9E9E] mt-1 uppercase tracking-widest font-bold">Max 5MB per file</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files, false)}
                    disabled={uploading}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isPinnedForModal}
                  onChange={(e) => setIsPinnedForModal(e.target.checked)}
                  className="w-4 h-4 rounded border-[#555D50] bg-black/20 text-[#7A27FF] focus:ring-[#7A27FF]/40"
                />
                <span className="text-xs font-bold text-[#9E9E9E] group-hover:text-[#E2DFD2] transition-colors">Pin to Story Blocks</span>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: '1. MAIN VIDEO (MP4)', key: 'mp4', accept: 'video/mp4', file: mp4File, setter: setMp4File },
                { label: '2. OPTIMIZED VIDEO (WEBM)', key: 'webm', accept: 'video/webm', file: webmFile, setter: setWebmFile },
                { label: '3. PREVIEW IMAGE (WEBP)', key: 'webp', accept: 'image/webp', file: webpFile, setter: setWebpFile }
              ].map((zone) => (
                <div key={zone.key}>
                  <p className="text-[10px] font-bold text-[#00FF85] mb-2 uppercase tracking-wider">
                    {zone.label}
                  </p>
                  <div className={cn(
                    "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300",
                    zone.file ? "border-[#00FF85] bg-[#00FF85]/5" : "border-[#555D50] hover:border-[#5B4965] hover:bg-[#5B4965]/10",
                    isLightMode && !zone.file && "data-[theme=light]:border-[#CED9EF] data-[theme=light]:hover:border-[#EFC8DF]"
                  )} data-theme={isLightMode ? 'light' : 'dark'}>
                    <label className="cursor-pointer flex items-center justify-center gap-2">
                      <Upload className={cn("w-4 h-4 transition-colors", zone.file ? "text-[#00FF85]" : "text-[#9E9E9E]")} />
                      <p className={cn(
                        "text-xs font-bold truncate max-w-[150px]",
                        zone.file ? "text-[#00FF85]" : "text-[#E2DFD2] data-[theme=light]:text-[#2E293A]"
                      )} data-theme={isLightMode ? 'light' : 'dark'}>
                        {zone.file ? zone.file.name : "Select File"}
                      </p>
                      <input
                        type="file"
                        accept={zone.accept}
                        className="hidden"
                        onChange={(e) => zone.setter(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer group mb-4">
                  <input
                    type="checkbox"
                    checked={isPinnedForModal}
                    onChange={(e) => setIsPinnedForModal(e.target.checked)}
                    className="w-4 h-4 rounded border-[#555D50] bg-black/20 text-[#7A27FF] focus:ring-[#7A27FF]/40"
                  />
                  <span className="text-xs font-bold text-[#9E9E9E] group-hover:text-[#E2DFD2] transition-colors">Pin to Story Blocks</span>
                </label>
                <button
                  onClick={handleVideoStoryUpload}
                  disabled={!mp4File || !webmFile || !webpFile || uploading}
                  className={cn(
                    "w-full py-3 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2",
                    "bg-[#00FF85] text-black shadow-lg shadow-[#00FF85]/20",
                    "disabled:opacity-50 disabled:grayscale disabled:shadow-none"
                  )}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  UPLOAD 3-FILE STORY
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Preview */}
        <div className={cn(
          "rounded-2xl p-5",
          "bg-[#353839]/40 border border-[#555D50]/30",
          "data-[theme=light]:bg-white/50 data-[theme=light]:border-[#CED9EF]/30"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
          {selectedGroup ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#E2DFD2] data-[theme=light]:text-[#2E293A]" data-theme={isLightMode ? 'light' : 'dark'}>
                  Group Preview
                </h3>
                <button
                  onClick={() => deleteGroup(selectedGroup)}
                  className="p-2 rounded-lg text-[#9E9E9E] hover:text-[#FF4B4B] hover:bg-[#FF4B4B]/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 overflow-y-auto custom-scrollbar pr-1">
                {groups.find(g => g.id === selectedGroup)?.stories?.map((story) => (
                  <div key={story.id} className="relative aspect-[3/4] rounded-lg overflow-hidden group/story bg-black/40">
                    {story.media_type === 'video' ? (
                      <video
                        src={getImageUrl(story.media_url)}
                        poster={story.poster_url ? getImageUrl(story.poster_url) : undefined}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <Image
                        src={getImageUrl(story.media_url)}
                        alt="Story"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/story:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => deleteStory(story.id, selectedGroup)}
                        className="p-1.5 bg-[#FF4B4B] rounded-lg text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Task 8.5: Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-20 h-20 rounded-full bg-black/20 flex items-center justify-center mb-6">
                <Grid3x3 className={cn(
                  "w-10 h-10",
                  "text-[#555D50]",
                  "data-[theme=light]:text-[#CED9EF]"
                )} data-theme={isLightMode ? 'light' : 'dark'} />
              </div>
              <p className={cn(
                "font-bold mb-2",
                "text-[#E2DFD2]",
                "data-[theme=light]:text-[#2E293A]"
              )} data-theme={isLightMode ? 'light' : 'dark'}>
                No group selected
              </p>
              <p className={cn(
                "text-sm px-6 leading-relaxed",
                "text-[#9E9E9E]",
                "data-[theme=light]:text-[#6B6B7B]"
              )} data-theme={isLightMode ? 'light' : 'dark'}>
                Select a group on the left to view and manage its stories.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Upload Status Indicator */}
      {uploading && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4">
          <div className={cn(
            "px-6 py-4 rounded-2xl flex items-center gap-4 bg-[#0B0C0C]/90 border border-[#00FF85]/30 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl",
          )}>
            <div className="relative">
              <Loader2 className="w-6 h-6 animate-spin text-[#00FF85]" />
              <div className="absolute inset-0 blur-md bg-[#00FF85]/20 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#E2DFD2]">Uploading Story...</p>
              <p className="text-[10px] text-[#00FF85] font-bold uppercase tracking-widest">{uploadProgress}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

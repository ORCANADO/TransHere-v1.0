'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Pin,
  Plus,
  Trash2,
  Edit,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Image as ImageIcon,
  Film,
  Save,
  Loader2,
  X,
  Upload,
  Camera,
  CheckCircle2
} from 'lucide-react';
import Image from 'next/image';
import { cn, getImageUrl } from '@/lib/utils';
import type { StoryGroupAdmin } from '@/types/admin';

interface PinnedBlocksManagerProps {
  adminKey: string;
  modelId: string;
  modelSlug: string;
  storyGroups: StoryGroupAdmin[];
  onUpdate: () => void;
}

export function PinnedBlocksManager({
  adminKey,
  modelId,
  modelSlug,
  storyGroups: initialGroups,
  onUpdate
}: PinnedBlocksManagerProps) {
  const [groups, setGroups] = useState<StoryGroupAdmin[]>(
    [...initialGroups].sort((a, b) => a.sort_order - b.sort_order).map(g => ({
      ...g,
      stories: [...(g.stories || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    }))
  );

  // Sync state when props update (but preserve local drag changes)
  useEffect(() => {
    const hasLocalChanges = Object.values(hasOrderChanges).some(Boolean);
    if (!hasLocalChanges) {
      setGroups(
        [...initialGroups].sort((a, b) => a.sort_order - b.sort_order).map(g => ({
          ...g,
          stories: [...(g.stories || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGroups]);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState<string | null>(null); // groupId that's uploading
  const [uploadingCover, setUploadingCover] = useState<string | null>(null); // groupId that's uploading cover
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const [draggedStory, setDraggedStory] = useState<{ groupId: string; storyId: string } | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);

  const [hasOrderChanges, setHasOrderChanges] = useState<{ [groupId: string]: boolean }>({});
  const [hasBlockOrderChanges, setHasBlockOrderChanges] = useState(false);

  const [savingOrder, setSavingOrder] = useState<string | null>(null); // groupId that's saving order
  const [savingBlockOrder, setSavingBlockOrder] = useState(false);

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const coverInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Video Modal State
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [mp4File, setMp4File] = useState<File | null>(null);
  const [webmFile, setWebmFile] = useState<File | null>(null);
  const [webpFile, setWebpFile] = useState<File | null>(null);

  const createBlock = async () => {
    if (!newBlockTitle.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/story-groups?key=${adminKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          title: newBlockTitle.trim(),
          is_pinned: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setGroups([...groups, { ...json.data, stories: [] }]);
        setNewBlockTitle('');
        setShowCreateModal(false);
        onUpdate();
      } else {
        alert('Failed to create: ' + json.error);
      }
    } catch (err) {
      console.error('Create error:', err);
      alert('Failed to create block');
    } finally {
      setSaving(false);
    }
  };

  const updateBlock = async (groupId: string, updates: Partial<StoryGroupAdmin>) => {
    try {
      const res = await fetch(`/api/admin/story-groups/${groupId}?key=${adminKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const json = await res.json();
      if (json.success) {
        setGroups(groups.map(g => g.id === groupId ? { ...g, ...updates } : g));
        setEditingGroup(null);
        onUpdate();
      } else {
        alert('Failed to update: ' + json.error);
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update block');
    }
  };

  const deleteBlock = async (groupId: string) => {
    if (!confirm('Delete this pinned block and all its stories?')) return;

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
      alert('Failed to delete block');
    }
  };

  const moveBlock = async (groupId: string, direction: 'up' | 'down') => {
    const index = groups.findIndex(g => g.id === groupId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === groups.length - 1)
    ) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newGroups = [...groups];
    [newGroups[index], newGroups[newIndex]] = [newGroups[newIndex], newGroups[index]];

    // Update sort_order
    const updates = newGroups.map((g, i) => ({
      id: g.id,
      sort_order: i,
    }));

    setGroups(newGroups.map((g, i) => ({ ...g, sort_order: i })));
    setHasBlockOrderChanges(true);

    // Save to server
    try {
      const res = await fetch(`/api/admin/story-groups/reorder?key=${adminKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates }),
      });

      const json = await res.json();
      if (json.success) {
        setHasBlockOrderChanges(false);
        onUpdate();
      }
    } catch (err) {
      console.error('Reorder error:', err);
    }
  };

  const handleBlockDragStart = (groupId: string) => {
    setDraggedBlock(groupId);
  };

  const handleBlockDragOver = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    if (!draggedBlock || draggedBlock === targetGroupId) return;

    const draggedIndex = groups.findIndex(g => g.id === draggedBlock);
    const targetIndex = groups.findIndex(g => g.id === targetGroupId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newGroups = [...groups];
    const [removed] = newGroups.splice(draggedIndex, 1);
    newGroups.splice(targetIndex, 0, removed);

    // Update sort_order
    newGroups.forEach((group, index) => {
      group.sort_order = index;
    });

    setGroups(newGroups);
    setHasBlockOrderChanges(true);
  };

  const handleBlockDragEnd = () => {
    setDraggedBlock(null);
  };

  const saveBlockOrder = async () => {
    if (!hasBlockOrderChanges) return;

    setSavingBlockOrder(true);
    try {
      const res = await fetch(`/api/admin/story-groups/reorder?key=${adminKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: groups.map((group, index) => ({
            id: group.id,
            sort_order: index,
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setHasBlockOrderChanges(false);
        onUpdate();
      } else {
        alert('Failed to save block order: ' + json.error);
      }
    } catch (err) {
      console.error('Save block order error:', err);
      alert('Failed to save block order');
    } finally {
      setSavingBlockOrder(false);
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
      }
    } catch (err) {
      console.error('Delete story error:', err);
    }
  };

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

  const handleUpload = async (groupId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // If video, open modal
    if (ext === 'webm' || ext === 'mp4') {
      setTargetGroupId(groupId);
      setMp4File(null);
      setWebmFile(null);
      setWebpFile(null);
      setShowVideoModal(true);
      return;
    }

    setUploading(groupId);
    setUploadProgress('Starting upload...');

    try {
      const mediaUrl = await uploadFile(file, 'image');

      setUploadProgress('Creating story...');
      const res = await fetch(`/api/admin/stories?key=${adminKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          group_id: groupId,
          is_pinned: true,
          media_url: mediaUrl,
          cover_url: mediaUrl,
          media_type: 'image',
          duration: 5,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onUpdate();
        setUploadProgress('');
      } else {
        alert('Failed to create story: ' + json.error);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploading(null);
      setUploadProgress('');
    }
  };

  const handleVideoStoryUpload = async () => {
    if (!mp4File || !webmFile || !webpFile || !targetGroupId) return;

    setUploading(targetGroupId);
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
          group_id: targetGroupId,
          is_pinned: true,
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
        setTargetGroupId(null);
      } else {
        alert('Failed to create story: ' + json.error);
        setShowVideoModal(true);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setShowVideoModal(true);
    } finally {
      setUploading(null);
      setUploadProgress('');
    }
  };

  const handleCoverUpload = async (groupId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingCover(groupId);
    setUploadProgress('Uploading cover photo...');

    try {
      const timestamp = Date.now();
      const file = files[0];
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");
      const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
      const filename = `stories/${timestamp}-${cleanName}-cover.${ext}`;

      const coverUrl = await uploadFile(file, 'image', filename);

      setUploadProgress('Updating cover...');
      const res = await fetch(`/api/admin/story-groups/${groupId}?key=${adminKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cover_url: coverUrl,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setGroups(groups.map(g =>
          g.id === groupId
            ? { ...g, cover_url: coverUrl }
            : g
        ));
        onUpdate();
        setUploadProgress('');
      } else {
        alert('Failed to update cover: ' + json.error);
      }
    } catch (err) {
      console.error('Cover upload error:', err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploadingCover(null);
      setUploadProgress('');
    }
  };

  const handleStoryDragStart = (groupId: string, storyId: string) => {
    setDraggedStory({ groupId, storyId });
  };

  const handleStoryDragOver = (e: React.DragEvent, groupId: string, targetStoryId: string) => {
    e.preventDefault();
    if (!draggedStory || draggedStory.groupId !== groupId || draggedStory.storyId === targetStoryId) return;

    const group = groups.find(g => g.id === groupId);
    if (!group || !group.stories) return;

    const draggedIndex = group.stories.findIndex(s => s.id === draggedStory.storyId);
    const targetIndex = group.stories.findIndex(s => s.id === targetStoryId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newStories = [...group.stories];
    const [removed] = newStories.splice(draggedIndex, 1);
    newStories.splice(targetIndex, 0, removed);

    // Update sort_order
    newStories.forEach((story, index) => {
      story.sort_order = index;
    });

    setGroups(groups.map(g =>
      g.id === groupId
        ? { ...g, stories: newStories }
        : g
    ));
    setHasOrderChanges({ ...hasOrderChanges, [groupId]: true });
  };

  const handleStoryDragEnd = () => {
    setDraggedStory(null);
  };

  const saveStoryOrder = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || !group.stories || !hasOrderChanges[groupId]) return;

    setSavingOrder(groupId);
    try {
      const res = await fetch(`/api/admin/stories/reorder?key=${adminKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: group.stories.map((story, index) => ({
            id: story.id,
            sort_order: index,
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setHasOrderChanges({ ...hasOrderChanges, [groupId]: false });
        onUpdate();
      } else {
        alert('Failed to save order: ' + json.error);
      }
    } catch (err) {
      console.error('Save order error:', err);
      alert('Failed to save order');
    } finally {
      setSavingOrder(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-glass-primary flex items-center gap-2">
            <Pin className="w-5 h-5 text-accent-amber" />
            Pinned Blocks ({groups.length})
          </h3>
          <p className="text-sm text-glass-muted font-bold">
            Pinned blocks appear at the top of the model's story section
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-amber text-black rounded-xl font-bold transition-all shadow-lg shadow-accent-amber/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create Block
        </button>
      </div>

      {/* Blocks List */}
      {groups.length === 0 ? (
        <div className="text-center py-12 border border-obsidian-rim rounded-2xl bg-glass-surface">
          <Pin className="w-12 h-12 text-glass-muted mx-auto mb-3 opacity-20" />
          <p className="text-glass-muted font-bold">No pinned blocks yet</p>
          <p className="text-sm text-glass-muted mt-1 font-bold">
            Create blocks like "Trips", "Behind the Scenes", etc.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Save block order button */}
          {hasBlockOrderChanges && (
            <div className="flex justify-end">
              <button
                onClick={saveBlockOrder}
                disabled={savingBlockOrder}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all active:scale-95 shadow-sm",
                  savingBlockOrder
                    ? "bg-glass-surface text-glass-muted cursor-not-allowed"
                    : "bg-accent-emerald text-black shadow-lg shadow-accent-emerald/20"
                )}
              >
                {savingBlockOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Block Order...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Block Order
                  </>
                )}
              </button>
            </div>
          )}
          {groups.map((group, index) => (
            <div
              key={group.id}
              draggable
              onDragStart={() => handleBlockDragStart(group.id)}
              onDragOver={(e) => handleBlockDragOver(e, group.id)}
              onDragEnd={handleBlockDragEnd}
              className={cn(
                "bg-glass-surface border border-obsidian-rim rounded-2xl overflow-hidden shadow-sm transition-all",
                draggedBlock === group.id && "opacity-50 scale-[0.98]"
              )}
            >
              {/* Block Header */}
              <div className="flex items-center gap-4 p-4 border-b border-obsidian-rim cursor-move hover:bg-glass-surface transition-colors">
                <GripVertical className="w-5 h-5 text-glass-muted opacity-50" />

                {/* Cover */}
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-glass-surface flex-shrink-0 group/cover border border-obsidian-rim shadow-inner">
                  {group.cover_url ? (
                    <Image
                      src={getImageUrl(group.cover_url)}
                      alt={group.title || 'Block cover'}
                      fill
                      className="object-cover"
                      sizes="48px"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  {/* Cover change button */}
                  <button
                    onClick={() => coverInputRefs.current[group.id]?.click()}
                    disabled={uploadingCover === group.id}
                    className={cn(
                      "absolute inset-0 bg-black/50 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center",
                      uploadingCover === group.id && "opacity-100"
                    )}
                    title="Change cover photo"
                  >
                    {uploadingCover === group.id ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <input
                    ref={(el) => {
                      coverInputRefs.current[group.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCoverUpload(group.id, e.target.files)}
                    disabled={uploadingCover === group.id}
                  />
                </div>

                {/* Title */}
                <div className="flex-1">
                  {editingGroup === group.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="px-3 py-1.5 bg-glass-surface border border-obsidian-rim rounded-lg text-glass-primary font-bold focus:ring-2 focus:ring-accent-violet/20 outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => updateBlock(group.id, { title: editTitle })}
                        className="p-1.5 text-accent-emerald hover:bg-accent-emerald/10 rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingGroup(null)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h4 className="font-bold text-glass-primary text-base">{group.title || 'Untitled'}</h4>
                  )}
                  <p className="text-xs text-glass-muted font-bold uppercase tracking-wider mt-0.5">
                    {group.stories?.length || 0} stories
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveBlock(group.id, 'up')}
                    disabled={index === 0}
                    className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveBlock(group.id, 'down')}
                    disabled={index === groups.length - 1}
                    className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingGroup(group.id);
                      setEditTitle(group.title || '');
                    }}
                    className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteBlock(group.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stories Preview */}
              <div className="p-4">
                {group.stories && group.stories.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {group.stories.map((story) => (
                        <div
                          key={story.id}
                          draggable
                          onDragStart={() => handleStoryDragStart(group.id, story.id)}
                          onDragOver={(e) => handleStoryDragOver(e, group.id, story.id)}
                          onDragEnd={handleStoryDragEnd}
                          className={cn(
                            "relative w-16 h-20 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 group cursor-move",
                            draggedStory?.groupId === group.id && draggedStory?.storyId === story.id && "opacity-50"
                          )}
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

                          {/* Drag handle */}
                          <div className="absolute top-1 left-1 bg-black/50 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-3 h-3 text-white" />
                          </div>

                          {/* Delete overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => deleteStory(story.id, group.id)}
                              className="p-1 bg-red-500 rounded text-white"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Type indicator */}
                          {story.media_type === 'video' && (
                            <Film className="absolute top-1 right-1 w-3 h-3 text-white" />
                          )}
                        </div>
                      ))}

                      {/* Add story button */}
                      <button
                        onClick={() => fileInputRefs.current[group.id]?.click()}
                        disabled={uploading === group.id}
                        className={cn(
                          "w-16 h-20 rounded-lg border-2 border-dashed flex items-center justify-center transition-all flex-shrink-0 active:scale-95 shadow-sm",
                          uploading === group.id
                            ? "border-obsidian-rim cursor-not-allowed"
                            : "border-obsidian-rim/50 hover:border-accent-violet/50 hover:bg-accent-violet/5 cursor-pointer"
                        )}
                      >
                        {uploading === group.id ? (
                          <Loader2 className="w-5 h-5 text-glass-muted animate-spin" />
                        ) : (
                          <Plus className="w-5 h-5 text-glass-muted" />
                        )}
                      </button>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[group.id] = el;
                        }}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => handleUpload(group.id, e.target.files)}
                        disabled={uploading === group.id}
                      />
                    </div>
                    {/* Save order button */}
                    {hasOrderChanges[group.id] && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => saveStoryOrder(group.id)}
                          disabled={savingOrder === group.id}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-sm",
                            savingOrder === group.id
                              ? "bg-glass-surface text-glass-muted cursor-not-allowed"
                              : "bg-accent-emerald text-black shadow-lg shadow-accent-emerald/20"
                          )}
                        >
                          {savingOrder === group.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-3 h-3" />
                              Save Order
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <p className="text-sm text-muted-foreground text-center">
                      No stories in this block.
                    </p>
                    <button
                      onClick={() => fileInputRefs.current[group.id]?.click()}
                      disabled={uploading === group.id}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border border-obsidian-rim transition-all font-bold active:scale-95 shadow-sm",
                        uploading === group.id
                          ? "text-glass-muted cursor-not-allowed"
                          : "bg-glass-surface text-glass-primary hover:bg-glass-surface/80"
                      )}
                    >
                      {uploading === group.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">Add Story</span>
                        </>
                      )}
                    </button>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[group.id] = el;
                      }}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleUpload(group.id, e.target.files)}
                      disabled={uploading === group.id}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="fixed bottom-4 right-4 bg-glass-surface border border-obsidian-rim rounded-2xl px-4 py-3 shadow-ao-stack z-50 backdrop-blur-thick">
          <p className="text-sm text-glass-primary font-bold">{uploadProgress}</p>
        </div>
      )}

      {/* Upload indicator */}
      {uploading && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-thick flex items-center justify-center z-[110]">
          <div className="bg-glass-surface border border-obsidian-rim p-6 rounded-2xl text-center min-w-[300px] shadow-ao-stack scale-up-subtle">
            <Loader2 className="w-8 h-8 animate-spin text-accent-violet mx-auto mb-4" />
            <p className="text-glass-primary font-bold mb-1">Uploading...</p>
            {uploadProgress && (
              <p className="text-sm text-glass-muted font-bold px-4">{uploadProgress}</p>
            )}
          </div>
        </div>
      )}

      {/* Video Story Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-thick flex items-center justify-center z-[100] p-4">
          <div className="bg-glass-surface border border-obsidian-rim rounded-2xl p-6 w-full max-w-sm shadow-ao-stack space-y-6 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-glass-primary">Upload Video Story</h3>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setTargetGroupId(null);
                }}
                className="p-2 rounded-lg hover:bg-glass-surface text-glass-muted transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-glass-muted font-bold px-1">
                All 3 files are required for video stories.
              </p>

              {/* MP4 Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-glass-muted uppercase px-1">1. Main Video (MP4)</label>
                <div className={cn(
                  "border-2 border-dashed rounded-xl p-4 transition-all duration-300 cursor-pointer shadow-inner",
                  mp4File ? "border-accent-emerald bg-accent-emerald/5" : "border-obsidian-rim hover:border-accent-violet/30"
                )}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    {mp4File ? <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> : <Upload className="w-4 h-4 text-glass-muted" />}
                    <span className="text-sm text-glass-primary font-bold truncate">{mp4File ? mp4File.name : "Select MP4"}</span>
                    <input type="file" accept="video/mp4" className="hidden" onChange={(e) => setMp4File(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              {/* WebM Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-glass-muted uppercase px-1">2. Optimized Video (WebM)</label>
                <div className={cn(
                  "border-2 border-dashed rounded-xl p-4 transition-all duration-300 cursor-pointer shadow-inner",
                  webmFile ? "border-accent-emerald bg-accent-emerald/5" : "border-obsidian-rim hover:border-accent-violet/30"
                )}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    {webmFile ? <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> : <Upload className="w-4 h-4 text-glass-muted" />}
                    <span className="text-sm text-glass-primary font-bold truncate">{webmFile ? webmFile.name : "Select WebM"}</span>
                    <input type="file" accept="video/webm" className="hidden" onChange={(e) => setWebmFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              {/* WebP Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-glass-muted uppercase px-1">3. Preview Image (WebP)</label>
                <div className={cn(
                  "border-2 border-dashed rounded-xl p-4 transition-all duration-300 cursor-pointer shadow-inner",
                  webpFile ? "border-accent-emerald bg-accent-emerald/5" : "border-obsidian-rim hover:border-accent-violet/30"
                )}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    {webpFile ? <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> : <Upload className="w-4 h-4 text-glass-muted" />}
                    <span className="text-sm text-glass-primary font-bold truncate">{webpFile ? webpFile.name : "Select WebP"}</span>
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

      {/* Create Block Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-thick flex items-center justify-center z-[100] p-4">
          <div className="bg-glass-surface border border-obsidian-rim rounded-2xl p-7 w-full max-w-sm shadow-ao-stack space-y-6 overflow-hidden">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-glass-primary">New Pinned Block</h3>
              <p className="text-sm text-glass-muted font-bold">Create a new collection for stories.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-glass-primary px-1">Block Title</label>
                <input
                  type="text"
                  value={newBlockTitle}
                  onChange={(e) => setNewBlockTitle(e.target.value)}
                  placeholder='e.g. "Beach Trips"'
                  className="w-full px-4 py-3 bg-glass-surface border border-obsidian-rim rounded-xl text-glass-primary placeholder:text-glass-muted focus:ring-2 focus:ring-accent-amber/20 outline-none transition-all font-bold"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-glass-surface border border-obsidian-rim hover:bg-glass-surface/80 text-glass-primary rounded-xl transition-all font-bold active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={createBlock}
                  disabled={saving || !newBlockTitle.trim()}
                  className="flex-1 px-4 py-3 bg-accent-amber text-black rounded-xl transition-all font-bold shadow-lg shadow-accent-amber/20 disabled:opacity-50 active:scale-95"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Block'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

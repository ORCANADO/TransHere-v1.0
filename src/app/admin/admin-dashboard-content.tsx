"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const ADMIN_SECRET = "admin123"; // Hardcoded secret key

interface Model {
  id: string;
  name: string;
  slug: string;
}

interface AnalyticsEvent {
  id: string;
  model_id: string;
  event_type: string;
  created_at: string;
}

export default function AdminDashboardContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("stories");

  // Stories Manager State
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [storyType, setStoryType] = useState<"pinned" | "recent">("recent");
  const [mediaMode, setMediaMode] = useState<"image" | "video">("image");
  
  // File state for hybrid video uploading
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFileMp4, setVideoFileMp4] = useState<File | null>(null);
  const [videoFileWebm, setVideoFileWebm] = useState<File | null>(null);
  const [videoPoster, setVideoPoster] = useState<File | null>(null);
  
  const [uploading, setUploading] = useState(false);

  // Gallery Manager State
  const [galleryModel, setGalleryModel] = useState("");
  const [galleryMediaMode, setGalleryMediaMode] = useState<"image" | "video">("image");
  const [galleryImageFile, setGalleryImageFile] = useState<File | null>(null);
  const [galleryVideoMp4, setGalleryVideoMp4] = useState<File | null>(null);
  const [galleryVideoWebm, setGalleryVideoWebm] = useState<File | null>(null);
  const [galleryPoster, setGalleryPoster] = useState<File | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Authentication check
  useEffect(() => {
    const checkAuth = () => {
      const urlKey = searchParams.get("key");
      const storedKey = localStorage.getItem("admin_key");

      if (urlKey === ADMIN_SECRET || storedKey === ADMIN_SECRET) {
        if (urlKey === ADMIN_SECRET) {
          localStorage.setItem("admin_key", ADMIN_SECRET);
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [searchParams]);

  // Fetch models for dropdown
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchModels = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("models")
          .select("id, name, slug")
          .order("name");

        if (error) throw error;
        setModels(data || []);
      } catch (err) {
        console.error("Error fetching models:", err);
      }
    };

    fetchModels();
  }, [isAuthenticated]);

  // Fetch analytics data
  useEffect(() => {
    if (!isAuthenticated || activeTab !== "analytics") return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("analytics_events")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAnalyticsData(data || []);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [isAuthenticated, activeTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_SECRET) {
      localStorage.setItem("admin_key", ADMIN_SECRET);
      setIsAuthenticated(true);
      setError("");
      setPassword("");
      router.push("/admin");
    } else {
      setError("Invalid password");
    }
  };

  // Validation: check if required files are selected
  const isUploadReady = () => {
    if (!selectedModel) return false;
    if (mediaMode === "image") {
      return imageFile !== null;
    } else {
      return videoFileMp4 !== null && videoFileWebm !== null && videoPoster !== null;
    }
  };

  // Helper: upload a single file to R2 and return the key
  // contentType parameter allows explicit MIME type override for proper streaming headers
  const uploadFileToR2 = async (
    file: File,
    filename: string,
    adminKey: string,
    contentType?: string
  ): Promise<string> => {
    // Use explicit contentType if provided, otherwise fall back to file.type
    const mimeType = contentType || file.type || 'application/octet-stream';
    
    // Get presigned URL
    const presignResponse = await fetch(`/api/upload?key=${adminKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        contentType: mimeType,
      }),
    });

    if (!presignResponse.ok) {
      const err = await presignResponse.json();
      throw new Error(err.error || "Failed to get upload URL");
    }

    const { uploadUrl, key } = await presignResponse.json();

    // Upload to R2 with explicit Content-Type header for proper browser streaming
    // Cache-Control: Aggressive caching (1 year) since files are timestamped and immutable
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { 
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable"
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`R2 upload failed: ${uploadResponse.statusText}`);
    }

    return key;
  };

  // Reset all file inputs (Stories)
  const resetFileInputs = () => {
    setImageFile(null);
    setVideoFileMp4(null);
    setVideoFileWebm(null);
    setVideoPoster(null);
    
    // Reset DOM file inputs in stories section
    const storyInputs = document.querySelectorAll('[data-story-input] input[type="file"]') as NodeListOf<HTMLInputElement>;
    storyInputs.forEach((input) => (input.value = ""));
  };

  // Validation for gallery upload
  const isGalleryUploadReady = () => {
    if (!galleryModel) return false;
    if (galleryMediaMode === "image") {
      return galleryImageFile !== null;
    } else {
      return galleryVideoMp4 !== null && galleryVideoWebm !== null && galleryPoster !== null;
    }
  };

  // Reset gallery file inputs
  const resetGalleryInputs = () => {
    setGalleryImageFile(null);
    setGalleryVideoMp4(null);
    setGalleryVideoWebm(null);
    setGalleryPoster(null);
    
    // Reset DOM file inputs in gallery section
    const galleryInputs = document.querySelectorAll('[data-gallery-input] input[type="file"]') as NodeListOf<HTMLInputElement>;
    galleryInputs.forEach((input) => (input.value = ""));
  };

  const handleStoryUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isUploadReady()) {
      alert("Please select a model and all required files");
      return;
    }

    setUploading(true);
    try {
      const adminKey = localStorage.getItem("admin_key") || ADMIN_SECRET;
      
      // Generate a SINGLE timestamp for all files in this batch
      const timestamp = Date.now();
      
      let mediaUrl: string;
      let coverUrl: string;
      let mediaType: "image" | "video";
      let duration: number;

      if (mediaMode === "video") {
        // Video Mode: Upload all 3 files with the same timestamp
        if (!videoFileMp4 || !videoFileWebm || !videoPoster) {
          throw new Error("All video files are required");
        }

        // Clean the base name from the MP4 file
        const cleanName = videoFileMp4.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");
        
        // Preserve original poster extension and get correct MIME type
        const posterExt = videoPoster.name.split('.').pop()?.toLowerCase() || 'webp';
        const posterMimeType = videoPoster.type || `image/${posterExt === 'jpg' ? 'jpeg' : posterExt}`;

        // Upload all 3 files in parallel with explicit Content-Type headers for proper streaming
        const [mp4Key, webmKey, posterKey] = await Promise.all([
          uploadFileToR2(videoFileMp4, `${timestamp}-${cleanName}.mp4`, adminKey, 'video/mp4'),
          uploadFileToR2(videoFileWebm, `${timestamp}-${cleanName}.webm`, adminKey, 'video/webm'),
          uploadFileToR2(videoPoster, `${timestamp}-${cleanName}-poster.${posterExt}`, adminKey, posterMimeType),
        ]);

        // Set DB values: media_url = MP4 path, cover_url = poster path
        mediaUrl = mp4Key;
        coverUrl = posterKey;
        mediaType = "video";
        duration = 15;

        console.log("Video upload complete:", { mp4Key, webmKey, posterKey });
      } else {
        // Image Mode: Upload single image file
        if (!imageFile) {
          throw new Error("Image file is required");
        }

        const cleanName = imageFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");
        
        // Preserve original image extension and get correct MIME type
        const imageExt = imageFile.name.split('.').pop()?.toLowerCase() || 'webp';
        const imageMimeType = imageFile.type || `image/${imageExt === 'jpg' ? 'jpeg' : imageExt}`;
        
        const imageKey = await uploadFileToR2(
          imageFile,
          `${timestamp}-${cleanName}.${imageExt}`,
          adminKey,
          imageMimeType
        );

        mediaUrl = imageKey;
        coverUrl = imageKey;
        mediaType = "image";
        duration = 5;
      }

      // Save to database
      const dbResponse = await fetch(`/api/admin/stories?key=${adminKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: selectedModel,
          is_pinned: storyType === "pinned",
          title: storyType === "pinned" ? "Pinned" : null,
          media_url: mediaUrl,
          cover_url: coverUrl,
          media_type: mediaType,
          duration: duration,
        }),
      });

      const result = await dbResponse.json();

      if (!dbResponse.ok) {
        throw new Error(result.error || "Database insert failed");
      }

      alert(`${mediaMode === "video" ? "Video" : "Image"} story uploaded successfully!`);
      resetFileInputs();
      setSelectedModel("");
    } catch (err) {
      console.error("Error uploading story:", err);
      alert(`Error uploading story: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle Gallery Upload - inserts into gallery_items table
  const handleGalleryUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isGalleryUploadReady()) {
      alert("Please select a model and all required files");
      return;
    }

    setGalleryUploading(true);
    try {
      const adminKey = localStorage.getItem("admin_key") || ADMIN_SECRET;
      const timestamp = Date.now();
      
      let mediaUrl: string;
      let posterUrl: string | null = null;
      let mediaType: "image" | "video";

      if (galleryMediaMode === "video") {
        // Video Mode: Upload all 3 files
        if (!galleryVideoMp4 || !galleryVideoWebm || !galleryPoster) {
          throw new Error("All video files are required");
        }

        const cleanName = galleryVideoMp4.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");
        const posterExt = galleryPoster.name.split('.').pop()?.toLowerCase() || 'webp';
        const posterMimeType = galleryPoster.type || `image/${posterExt === 'jpg' ? 'jpeg' : posterExt}`;

        // Upload all 3 files in parallel
        const [mp4Key, , posterKey] = await Promise.all([
          uploadFileToR2(galleryVideoMp4, `gallery/${timestamp}-${cleanName}.mp4`, adminKey, 'video/mp4'),
          uploadFileToR2(galleryVideoWebm, `gallery/${timestamp}-${cleanName}.webm`, adminKey, 'video/webm'),
          uploadFileToR2(galleryPoster, `gallery/${timestamp}-${cleanName}-poster.${posterExt}`, adminKey, posterMimeType),
        ]);

        mediaUrl = mp4Key;
        posterUrl = posterKey;
        mediaType = "video";

        console.log("Gallery video upload complete:", { mp4Key, posterKey });
      } else {
        // Image Mode: Upload single image
        if (!galleryImageFile) {
          throw new Error("Image file is required");
        }

        const cleanName = galleryImageFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");
        const imageExt = galleryImageFile.name.split('.').pop()?.toLowerCase() || 'webp';
        const imageMimeType = galleryImageFile.type || `image/${imageExt === 'jpg' ? 'jpeg' : imageExt}`;
        
        const imageKey = await uploadFileToR2(
          galleryImageFile,
          `gallery/${timestamp}-${cleanName}.${imageExt}`,
          adminKey,
          imageMimeType
        );

        mediaUrl = imageKey;
        mediaType = "image";
      }

      // Insert into gallery_items table via API
      const dbResponse = await fetch(`/api/admin/gallery?key=${adminKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: galleryModel,
          media_url: mediaUrl,
          media_type: mediaType,
          poster_url: posterUrl,
        }),
      });

      const result = await dbResponse.json();

      if (!dbResponse.ok) {
        throw new Error(result.error || "Database insert failed");
      }

      alert(`Gallery ${galleryMediaMode === "video" ? "video" : "image"} added successfully!`);
      resetGalleryInputs();
      setGalleryModel("");
    } catch (err) {
      console.error("Error uploading gallery item:", err);
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setGalleryUploading(false);
    }
  };

  // Calculate analytics stats
  const totalEvents = analyticsData.length;
  const totalClicks = analyticsData.filter((e) => e.event_type === "click").length;
  const uniqueModels = new Set(analyticsData.map((e) => e.model_id)).size;

  // Group by model for bar chart
  const viewsPerModel = analyticsData
    .filter((e) => e.event_type === "view")
    .reduce((acc, e) => {
      acc[e.model_id] = (acc[e.model_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const modelNames = models.reduce((acc, m) => {
    acc[m.id] = m.name;
    return acc;
  }, {} as Record<string, string>);

  const barChartData = Object.entries(viewsPerModel).map(([modelId, count]) => ({
    name: modelNames[modelId] || modelId.slice(0, 8),
    views: count,
  }));

  // Group by date for line chart
  const trafficOverTime = analyticsData.reduce((acc, e) => {
    const date = new Date(e.created_at).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lineChartData = Object.entries(trafficOverTime)
    .map(([date, count]) => ({ date, events: count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Access Denied Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">Enter the admin password to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full">
              Authenticate
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Nebula Command Center</h1>
          <p className="text-muted-foreground">Internal dashboard for content and analytics management</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="stories" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="stories">Stories Manager</TabsTrigger>
            <TabsTrigger value="gallery">Gallery Manager</TabsTrigger>
            <TabsTrigger value="analytics">Analytics Dashboard</TabsTrigger>
          </TabsList>

          {/* Stories Manager Tab */}
          <TabsContent value="stories" className="space-y-6 mt-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-2xl font-semibold">Upload Story</h2>
              <form onSubmit={handleStoryUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Choose a model...</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Story Type</label>
                  <select
                    value={storyType}
                    onChange={(e) => setStoryType(e.target.value as "pinned" | "recent")}
                    className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="recent">Recent</option>
                    <option value="pinned">Pinned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Media Type</label>
                  <select
                    value={mediaMode}
                    onChange={(e) => {
                      setMediaMode(e.target.value as "image" | "video");
                      resetFileInputs();
                    }}
                    className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video (Hybrid Upload)</option>
                  </select>
                </div>

                {/* Image Mode: Single file input */}
                {mediaMode === "image" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Image File</label>
                    <input
                      type="file"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      accept="image/*"
                      className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {imageFile && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Selected: {imageFile.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Video Mode: 3 file inputs */}
                {mediaMode === "video" && (
                  <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      Upload all 3 files for optimal cross-browser video playback.
                    </p>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        MP4 Video <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setVideoFileMp4(e.target.files?.[0] || null)}
                        accept="video/mp4"
                        className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {videoFileMp4 && (
                        <p className="mt-1 text-xs text-green-500">✓ {videoFileMp4.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        WebM Video <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setVideoFileWebm(e.target.files?.[0] || null)}
                        accept="video/webm"
                        className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {videoFileWebm && (
                        <p className="mt-1 text-xs text-green-500">✓ {videoFileWebm.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Cover Image (Poster) <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setVideoPoster(e.target.files?.[0] || null)}
                        accept="image/*"
                        className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {videoPoster && (
                        <p className="mt-1 text-xs text-green-500">✓ {videoPoster.name}</p>
                      )}
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={uploading || !isUploadReady()} 
                  className="w-full"
                >
                  {uploading 
                    ? `Uploading ${mediaMode === "video" ? "Video Files" : "Image"}...` 
                    : `Upload ${mediaMode === "video" ? "Video Story" : "Image Story"}`}
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* Gallery Manager Tab */}
          <TabsContent value="gallery" className="space-y-6 mt-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="text-2xl font-semibold">Upload Gallery Item</h2>
              <p className="text-sm text-muted-foreground">
                Add images or videos to a model&apos;s profile gallery. Videos support hybrid WebM/MP4 for optimal playback.
              </p>
              <form onSubmit={handleGalleryUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Model</label>
                  <select
                    value={galleryModel}
                    onChange={(e) => setGalleryModel(e.target.value)}
                    className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Choose a model...</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Media Type</label>
                  <select
                    value={galleryMediaMode}
                    onChange={(e) => {
                      setGalleryMediaMode(e.target.value as "image" | "video");
                      resetGalleryInputs();
                    }}
                    className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video (Hybrid Upload)</option>
                  </select>
                </div>

                {/* Image Mode: Single file input */}
                {galleryMediaMode === "image" && (
                  <div data-gallery-input>
                    <label className="block text-sm font-medium mb-2">Image File</label>
                    <input
                      type="file"
                      onChange={(e) => setGalleryImageFile(e.target.files?.[0] || null)}
                      accept="image/*"
                      className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {galleryImageFile && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Selected: {galleryImageFile.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Video Mode: 3 file inputs */}
                {galleryMediaMode === "video" && (
                  <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30" data-gallery-input>
                    <p className="text-sm text-muted-foreground">
                      Upload all 3 files for optimal cross-browser video playback.
                    </p>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        MP4 Video <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setGalleryVideoMp4(e.target.files?.[0] || null)}
                        accept="video/mp4"
                        className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {galleryVideoMp4 && (
                        <p className="mt-1 text-xs text-green-500">✓ {galleryVideoMp4.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        WebM Video <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setGalleryVideoWebm(e.target.files?.[0] || null)}
                        accept="video/webm"
                        className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {galleryVideoWebm && (
                        <p className="mt-1 text-xs text-green-500">✓ {galleryVideoWebm.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Cover Image (Poster) <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setGalleryPoster(e.target.files?.[0] || null)}
                        accept="image/*"
                        className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {galleryPoster && (
                        <p className="mt-1 text-xs text-green-500">✓ {galleryPoster.name}</p>
                      )}
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={galleryUploading || !isGalleryUploadReady()} 
                  className="w-full"
                >
                  {galleryUploading 
                    ? `Uploading ${galleryMediaMode === "video" ? "Video Files" : "Image"}...` 
                    : `Add ${galleryMediaMode === "video" ? "Video" : "Image"} to Gallery`}
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* Analytics Dashboard Tab */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Events</h3>
                <p className="text-3xl font-bold">{totalEvents}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Clicks</h3>
                <p className="text-3xl font-bold">{totalClicks}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Models</h3>
                <p className="text-3xl font-bold">{uniqueModels}</p>
              </div>
            </div>

            {/* Charts */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
            ) : (
              <div className="space-y-6">
                {/* Bar Chart - Views per Model */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">Views per Model</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="views" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Line Chart - Traffic over Time */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">Traffic over Time</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="events" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

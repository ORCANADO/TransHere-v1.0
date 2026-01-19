// 1. New Story interfaces
export interface Story {
  id: string;
  group_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  duration: number;
  created_at: string;
  posted_date: string; // The date manageable by devs
}

export interface StoryGroup {
  id: string;
  model_id: string;
  title: string | null; // Null means "Recent Stories"
  cover_url: string;
  is_pinned: boolean;
  created_at: string;
  stories?: Story[]; // Nested array for joined queries
}

// 2. Gallery Item interface (Hybrid Video Support)
export interface GalleryItem {
  id: string;
  model_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  poster_url: string | null; // Video thumbnail/cover
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
}

// 3. Updated Model interface (Keeps everything and adds stories + gallery_items)
export interface Model {
  id: string;
  name: string;
  image_url: string;
  tags: string[];
  slug: string;
  gallery_items?: GalleryItem[]; // Hybrid video gallery support
  is_verified: boolean;
  is_new: boolean;
  is_pinned: boolean;
  bio?: string;
  bio_es?: string | null;
  social_link?: string;
  // Stories linked to the model
  story_groups?: StoryGroup[];
}

// Analytics types
export * from './analytics';

// Tracking types
export * from './tracking';

// Charts types (contains legacy filter types)
export * from './charts';

// Aggregated Analytics types (contains new dashboard types)
// We list types explicitly to avoid collisions with './charts'
export type {
  DailyStats,
  DailyStatsAggregated,
  HourlyStats,
  SourceSummary,
  ModelSummary,
  CountrySummary,
  RefreshStatus,
  SystemConfig,
  DashboardStats,
  ChartDataPoint,
  DashboardResponse,
  RefreshViewsResponse,
  DashboardQueryParams,
  AggregatedDashboardFilters // We'll rename this in the source file
} from './analytics-aggregated';

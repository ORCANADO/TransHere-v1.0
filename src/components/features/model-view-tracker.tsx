'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';

interface ModelViewTrackerProps {
  modelId: string;
  modelSlug?: string;
}

export function ModelViewTracker({ modelId, modelSlug }: ModelViewTrackerProps) {
  const { trackView } = useAnalytics();

  useEffect(() => {
    trackView({
      modelId,
      modelSlug,
      pagePath: modelSlug ? `/model/${modelSlug}` : undefined,
    });
  }, [modelId, modelSlug, trackView]);

  return null;
}


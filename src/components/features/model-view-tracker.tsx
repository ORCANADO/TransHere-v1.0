'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';

interface ModelViewTrackerProps {
  modelId: string;
}

export function ModelViewTracker({ modelId }: ModelViewTrackerProps) {
  const { trackView } = useAnalytics();

  useEffect(() => {
    trackView(modelId);
  }, [modelId, trackView]);

  return null;
}


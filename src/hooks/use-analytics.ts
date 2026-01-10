'use client';
import { useCallback } from 'react';

type ClickType = 'social' | 'content';

export function useAnalytics() {
  const sendEvent = async (modelId: string, eventType: string) => {
    try {
      // Use absolute URL to avoid routing issues
      const apiUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/api/analytics`
        : '/api/analytics';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelId, eventType }),
      });

      if (!response.ok) {
        throw new Error(`Analytics API returned ${response.status}`);
      }
    } catch (e) {
      // Silently fail - analytics should never crash the app
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Analytics failed', e);
      }
    }
  };

  const trackView = useCallback(async (modelId: string) => {
    await sendEvent(modelId, 'view');
  }, []);

  const trackClick = useCallback(async (modelId: string, type: ClickType) => {
    const eventType = type === 'social' ? 'click_social' : 'click_content';
    await sendEvent(modelId, eventType);
  }, []);

  return { trackView, trackClick };
}
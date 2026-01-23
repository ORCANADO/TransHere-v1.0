'use client';
import { useCallback } from 'react';
import { usePathname } from 'next/navigation';

type ClickType = 'social' | 'content';

interface AnalyticsParams {
  modelId?: string;
  modelSlug?: string;
  pagePath?: string;
}

export function useAnalytics() {
  const pathname = usePathname();

  const sendEvent = useCallback(async (
    eventType: string,
    params?: AnalyticsParams
  ) => {
    try {
      // Use absolute URL to avoid routing issues
      const apiUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/analytics`
        : '/api/analytics';

      // Get page path from params or use current pathname
      const pagePath = params?.pagePath || pathname || '/';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId: params?.modelId,
          modelSlug: params?.modelSlug,
          eventType,
          pagePath,
        }),
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
  }, [pathname]);

  const trackView = useCallback(async (params?: AnalyticsParams) => {
    await sendEvent('page_view', params);
  }, [sendEvent]);

  const trackClick = useCallback(async (type: ClickType, params?: AnalyticsParams) => {
    // Standardize all clicks to 'link_click' for database consistency
    await sendEvent('link_click', params);
  }, [sendEvent]);

  return { trackView, trackClick };
}
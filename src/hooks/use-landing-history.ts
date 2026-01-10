'use client';

import { useEffect } from 'react';

/**
 * Hook to handle "History Injection" for deep links.
 * 
 * IMPORTANT: This is a best-effort feature. Browser history manipulation
 * is unreliable with Next.js App Router. This hook uses multiple strategies
 * to maximize the chance of working.
 * 
 * @param parentPath - The URL to navigate to on "Back" (default: '/')
 */
export function useLandingHistory(parentPath: string = '/'): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Skip if already on the parent path
    if (window.location.pathname === parentPath) return;

    // Check if this is an external landing (no internal referrer)
    const referrer = document.referrer;
    const isExternalLanding = !referrer || !referrer.startsWith(window.location.origin);
    
    // Also check if Next.js navigation state exists (indicates internal nav)
    const hasNextState = window.history.state?.key || window.history.state?.__NEXT_INIT__;
    
    console.log('[LandingHistory] Check:', { 
      isExternalLanding,
      hasNextState,
      pathname: window.location.pathname,
      historyLength: window.history.length
    });

    // Only proceed if external landing AND no Next.js navigation state
    if (!isExternalLanding) return;

    const landingUrl = window.location.href;
    
    // Strategy: Push home first, then push current page
    // This creates: [whatever] -> [home] -> [current]
    // So back goes to home
    
    // Wait for Next.js to finish its setup
    const setupTimer = setTimeout(() => {
      console.log('[LandingHistory] Applying history injection');
      
      // Push the parent path, then immediately push current back
      window.history.pushState({ __landing_parent: true }, '', parentPath);
      window.history.pushState({ __landing_child: true }, '', landingUrl);
      
      console.log('[LandingHistory] Done. New length:', window.history.length);
    }, 100);

    // Global handler for popstate
    const onPopState = () => {
      // If URL is now at parent path, force full navigation
      if (window.location.pathname === parentPath) {
        console.log('[LandingHistory] At parent, navigating...');
        window.location.href = parentPath;
      }
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      clearTimeout(setupTimer);
      window.removeEventListener('popstate', onPopState);
    };
  }, [parentPath]);
}

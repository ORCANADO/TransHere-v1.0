'use client';

import { useState, useCallback, useRef } from 'react';

interface ShareOptions {
  title?: string;
  text?: string;
  url: string;
}

interface CopyAndGoOptions {
  delay?: number;
}

interface UseShareReturn {
  share: (options: ShareOptions) => Promise<boolean>;
  copyAndGo: (deepLink: string, externalUrl: string, options?: CopyAndGoOptions) => Promise<void>;
  isCopied: boolean;
  isCopiedAndGo: boolean;
}

const FEEDBACK_DURATION = 2000;

export function useShare(): UseShareReturn {
  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedAndGo, setIsCopiedAndGo] = useState(false);
  
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copiedAndGoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const share = useCallback(async (options: ShareOptions): Promise<boolean> => {
    // Clear any existing timeout
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }

    // Try native share first (mobile)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        return true;
      } catch (error) {
        // User cancelled or share failed - fall through to clipboard
        if ((error as Error).name === 'AbortError') {
          return false;
        }
      }
    }

    // Fallback to clipboard (desktop)
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(options.url);
        setIsCopied(true);
        
        copiedTimeoutRef.current = setTimeout(() => {
          setIsCopied(false);
        }, FEEDBACK_DURATION);
        
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }, []);

  const copyAndGo = useCallback(async (deepLink: string, externalUrl: string, options?: CopyAndGoOptions): Promise<void> => {
    // Clear any existing timeout
    if (copiedAndGoTimeoutRef.current) {
      clearTimeout(copiedAndGoTimeoutRef.current);
    }

    // Set copied state for UI feedback
    setIsCopiedAndGo(true);
    
    copiedAndGoTimeoutRef.current = setTimeout(() => {
      setIsCopiedAndGo(false);
    }, FEEDBACK_DURATION);

    // First, await clipboard write
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(deepLink);
      } catch {
        // Silent fail - conversion is more important than clipboard
      }
    }

    // Next, await perception delay if provided (allows UI to update before tab switch)
    if (options?.delay && options.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }

    // Finally, open external URL in new tab
    window.open(externalUrl, '_blank', 'noopener,noreferrer');
  }, []);

  return {
    share,
    copyAndGo,
    isCopied,
    isCopiedAndGo,
  };
}

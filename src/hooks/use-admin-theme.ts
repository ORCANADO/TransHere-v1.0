'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const STORAGE_KEY = 'admin-theme-preference';

/**
 * Custom hook for managing admin dashboard theme.
 * Syncs next-themes state with the iOS 26 Liquid Glass system.
 */
export function useAdminTheme() {
    const { theme, setTheme, resolvedTheme } = useTheme();

    // Sync specific localStorage key for admin
    useEffect(() => {
        const savedTheme = localStorage.getItem(STORAGE_KEY);
        if (savedTheme && savedTheme !== theme) {
            setTheme(savedTheme as string);
        }
    }, []);

    useEffect(() => {
        const isLight = resolvedTheme === 'light';
        const rootElement = document.querySelector('.admin-theme-root');

        if (rootElement) {
            rootElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
            if (isLight) {
                rootElement.classList.add('admin-light');
            } else {
                rootElement.classList.remove('admin-light');
            }
        }

        // Persist to admin-specific key
        if (resolvedTheme) {
            localStorage.setItem(STORAGE_KEY, resolvedTheme);
        }
    }, [resolvedTheme]);

    return {
        theme,
        resolvedTheme,
        setTheme,
        isLightMode: resolvedTheme === 'light',
        isDarkMode: resolvedTheme === 'dark',
    };
}

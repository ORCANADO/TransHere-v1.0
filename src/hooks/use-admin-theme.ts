// ============================================
// TRANSHERE v1.1 - ADMIN THEME HOOK
// Manages light/dark mode toggle with persistence
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Theme options for admin dashboard
 */
export type AdminTheme = 'dark' | 'light';

/**
 * LocalStorage key for theme persistence
 */
const THEME_STORAGE_KEY = 'transhere-admin-theme';

/**
 * Body class applied when light mode is active
 */
const LIGHT_MODE_CLASS = 'admin-light-mode';

/**
 * Transition class for smooth theme switching
 */
const TRANSITION_CLASS = 'theme-transitioning';

/**
 * Custom hook for managing admin dashboard theme.
 * 
 * Features:
 * - Persists theme preference to localStorage
 * - Applies theme class to document body
 * - Handles hydration gracefully
 * - Provides smooth transition on theme change
 * 
 * @returns Theme state and toggle functions
 */
export function useAdminTheme() {
    // Initialize with null to handle hydration
    const [theme, setTheme] = useState<AdminTheme | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    /**
     * Load theme from localStorage on mount
     */
    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        const stored = localStorage.getItem(THEME_STORAGE_KEY) as AdminTheme | null;
        const initialTheme: AdminTheme = stored === 'light' ? 'light' : 'dark';

        setTheme(initialTheme);
        setIsHydrated(true);

        // Apply initial theme class without transition
        if (initialTheme === 'light') {
            document.body.classList.add(LIGHT_MODE_CLASS);
        }
    }, []);

    /**
     * Apply theme class to body when theme changes
     */
    useEffect(() => {
        if (!isHydrated || theme === null) return;

        // Add transition class for smooth color change
        document.body.classList.add(TRANSITION_CLASS);

        // Apply or remove light mode class
        if (theme === 'light') {
            document.body.classList.add(LIGHT_MODE_CLASS);
        } else {
            document.body.classList.remove(LIGHT_MODE_CLASS);
        }

        // Remove transition class after animation completes
        const timeoutId = setTimeout(() => {
            document.body.classList.remove(TRANSITION_CLASS);
        }, 300); // Match CSS transition duration

        // Persist to localStorage
        localStorage.setItem(THEME_STORAGE_KEY, theme);

        return () => clearTimeout(timeoutId);
    }, [theme, isHydrated]);

    /**
     * Toggle between light and dark themes
     */
    const toggleTheme = useCallback(() => {
        setTheme(current => (current === 'light' ? 'dark' : 'light'));
    }, []);

    /**
     * Set theme to a specific value
     */
    const setThemeTo = useCallback((newTheme: AdminTheme) => {
        setTheme(newTheme);
    }, []);

    /**
     * Check if current theme is light mode
     */
    const isLightMode = theme === 'light';

    /**
     * Check if current theme is dark mode
     */
    const isDarkMode = theme === 'dark';

    return {
        theme,
        isLightMode,
        isDarkMode,
        isHydrated,
        toggleTheme,
        setTheme: setThemeTo,
    };
}

/**
 * Get the current theme from localStorage (for server components)
 * Returns 'dark' as default if not set
 */
export function getStoredTheme(): AdminTheme {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark';
}

'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Body class applied when light mode is active (for legacy admin-theme.css support)
 */
const LIGHT_MODE_CLASS = 'admin-light-mode';

/**
 * Custom hook for managing admin dashboard theme.
 * Syncs next-themes state with the legacy .admin-light-mode class.
 */
export function useAdminTheme() {
    const { theme, setTheme, resolvedTheme } = useTheme();

    useEffect(() => {
        const isLight = resolvedTheme === 'light';

        if (isLight) {
            document.body.classList.add(LIGHT_MODE_CLASS);
        } else {
            document.body.classList.remove(LIGHT_MODE_CLASS);
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

'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Class applied to .liquid-glass-root when light mode is active
 */
const LIGHT_MODE_CLASS = 'liquid-light';

/**
 * Custom hook for managing admin dashboard theme.
 * Syncs next-themes state with the iOS 26 Liquid Glass system.
 */
export function useAdminTheme() {
    const { theme, setTheme, resolvedTheme } = useTheme();

    useEffect(() => {
        const isLight = resolvedTheme === 'light';
        const rootElement = document.querySelector('.liquid-glass-root');

        if (rootElement) {
            if (isLight) {
                rootElement.classList.add(LIGHT_MODE_CLASS);
            } else {
                rootElement.classList.remove(LIGHT_MODE_CLASS);
            }
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

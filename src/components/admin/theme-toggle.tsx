// ============================================
// TRANSHERE v1.1 - THEME TOGGLE COMPONENT
// iOS-style toggle switch for admin theme
// ============================================

import { useState, useEffect } from 'react';

import { Moon, Sun } from 'lucide-react';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
    /** Additional CSS classes */
    className?: string;
    /** Show labels next to icons */
    showLabels?: boolean;
    /** Compact mode (smaller size) */
    compact?: boolean;
}

/**
 * Theme toggle switch component.
 * 
 * Design: iOS 26-style toggle with smooth transitions
 * and liquid glass button aesthetic.
 */
export function ThemeToggle({
    className,
    showLabels = false,
    compact = false
}: ThemeToggleProps) {
    const { isLightMode, setTheme } = useAdminTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Don't render interactive element until hydrated
    if (!mounted) {
        return (
            <div
                className={cn(
                    "flex items-center gap-2 rounded-xl p-1",
                    "bg-glass-surface/30 border border-obsidian-rim",
                    compact ? "h-8" : "h-10",
                    className
                )}
            >
                <div className={cn(
                    "rounded-lg bg-glass-surface animate-pulse",
                    compact ? "w-16 h-6" : "w-20 h-8"
                )} />
            </div>
        );
    }

    return (
        <div className={cn(
            "inline-flex p-1 rounded-full",
            "bg-[#353839]/60 border border-[#555D50]",
            "data-[theme=light]:bg-white/60 data-[theme=light]:border-[#CED9EF]/60",
            className
        )} data-theme={isLightMode ? 'light' : 'dark'}>
            {/* Dark Mode Button */}
            <button
                onClick={() => setTheme('dark')}
                className={cn(
                    "px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all duration-150",
                    !isLightMode
                        ? "bg-[#5B4965]/50 text-[#E2DFD2]"
                        : "text-[#9E9E9E] hover:text-[#E2DFD2] data-[theme=light]:text-[#6B6B7B]"
                )}
                data-theme={isLightMode ? 'light' : 'dark'}
                aria-pressed={!isLightMode}
            >
                <Moon className="w-4 h-4" />
                {showLabels && <span>Dark</span>}
            </button>

            {/* Light Mode Button */}
            <button
                onClick={() => setTheme('light')}
                className={cn(
                    "px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all duration-150",
                    isLightMode
                        ? "bg-[#EFC8DF]/50 text-[#2E293A]"
                        : "text-[#9E9E9E] hover:text-[#E2DFD2] data-[theme=light]:text-[#6B6B7B]"
                )}
                data-theme={isLightMode ? 'light' : 'dark'}
                aria-pressed={isLightMode}
            >
                <Sun className="w-4 h-4" />
                {showLabels && <span>Light</span>}
            </button>
        </div>
    );
}

/**
 * Simple icon-only theme toggle button.
 * For use in compact headers or toolbars.
 */
export function ThemeToggleIcon({ className }: { className?: string }) {
    const { isLightMode, setTheme } = useAdminTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div
                className={cn(
                    "w-9 h-9 rounded-lg bg-white/5 animate-pulse",
                    className
                )}
            />
        );
    }

    return (
        <button
            onClick={() => setTheme(isLightMode ? 'dark' : 'light')}
            className={cn(
                "p-2 rounded-lg transition-all duration-200",
                "hover:bg-glass-surface active:scale-95",
                "text-glass-muted hover:text-glass-primary",
                className
            )}
            aria-label={isLightMode ? "Switch to dark mode" : "Switch to light mode"}
        >
            {isLightMode ? (
                <Moon className="w-5 h-5" />
            ) : (
                <Sun className="w-5 h-5" />
            )}
        </button>
    );
}

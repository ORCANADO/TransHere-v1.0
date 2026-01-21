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
                    "bg-white/5 border border-white/10",
                    compact ? "h-8" : "h-10",
                    className
                )}
            >
                <div className={cn(
                    "rounded-lg bg-white/10 animate-pulse",
                    compact ? "w-16 h-6" : "w-20 h-8"
                )} />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "flex items-center gap-1 rounded-xl p-1",
                "liquid-glass-subtle",
                className
            )}
        >
            {/* Dark Mode Button */}
            <button
                onClick={() => setTheme('dark')}
                className={cn(
                    "flex items-center gap-2 rounded-lg px-3 font-medium transition-all duration-200",
                    compact ? "py-1 text-xs" : "py-1.5 text-sm",
                    !isLightMode
                        ? "bg-[#7A27FF] text-white shadow-lg shadow-[#7A27FF]/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
                aria-pressed={!isLightMode}
                aria-label="Switch to dark mode"
            >
                <Moon className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
                {showLabels && <span>Dark</span>}
            </button>

            {/* Light Mode Button */}
            <button
                onClick={() => setTheme('light')}
                className={cn(
                    "flex items-center gap-2 rounded-lg px-3 font-medium transition-all duration-200",
                    compact ? "py-1 text-xs" : "py-1.5 text-sm",
                    isLightMode
                        ? "bg-white text-gray-900 shadow-lg"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
                aria-pressed={isLightMode}
                aria-label="Switch to light mode"
            >
                <Sun className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
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
                "hover:bg-white/10 active:scale-95",
                "text-muted-foreground hover:text-foreground",
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

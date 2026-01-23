'use client';

import { useState, useEffect } from 'react';
import { Settings, ChevronDown, Plus, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMaterialFlux } from '@/hooks/use-material-flux';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { ThemeToggle } from '@/components/admin/theme-toggle';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface SidebarSettingsProps {
    onAddModel: () => void;
}

const SETTINGS_COLLAPSE_KEY = 'transhere-admin-settings-collapsed';

export function SidebarSettings({ onAddModel }: SidebarSettingsProps) {
    const { isLightMode, setTheme } = useAdminTheme();
    const [isOpen, setIsOpen] = useState(false);
    const fluxRef = useMaterialFlux<HTMLDivElement>();
    const [mounted, setMounted] = useState(false);

    // Persist state
    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem(SETTINGS_COLLAPSE_KEY);
        if (saved !== null) {
            setIsOpen(JSON.parse(saved));
        }
    }, []);

    const handleToggle = (open: boolean) => {
        setIsOpen(open);
        localStorage.setItem(SETTINGS_COLLAPSE_KEY, JSON.stringify(open));
    };

    if (!mounted) return null;

    return (
        <div
            ref={fluxRef}
            className={cn(
                "mt-auto border-t px-3 py-3",
                "border-[#555D50]/50",
                "data-[theme=light]:border-[#CED9EF]/50"
            )}
            data-theme={isLightMode ? 'light' : 'dark'}
        >
            <Collapsible open={isOpen} onOpenChange={handleToggle}>
                <CollapsibleTrigger asChild>
                    <button className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group",
                        "text-[#9E9E9E] hover:text-[#E2DFD2]",
                        "hover:bg-[#5B4965]/20",
                        "data-[theme=light]:text-[#6B6B7B]",
                        "data-[theme=light]:hover:text-[#2E293A]",
                        "data-[theme=light]:hover:bg-[#EFC8DF]/15"
                    )} data-theme={isLightMode ? 'light' : 'dark'}>
                        <div className="flex items-center gap-3">
                            <Settings className="w-5 h-5" />
                            <span className="font-medium">Settings</span>
                        </div>
                        <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            isOpen && "rotate-180"
                        )} />
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="px-4 pb-4 space-y-4">
                    {/* Theme Selector */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest text-glass-muted font-bold px-1 opacity-70">Appearance</p>
                        <ThemeToggle showLabels className="w-full bg-glass-surface/50 border-obsidian-rim" />
                    </div>

                    {/* Add New Model Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "w-full justify-start gap-2 transition-all rounded-xl border-obsidian-rim",
                            "bg-glass-surface font-bold text-xs",
                            "hover:bg-accent-violet/10 hover:text-accent-violet",
                            "text-glass-primary",
                            "active:scale-[0.98]"
                        )}
                        onClick={onAddModel}
                    >
                        <Plus className="w-4 h-4" />
                        Add New Model
                    </Button>

                    <div className="pt-2">
                        <p className={cn(
                            "text-[10px] text-[var(--text-obsidian-muted)]/40 liquid-light:text-[var(--text-irid-primary)]/30 font-mono uppercase tracking-wider text-center",
                            "[font-variation-settings:'opsz'_18,'wdth'_110]"
                        )}>
                            Dashboard v1.1
                        </p>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { Settings, ChevronDown, Plus, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        <div className="border-t border-obsidian-rim bg-glass-void transition-colors">
            <Collapsible open={isOpen} onOpenChange={handleToggle}>
                <CollapsibleTrigger asChild>
                    <button className={cn(
                        "flex items-center justify-between w-full p-4 transition-all group",
                        "hover:bg-glass-surface/50",
                        "active:scale-[0.99]"
                    )}>
                        <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-glass-muted group-hover:text-accent-violet transition-colors" />
                            <span className="font-bold text-sm text-glass-primary">Settings</span>
                        </div>
                        <ChevronDown className={cn(
                            "w-4 h-4 text-glass-muted transition-transform duration-200",
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
                        <p className="text-[10px] text-glass-muted font-mono uppercase tracking-wider text-center opacity-40">
                            Dashboard v1.1
                        </p>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

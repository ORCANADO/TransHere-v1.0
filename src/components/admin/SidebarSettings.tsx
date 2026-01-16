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
    const { isLightMode, toggleTheme, isHydrated } = useAdminTheme();
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
        <div className="border-t border-[#E5E5EA] dark:border-white/10 bg-[#F9F9FB] dark:bg-transparent">
            <Collapsible open={isOpen} onOpenChange={handleToggle}>
                <CollapsibleTrigger asChild>
                    <button className={cn(
                        "flex items-center justify-between w-full p-4 transition-all group",
                        "hover:bg-[#E8E8ED] dark:hover:bg-white/5",
                        "active:scale-[0.99]"
                    )}>
                        <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-[#86868B] dark:text-gray-400 group-hover:text-[#007AFF] dark:group-hover:text-[#7A27FF] transition-colors" />
                            <span className="font-semibold text-sm text-[#1D1D1F] dark:text-white">Settings</span>
                        </div>
                        <ChevronDown className={cn(
                            "w-4 h-4 text-[#86868B] dark:text-gray-400 transition-transform duration-200",
                            isOpen && "rotate-180"
                        )} />
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="px-4 pb-4 space-y-4">
                    {/* Theme Selector */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest text-[#86868B] font-bold px-1">Appearance</p>
                        <ThemeToggle showLabels className="w-full bg-[#E8E8ED] dark:bg-white/5 border border-transparent dark:border-white/10" />
                    </div>

                    {/* Add New Model Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "w-full justify-start gap-2 transition-all",
                            "bg-[#E8E8ED] dark:bg-white/5",
                            "border-0 dark:border dark:border-white/10",
                            "hover:bg-[#007AFF]/10 hover:text-[#007AFF] dark:hover:bg-[#7A27FF]/10 dark:hover:text-[#7A27FF]",
                            "text-[#1D1D1F] dark:text-white",
                            "active:scale-[0.98]"
                        )}
                        onClick={onAddModel}
                    >
                        <Plus className="w-4 h-4" />
                        Add New Model
                    </Button>

                    <div className="pt-2">
                        <p className="text-[10px] text-[#86868B] dark:text-gray-600 font-mono uppercase tracking-wider text-center">
                            TransHere Admin v1.1
                        </p>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

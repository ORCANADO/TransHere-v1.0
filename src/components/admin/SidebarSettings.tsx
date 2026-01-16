'use client';

import { useState, useEffect } from 'react';
import { Settings, ChevronDown, Plus, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
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
        <div className="border-t border-white/10">
            <Collapsible open={isOpen} onOpenChange={handleToggle}>
                <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full p-4 hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span className="font-medium text-sm">Settings</span>
                        </div>
                        <ChevronDown className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform duration-200",
                            isOpen && "rotate-180"
                        )} />
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="px-4 pb-4 space-y-4">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                            {isLightMode ? (
                                <Sun className="w-4 h-4 text-yellow-500" />
                            ) : (
                                <Moon className="w-4 h-4 text-[#7A27FF]" />
                            )}
                            <span className="text-sm text-muted-foreground">Dark Mode</span>
                        </div>
                        <Switch
                            checked={!isLightMode}
                            onCheckedChange={toggleTheme}
                            disabled={!isHydrated}
                        />
                    </div>

                    {/* Add New Model Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 bg-white/5 border-white/10 hover:bg-[#7A27FF]/20 hover:border-[#7A27FF]/30 transition-all"
                        onClick={onAddModel}
                    >
                        <Plus className="w-4 h-4" />
                        Add New Model
                    </Button>

                    <div className="pt-2">
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider text-center opacity-50">
                            TransHere Admin v1.1
                        </p>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

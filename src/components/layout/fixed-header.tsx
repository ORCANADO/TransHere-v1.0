'use client';

import { useQueryState } from 'nuqs';
import { MapPin, Sparkles, Heart, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FixedHeaderProps {
  userCity: string;
  nav: {
    near: string;
    new: string;
    favorites: string;
  };
  header: {
    modelsNear: string;
    unknownCity: string;
  };
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}

export function FixedHeader({ userCity, nav, header }: FixedHeaderProps) {
  // Use nuqs to manage URL state
  const [feed, setFeed] = useQueryState('feed', { defaultValue: 'near' });

  // Check if city is "You" or "Unknown" (case-insensitive)
  const isYou = userCity.toLowerCase() === 'you' || userCity === 'Unknown';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col bg-black/80 backdrop-blur-md border-b border-white/10">
      {/* Top Row: Brand Name */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold tracking-tighter text-white">
          Tran<span className="text-pink-500">Spot</span>
        </h1>
        {feed === 'near' && (
          <span className="text-xs font-medium text-neutral-400 flex items-center gap-1">
            <MapPin size={12} />
            {isYou ? (
              `${header.modelsNear} ${header.unknownCity}`
            ) : (
              <>
                {header.modelsNear} <span className="capitalize">{userCity}</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Bottom Row: Navigation Tabs */}
      <div className="flex w-full px-2 pb-2">
        <NavButton
          active={feed === 'near'}
          onClick={() => setFeed('near')}
          icon={MapPin}
          label={nav.near}
        />
        <NavButton
          active={feed === 'new'}
          onClick={() => setFeed('new')}
          icon={Sparkles}
          label={nav.new}
        />
        <NavButton
          active={feed === 'favorites'}
          onClick={() => setFeed('favorites')}
          icon={Heart}
          label={nav.favorites}
        />
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
        active ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white'
      )}
    >
      <Icon size={16} className={active ? 'fill-current' : ''} />
      {label}
    </button>
  );
}


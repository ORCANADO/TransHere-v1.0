'use client';

import { useState, useEffect } from 'react';

interface ScarcityBlockProps {
  city: string;
  scarcity: {
    title: string;
    subtitle: string;
    cta: string;
  };
}

export function ScarcityBlock({ city, scarcity }: ScarcityBlockProps) {
  const [isLocked, setIsLocked] = useState(false);
  const cityName = city === 'Unknown' ? 'your area' : city;

  // Transition from loading to locked after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLocked(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative mt-4 w-full py-8 text-center">
      {/* Background: Blurred Cards with glass effect */}
      <div className="grid grid-cols-2 gap-3 opacity-30 blur-sm pointer-events-none select-none">
        {[1, 2, 3, 4].map((i: number) => (
          <div key={i} className="aspect-[3/4] bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl animate-pulse" />
        ))}
      </div>

      {/* Foreground: Glass Panel Message */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="bg-background/70 backdrop-blur-2xl border border-white/15 px-8 py-5 rounded-3xl shadow-2xl shadow-black/30">
          {!isLocked ? (
            <>
              <p className="text-sm font-medium text-foreground/90">
                Scanning {cityName}...
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Searching for verified profiles...
              </p>
              <div className="mt-3 h-1.5 w-28 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                <div className="h-full w-1/2 bg-[#00FF85] animate-pulse shadow-[0_0_12px_rgba(0,255,133,0.6)]" />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground/90">
                {scarcity.title}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {scarcity.subtitle} <span className="capitalize">{cityName}</span>.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {scarcity.cta}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


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
      {/* Background: Blurred Cards */}
      <div className="grid grid-cols-2 gap-3 opacity-20 blur-sm pointer-events-none select-none">
        {[1, 2, 3, 4].map((i: number) => (
          <div key={i} className="aspect-[3/4] bg-neutral-800 rounded-xl animate-pulse" />
        ))}
      </div>

      {/* Foreground: Message */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="bg-neutral-900/90 border border-white/10 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl">
          {!isLocked ? (
            <>
              <p className="text-sm font-medium text-neutral-300">
                Scanning {cityName}...
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                Searching for verified profiles...
              </p>
              <div className="mt-3 h-1 w-24 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-[#00FF85] animate-pulse shadow-[0_0_8px_rgba(0,255,133,0.5)]" />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-neutral-300">
                {scarcity.title}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                {scarcity.subtitle} <span className="capitalize">{cityName}</span>.
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                {scarcity.cta}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


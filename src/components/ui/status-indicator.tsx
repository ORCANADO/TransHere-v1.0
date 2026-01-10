"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  isOnline?: boolean;
  className?: string;
}

export function StatusIndicator({ isOnline, className }: StatusIndicatorProps) {
  const [status, setStatus] = useState<"online" | "offline" | null>(null);

  useEffect(() => {
    // If isOnline is provided, use it directly; otherwise fallback to random logic
    if (isOnline !== undefined) {
      setStatus(isOnline ? "online" : "offline");
    } else {
      const randomOnline = Math.random() < 0.7;
      setStatus(randomOnline ? "online" : "offline");
    }
  }, [isOnline]);

  if (status === null) {
    return (
      <span className="relative flex h-4 w-4 p-0.5 rounded-full bg-black/30 backdrop-blur-sm">
        <span className="relative inline-flex h-full w-full rounded-full bg-transparent" />
      </span>
    );
  }

  return (
    <span className="relative flex h-4 w-4 p-0.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10">
      {status === "online" && (
        <span
          className={cn(
            "absolute inset-0.5 inline-flex rounded-full opacity-75",
            "bg-[#00FF85] animate-ping"
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex h-full w-full rounded-full",
          status === "online" 
            ? "bg-[#00FF85] shadow-[0_0_8px_rgba(0,255,133,0.6)]" 
            : "bg-white/40",
          className
        )}
      />
    </span>
  );
}


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
      <span className="relative flex h-3 w-3">
        <span className="relative inline-flex h-3 w-3 rounded-full bg-transparent" />
      </span>
    );
  }

  return (
    <span className="relative flex h-3 w-3">
      {status === "online" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            "bg-green-500 animate-ping"
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex h-3 w-3 rounded-full",
          status === "online" ? "bg-green-500" : "bg-gray-400",
          className
        )}
      />
    </span>
  );
}


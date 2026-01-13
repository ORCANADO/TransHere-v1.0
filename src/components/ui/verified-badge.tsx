import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

export function VerifiedBadge({ size = 20, className }: VerifiedBadgeProps) {
  const checkSize = Math.max(8, size * 0.5);
  const borderWidth = Math.max(1, size * 0.08);

  return (
    <div className={cn("relative inline-flex items-center justify-center flex-shrink-0", className)}>
      {/* Circle with gradient border */}
      <div 
        className="relative rounded-full bg-gradient-to-br from-[#00FF85] to-[#0EA5E9]"
        style={{
          width: size,
          height: size,
          padding: borderWidth,
        }}
      >
        <div className="w-full h-full rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <Check 
            size={checkSize} 
            className="text-white drop-shadow-[0_0_4px_rgba(0,255,133,0.6)] drop-shadow-[0_0_4px_rgba(14,165,233,0.6)]" 
            strokeWidth={3}
          />
        </div>
      </div>
    </div>
  );
}

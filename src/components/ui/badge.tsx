import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-0 px-3 py-1 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-xl",
  {
    variants: {
      variant: {
        default:
          "bg-black/50 text-[#00FF85] shadow-[0_0_15px_rgba(0,255,133,0.3)] hover:bg-black/60 hover:shadow-[0_0_20px_rgba(0,255,133,0.5)]",
        secondary:
          "bg-black/50 text-[#C084FC] shadow-[0_0_15px_rgba(192,132,252,0.3)] hover:bg-black/60 hover:shadow-[0_0_20px_rgba(192,132,252,0.5)]",
        destructive:
          "bg-black/50 text-red-400 shadow-[0_0_15px_rgba(248,113,113,0.3)] hover:bg-black/60 hover:shadow-[0_0_20px_rgba(248,113,113,0.5)]",
        outline: "text-foreground border border-white/20 bg-white/5 hover:bg-white/10",
        glass: "bg-black/40 text-white/90 shadow-[0_0_12px_rgba(255,255,255,0.1)] hover:bg-black/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };


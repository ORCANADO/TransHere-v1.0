import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "border-[#00FF85]/30 bg-[#00FF85]/90 text-black hover:bg-[#00FF85] shadow-[0_0_10px_rgba(0,255,133,0.25)]",
        secondary:
          "border-[#7A27FF]/30 bg-[#7A27FF]/90 text-white hover:bg-[#7A27FF] shadow-[0_0_10px_rgba(122,39,255,0.25)]",
        destructive:
          "border-destructive/30 bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.25)]",
        outline: "text-foreground border-white/20 bg-white/5 hover:bg-white/10",
        glass: "border-white/15 bg-white/10 text-foreground/90 hover:bg-white/20 hover:border-white/25",
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


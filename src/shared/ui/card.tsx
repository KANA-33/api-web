import type { HTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#ddd4ca]/88 bg-[#fffaf4]/78 p-5 text-[#181614] shadow-[0_18px_46px_rgb(74_58_42_/_0.08)] backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

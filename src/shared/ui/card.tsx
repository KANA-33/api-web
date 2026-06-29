import type { HTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "rounded-[2px] border border-[#d8d2d2] bg-[#fbf9f9] p-5 text-[#171717]",
        className,
      )}
      {...props}
    />
  );
}

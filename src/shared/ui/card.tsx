import type { HTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "rounded-lg border border-[#d8cbb8] bg-[#fbf6ee]/78 p-5 shadow-[0_18px_60px_rgb(49_41_31_/_0.08)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

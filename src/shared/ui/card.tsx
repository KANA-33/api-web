import type { HTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "console-panel rounded-xl border border-[#d8cec3]/80 bg-[#fffaf4]/82 p-5 text-[#181614] shadow-[0_18px_42px_rgb(83_66_48_/_0.07),inset_0_1px_0_rgb(255_255_255_/_0.62)] backdrop-blur-md transition-[border-color,background-color,box-shadow,transform] duration-300 ease-out",
        className,
      )}
      {...props}
    />
  );
}

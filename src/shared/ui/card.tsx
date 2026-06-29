import type { HTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "rounded-lg border border-[#b8c0c8] bg-[#f7f8f9]/86 p-5 text-[#202326] shadow-[0_20px_70px_rgb(52_59_66_/_0.11),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-[#211d19] bg-[#211d19] text-[#fffaf3] shadow-[0_12px_28px_rgb(61_47_35_/_0.16)] hover:bg-[#332d27]",
  secondary:
    "border border-[#d7cec6] bg-[#fffdf8] text-[#181614] shadow-[0_8px_22px_rgb(72_56_42_/_0.06)] hover:border-[#c9beb3] hover:bg-[#f2ede7]",
  ghost:
    "border border-transparent text-[#2b2621] hover:border-[#d7cec6] hover:bg-[#eee8e1]",
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[#4a433d]/15 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}

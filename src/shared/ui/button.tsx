import type { ButtonHTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "border border-black bg-black text-white hover:bg-[#303031]",
  secondary: "border border-[#d8d2d2] bg-[#fffdfd] text-[#171717] hover:bg-[#efeded]",
  ghost: "border border-transparent text-[#242121] hover:border-[#d8d2d2] hover:bg-[#efeded]",
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-[2px] px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}

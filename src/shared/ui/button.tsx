import type { ButtonHTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#2f3533] text-[#f8f1e7] hover:bg-[#1f2422]",
  secondary: "border border-[#c9baa4] bg-[#efe5d6] text-[#2d2926] hover:bg-[#e5d8c5]",
  ghost: "text-[#4b4640] hover:bg-[#e8dece]",
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}

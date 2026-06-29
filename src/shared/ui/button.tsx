import type { ButtonHTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#24282d] text-[#f4f6f7] hover:bg-[#121519]",
  secondary: "border border-[#aeb6bf] bg-[#eef1f3] text-[#202326] hover:bg-[#dce1e5]",
  ghost: "text-[#343a40] hover:bg-[#dce1e5]",
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

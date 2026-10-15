'use client';

import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "compact-secondary"
  | "compact-destructive"
  | "compact-accent"
  | "icon-only";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = "",
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    // Base classes
    const baseClasses =
      "inline-flex items-center justify-center font-sans font-semibold rounded-[6px] transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

    // Size variants
    const sizeClasses: Record<ButtonSize, string> = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-xs gap-2",
      lg: "h-10 px-5 text-sm gap-2.5",
    };

    // Style variants
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        "bg-[var(--accent-color,#0A0A0A)] text-[var(--accent-color-foreground,#FFFFFF)] hover:brightness-90 border border-transparent shadow-xs active:scale-[0.98]",
      secondary:
        "bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black border border-[#E8E8E6] shadow-2xs active:scale-[0.98]",
      destructive:
        "bg-red-600 hover:bg-red-700 text-white border border-transparent shadow-xs active:scale-[0.98]",
      outline:
        "bg-transparent hover:bg-zinc-100 text-zinc-800 border border-[#E8E8E6]",
      ghost: "bg-transparent hover:bg-zinc-100 text-zinc-700 hover:text-black",
      "compact-secondary":
        "h-7 px-2.5 text-[11px] font-medium border border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 rounded-[6px]",
      "compact-destructive":
        "h-7 px-2.5 text-[11px] font-medium border border-red-200 hover:bg-red-50/60 text-red-600 hover:text-red-700 rounded-[6px]",
      "compact-accent":
        "h-7 px-2.5 text-[11px] font-medium bg-[var(--accent-color,#0A0A0A)] text-[var(--accent-color-foreground,#FFFFFF)] hover:brightness-90 rounded-[6px]",
      "icon-only":
        "p-2 border border-zinc-200 hover:bg-zinc-50 rounded-[6px] text-zinc-600 hover:text-black shadow-2xs",
    };

    const isCompact = variant.startsWith("compact-");
    const isIconOnly = variant === "icon-only";

    const finalSizeClass = isCompact || isIconOnly ? "" : sizeClasses[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${finalSizeClass} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}

        {children && <span>{children}</span>}

        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

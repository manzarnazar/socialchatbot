import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      className = "",
      containerClassName = "",
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={`space-y-1.5 text-left font-sans ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none flex items-center justify-center shrink-0">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full text-xs h-10 bg-white border border-[#E8E8E6] rounded-lg text-zinc-900 placeholder:text-zinc-400 transition-all focus:outline-none focus:border-black focus-visible:ring-1 focus-visible:ring-black disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed ${
              leftIcon ? "pl-9" : "pl-3"
            } ${rightIcon ? "pr-9" : "pr-3"} ${
              error ? "border-red-500 focus:border-red-600 focus-visible:ring-red-600" : ""
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 flex items-center justify-center shrink-0">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-[11px] font-medium text-red-600">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] font-normal text-zinc-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

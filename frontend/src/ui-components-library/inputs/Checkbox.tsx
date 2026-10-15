import React from "react";
import { Check, Minus } from "lucide-react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  containerClassName?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked = false,
      indeterminate = false,
      onChange,
      label,
      description,
      disabled = false,
      className = "",
      containerClassName = "",
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (onChange) {
        onChange(e.target.checked);
      }
    };

    return (
      <div className={`flex items-start gap-2.5 select-none ${containerClassName}`}>
        <div className="relative flex items-center h-5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only"
            {...props}
          />
          <div
            onClick={() => !disabled && onChange && onChange(!checked)}
            className={`h-4 w-4 rounded border border-[#E8E8E6] flex items-center justify-center cursor-pointer transition-all ${
              checked || indeterminate
                ? "bg-[#0A0A0A] border-[#0A0A0A] text-white"
                : "bg-white hover:border-zinc-400"
            } ${disabled ? "opacity-50 cursor-not-allowed bg-zinc-100" : ""} ${className}`}
          >
            {indeterminate ? (
              <Minus className="h-3 w-3 text-white stroke-[3]" />
            ) : checked ? (
              <Check className="h-3 w-3 text-white stroke-[3]" />
            ) : null}
          </div>
        </div>

        {(label || description) && (
          <label
            htmlFor={checkboxId}
            className="text-left cursor-pointer select-none"
          >
            {label && (
              <span className="text-xs font-semibold text-zinc-900 block">
                {label}
              </span>
            )}
            {description && (
              <span className="text-[11px] font-normal text-zinc-400 block mt-0.5">
                {description}
              </span>
            )}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

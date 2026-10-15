import React from "react";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  label,
  error,
  orientation = "vertical",
  className = "",
}) => {
  return (
    <div className={`space-y-2 text-left font-sans ${className}`}>
      {label && (
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block select-none">
          {label}
        </label>
      )}

      <div
        className={`flex ${
          orientation === "horizontal" ? "flex-row gap-4 flex-wrap" : "flex-col gap-2.5"
        }`}
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <label
              key={option.value}
              className={`flex items-start gap-2.5 cursor-pointer select-none ${
                option.disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <div className="relative flex items-center h-5">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  disabled={option.disabled}
                  onChange={() => !option.disabled && onChange(option.value)}
                  className="sr-only"
                />
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? "border-[#0A0A0A] bg-[#0A0A0A]"
                      : "border-[#E8E8E6] bg-white hover:border-zinc-400"
                  }`}
                >
                  {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-zinc-900 block">
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-[11px] font-normal text-zinc-400 block mt-0.5">
                    {option.description}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {error && <p className="text-[11px] font-medium text-red-600 mt-1">{error}</p>}
    </div>
  );
};

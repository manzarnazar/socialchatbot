import React from "react";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  activeColor?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  activeColor = "bg-primary",
  className = "",
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-start gap-3 select-none ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? activeColor : "bg-zinc-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </button>

      {(label || description) && (
        <div className="text-left cursor-pointer" onClick={handleClick}>
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
        </div>
      )}
    </div>
  );
};

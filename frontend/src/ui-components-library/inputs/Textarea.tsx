import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  maxLength?: number;
  showCharCount?: boolean;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      maxLength,
      showCharCount = false,
      className = "",
      containerClassName = "",
      disabled,
      value,
      defaultValue,
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    const [currentLength, setCurrentLength] = React.useState<number>(
      typeof value === "string"
        ? value.length
        : typeof defaultValue === "string"
        ? defaultValue.length
        : 0
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCurrentLength(e.target.value.length);
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className={`space-y-1.5 text-left font-sans ${containerClassName}`}>
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={textareaId}
              className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block select-none"
            >
              {label}
            </label>
            {showCharCount && maxLength && (
              <span className="text-[11px] font-mono text-zinc-400">
                {currentLength} / {maxLength}
              </span>
            )}
          </div>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          className={`w-full min-h-[80px] resize-y border border-[#E8E8E6] bg-white rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 p-3 transition-all focus:outline-none focus:border-black focus-visible:ring-1 focus-visible:ring-black disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed ${
            error ? "border-red-500 focus:border-red-600 focus-visible:ring-red-600" : ""
          } ${className}`}
          {...props}
        />

        {error ? (
          <p className="text-[11px] font-medium text-red-600">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] font-normal text-zinc-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

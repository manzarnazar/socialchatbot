import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface DropdownSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  label,
  searchable = false,
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`space-y-1.5 text-left font-sans ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block select-none">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-9 flex items-center justify-between px-3 rounded-[6px] border border-[#E8E8E6] bg-white text-xs text-zinc-900 font-semibold cursor-pointer outline-none transition-all shadow-2xs ${
            isOpen ? "border-black ring-1 ring-black" : "hover:border-zinc-400"
          } ${disabled ? "bg-zinc-100 opacity-50 cursor-not-allowed" : ""}`}
        >
          <span className={`truncate ${!selectedOption ? "text-zinc-400 font-normal" : ""}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180 text-black" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 z-50 mt-1 min-w-full bg-white border border-[#E8E8E6] rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 py-1">
            {searchable && (
              <div className="p-2 border-b border-[#E8E8E6]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter options..."
                    className="w-full text-xs h-7 pl-8 pr-2 bg-zinc-50 border border-zinc-200 rounded-[4px] focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-zinc-400 text-center">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchQuery("");
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left cursor-pointer transition-colors ${
                      opt.value === value
                        ? "bg-zinc-50 text-black font-semibold"
                        : "text-zinc-700 hover:bg-zinc-50/80 hover:text-black"
                    } ${opt.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div>
                      <span className="block">{opt.label}</span>
                      {opt.description && (
                        <span className="text-[10px] text-zinc-400 block font-normal">
                          {opt.description}
                        </span>
                      )}
                    </div>
                    {opt.value === value && (
                      <Check className="h-3.5 w-3.5 text-black shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

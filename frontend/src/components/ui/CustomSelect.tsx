'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  disabled = false,
  className = ''
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-left ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 px-3 bg-white border border-[#E8E8E6] hover:border-zinc-300 rounded-[6px] text-xs font-semibold text-zinc-700 flex items-center justify-between transition-all outline-none shadow-2xs cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-[#E8E8E6] rounded-[6px] shadow-lg z-50 animate-modal-entry py-1">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-zinc-400 font-medium">No options available</div>
          ) : (
            options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs font-semibold hover:bg-zinc-50 transition-all flex items-center justify-between cursor-pointer ${
                  opt.value === value ? 'bg-zinc-50/80 text-zinc-950 font-black' : 'text-zinc-600'
                }`}
              >
                <span>{opt.label}</span>
                {opt.value === value && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

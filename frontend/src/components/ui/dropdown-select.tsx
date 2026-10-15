'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: string;
}

interface DropdownSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < 240 && spaceAbove > 240;

      setCoords({
        top: openUp ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        openUpward: openUp,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();

      const handleScrollOrResize = () => {
        updatePosition();
      };

      const handleOutsideClick = (event: MouseEvent) => {
        if (
          buttonRef.current &&
          !buttonRef.current.contains(event.target as Node) &&
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
      };

      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, updatePosition]);

  const hasWidth = className.split(' ').some(c => c.startsWith('w-'));

  return (
    <div className={`relative select-none font-sans ${hasWidth ? '' : 'w-full'} ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full h-9 flex items-center justify-between px-3 rounded-[6px] border border-[#E8E8E6] bg-white text-xs text-zinc-950 font-medium cursor-pointer outline-none focus:border-zinc-950 shadow-3xs transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed bg-[#FAFAFA]' : ''
        }`}
      >
        <div className="flex items-center gap-2 text-left min-w-0 flex-1 truncate">
          {selectedOption?.icon && <span className="shrink-0 flex items-center">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 shrink-0 ml-1.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-zinc-800' : ''}`} />
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            top: coords.openUpward ? undefined : `${coords.top}px`,
            bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : undefined,
            zIndex: 99999,
          }}
          className="bg-white border border-[#E8E8E6] rounded-[8px] shadow-xl max-h-60 overflow-y-auto animate-fade-in"
        >
          <div className="py-1">
            {options.map((option) => {
              const isActive = option.value === value;
              const isDisabled = option.disabled;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed bg-zinc-50/40 text-zinc-400 select-none'
                      : isActive 
                        ? 'bg-zinc-50 text-black font-semibold cursor-pointer' 
                        : 'text-zinc-650 hover:bg-zinc-50/80 hover:text-black font-medium cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                    {option.icon && <span className="shrink-0 flex items-center">{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                    {option.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-400 border border-zinc-200/80 uppercase tracking-wider ml-auto shrink-0">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  {isActive && !isDisabled && <Check className="h-3.5 w-3.5 text-black shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

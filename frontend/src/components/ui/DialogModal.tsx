'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';

export interface DialogActionProps {
  label: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  variant?: 'default' | 'danger' | 'primary';
}

export interface DialogModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  iconBoxClassName?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  asForm?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  leftFooterAction?: React.ReactNode;
  primaryAction?: DialogActionProps;
  secondaryAction?: {
    label?: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export const DialogModal: React.FC<DialogModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconBoxClassName = '',
  maxWidth = 'md',
  children,
  footer,
  className = '',
  bodyClassName = '',
  asForm = false,
  onSubmit,
  closeOnBackdrop = true,
  closeOnEsc = true,
  leftFooterAction,
  primaryAction,
  secondaryAction,
}) => {
  useEffect(() => {
    if (!closeOnEsc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, closeOnEsc]);

  if (!isOpen || typeof document === 'undefined') return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-[95vw] md:max-w-6xl',
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  const ContentWrapper = asForm ? 'form' : 'div';

  const modalContent = (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-backdrop-fade select-none"
    >
      <ContentWrapper
        {...(asForm && onSubmit ? { onSubmit } : {})}
        className={`bg-white border border-[#E8E8E6] rounded-xl ${maxWidthClasses[maxWidth]} w-full p-6 shadow-xl relative z-50 animate-modal-entry text-left font-sans ${className}`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header Section (Connected End-to-End Divider) */}
        {(title || icon) && (
          <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
            <div className="flex items-center gap-2.5 min-w-0 pr-3">
              {icon && (
                <div
                  className={`h-7 w-7 rounded p-1 flex items-center justify-center shrink-0 ${iconBoxClassName || 'bg-[#FAFAFA] border border-[#E8E8E6] text-zinc-700'}`}
                >
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <div className="text-[10px] text-zinc-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Dialog Body Section */}
        <div className={`space-y-4 pt-4 ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer Action Strip (Connected End-to-End Divider with Off-White Fill) */}
        {(footer || primaryAction || secondaryAction || leftFooterAction) && (
          <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-between select-none font-bold">
            <div>
              {leftFooterAction || <div />}
            </div>
            <div className="flex items-center gap-3">
              {footer ? (
                footer
              ) : (
                <>
                  {secondaryAction && (
                    <button
                      type="button"
                      onClick={secondaryAction.onClick}
                      disabled={secondaryAction.disabled}
                      className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {secondaryAction.label || 'Cancel'}
                    </button>
                  )}
                  {primaryAction && (
                    <button
                      type={primaryAction.type || (asForm ? 'submit' : 'button')}
                      onClick={primaryAction.onClick}
                      disabled={primaryAction.disabled || primaryAction.loading}
                      className={`h-9 px-4 font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        primaryAction.variant === 'danger'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-[#0A0A0A] hover:bg-zinc-900 text-white'
                      }`}
                    >
                      {primaryAction.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>{primaryAction.label}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </ContentWrapper>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DialogModal;

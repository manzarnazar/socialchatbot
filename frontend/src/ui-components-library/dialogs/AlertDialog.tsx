'use client';

import React from "react";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Dialog } from "./Dialog";
import { Button } from "../buttons/Button";

export type AlertType = "danger" | "warning" | "info" | "success";

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: AlertType;
  isLoading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  iconBoxClassName?: string;
  icon?: React.ReactNode;
  confirmVariant?: "primary" | "destructive";
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  type = "danger",
  isLoading = false,
  maxWidth = "sm",
  iconBoxClassName,
  icon,
  confirmVariant,
}: AlertDialogProps) => {
  const typeConfig: Record<
    AlertType,
    { icon: React.ReactNode; iconBoxClassName: string; confirmVariant: "destructive" | "primary" }
  > = {
    danger: {
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      iconBoxClassName: "bg-rose-50 border border-rose-200",
      confirmVariant: "destructive",
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      iconBoxClassName: "bg-amber-50 border border-amber-200",
      confirmVariant: "primary",
    },
    info: {
      icon: <Info className="h-4 w-4 text-blue-500" />,
      iconBoxClassName: "bg-blue-50 border border-blue-200",
      confirmVariant: "primary",
    },
    success: {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      iconBoxClassName: "bg-emerald-50 border border-emerald-200",
      confirmVariant: "primary",
    },
  };

  const selectedType: AlertType = type && type in typeConfig ? type : "danger";
  const config = typeConfig[selectedType];
  const finalConfirmVariant = confirmVariant || config.confirmVariant;
  const finalIcon = icon !== undefined ? icon : config.icon;
  const finalIconBoxClassName = iconBoxClassName || config.iconBoxClassName;

  const footerActions = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={isLoading}>
        {cancelLabel}
      </Button>
      <Button
        variant={finalConfirmVariant}
        onClick={onConfirm}
        isLoading={isLoading}
      >
        {confirmLabel}
      </Button>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={finalIcon}
      iconBoxClassName={finalIconBoxClassName}
      footer={footerActions}
      maxWidth={maxWidth}
    >
      <div className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
        {description}
      </div>
    </Dialog>
  );
};

'use client';

import React from 'react';
import { DialogModal, DialogModalProps } from '@/components/ui/DialogModal';

export interface DialogProps extends DialogModalProps {
  description?: string;
}

export const Dialog: React.FC<DialogProps> = ({ description, subtitle, ...props }) => {
  return <DialogModal subtitle={subtitle || description} {...props} />;
};

export default Dialog;

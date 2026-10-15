import { create } from 'zustand';
import React from 'react';

interface HeaderStore {
  customHeader: React.ReactNode | null;
  setCustomHeader: (header: React.ReactNode | null) => void;
}

export const useHeaderStore = create<HeaderStore>((set) => ({
  customHeader: null,
  setCustomHeader: (customHeader) => set({ customHeader }),
}));

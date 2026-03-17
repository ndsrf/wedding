/**
 * Wedding Access Context
 *
 * Provides context for wedding access control including disabled and deleted states.
 * Used by admin pages to determine if the wedding is disabled or deleted,
 * and to enable read-only mode when disabled.
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';

export interface WeddingAccessContextType {
  isDisabled: boolean;
  isDeleted: boolean;
  isReadOnly: boolean; // Convenience flag: true when disabled
  coupleNames: string;
}

const defaultContext: WeddingAccessContextType = {
  isDisabled: false,
  isDeleted: false,
  isReadOnly: false,
  coupleNames: '',
};

export const WeddingAccessContext = createContext<WeddingAccessContextType>(defaultContext);

export function useWeddingAccess(): WeddingAccessContextType {
  const context = useContext(WeddingAccessContext);
  if (!context) {
    return defaultContext;
  }
  return context;
}

interface WeddingAccessProviderProps {
  children: ReactNode;
  isDisabled: boolean;
  isDeleted: boolean;
  coupleNames: string;
}

export function WeddingAccessProvider({
  children,
  isDisabled,
  isDeleted,
  coupleNames,
}: WeddingAccessProviderProps) {
  const value: WeddingAccessContextType = {
    isDisabled,
    isDeleted,
    isReadOnly: isDisabled, // Disabled means read-only
    coupleNames,
  };

  return (
    <WeddingAccessContext.Provider value={value}>
      {children}
    </WeddingAccessContext.Provider>
  );
}

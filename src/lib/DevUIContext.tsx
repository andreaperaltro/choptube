'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { isDevUI, setDevUI } from './flags';

interface DevUIContextType {
  isDevUI: boolean;
  setDevUI: (on: boolean) => void;
  toggleDevUI: () => void;
}

const DevUIContext = createContext<DevUIContextType | undefined>(undefined);

export function DevUIProvider({ children }: { children: React.ReactNode }) {
  const [devUI, setDevUIState] = useState(false);

  useEffect(() => {
    // Check dev UI state on mount
    setDevUIState(isDevUI());
  }, []);

  const handleSetDevUI = (on: boolean) => {
    setDevUI(on);
    setDevUIState(on);
  };

  const toggleDevUI = () => {
    const newState = !devUI;
    handleSetDevUI(newState);
    return newState;
  };

  return (
    <DevUIContext.Provider value={{
      isDevUI: devUI,
      setDevUI: handleSetDevUI,
      toggleDevUI
    }}>
      {children}
    </DevUIContext.Provider>
  );
}

export function useDevUI() {
  const context = useContext(DevUIContext);
  if (context === undefined) {
    throw new Error('useDevUI must be used within a DevUIProvider');
  }
  return context;
}

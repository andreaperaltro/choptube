import { useState, useEffect } from 'react';

/**
 * Hook to handle hydration state
 * Prevents SSR/client hydration mismatches by only rendering dynamic content after hydration
 * 
 * @returns boolean indicating if the component has been hydrated on the client
 */
export function useHydration(): boolean {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

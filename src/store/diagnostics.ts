/**
 * Diagnostics Store
 * Dev-only store for tracking preload performance metrics
 */

import { create } from 'zustand';

/**
 * Per-track diagnostic metrics
 */
export interface TrackDiagnostics {
  trackId: string;
  lastPrerollTime: number | null;
  loadedFraction: number;
  lastPlayLatency: number | null; // ms between trigger and playing state
  lastPreloadAttempt: {
    timestamp: number;
    success: boolean;
    loadedFraction: number;
    error?: string;
  } | null;
}

/**
 * Diagnostics store state
 */
interface DiagnosticsState {
  isEnabled: boolean;
  trackMetrics: Map<string, TrackDiagnostics>;
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  updateTrackMetrics: (trackId: string, updates: Partial<TrackDiagnostics>) => void;
  recordPreloadAttempt: (trackId: string, success: boolean, loadedFraction: number, error?: string) => void;
  recordPlayLatency: (trackId: string, latencyMs: number) => void;
  clearMetrics: () => void;
  getTrackMetrics: (trackId: string) => TrackDiagnostics | null;
  getAllMetrics: () => TrackDiagnostics[];
}

/**
 * Diagnostics store for dev-only preload performance tracking
 */
export const useDiagnosticsStore = create<DiagnosticsState>((set, get) => ({
  isEnabled: false,
  trackMetrics: new Map(),

  setEnabled: (enabled: boolean) => {
    set({ isEnabled: enabled });
    if (!enabled) {
      // Clear metrics when disabling
      set({ trackMetrics: new Map() });
    }
  },

  updateTrackMetrics: (trackId: string, updates: Partial<TrackDiagnostics>) => {
    set((state) => {
      const newMetrics = new Map(state.trackMetrics);
      const existing = newMetrics.get(trackId) || {
        trackId,
        lastPrerollTime: null,
        loadedFraction: 0,
        lastPlayLatency: null,
        lastPreloadAttempt: null,
      };
      
      newMetrics.set(trackId, { ...existing, ...updates });
      return { trackMetrics: newMetrics };
    });
  },

  recordPreloadAttempt: (trackId: string, success: boolean, loadedFraction: number, error?: string) => {
    const attempt = {
      timestamp: Date.now(),
      success,
      loadedFraction,
      error,
    };

    set((state) => {
      const newMetrics = new Map(state.trackMetrics);
      const existing = newMetrics.get(trackId) || {
        trackId,
        lastPrerollTime: null,
        loadedFraction: 0,
        lastPlayLatency: null,
        lastPreloadAttempt: null,
      };
      
      newMetrics.set(trackId, {
        ...existing,
        lastPreloadAttempt: attempt,
        loadedFraction,
        lastPrerollTime: success ? Date.now() : existing.lastPrerollTime,
      });
      
      return { trackMetrics: newMetrics };
    });

    // Compact logging
    const status = success ? '✅' : '❌';
    const errorMsg = error ? ` (${error})` : '';
    console.log(`🎵 Preload ${status} ${trackId}: ${(loadedFraction * 100).toFixed(1)}% loaded${errorMsg}`);
  },

  recordPlayLatency: (trackId: string, latencyMs: number) => {
    set((state) => {
      const newMetrics = new Map(state.trackMetrics);
      const existing = newMetrics.get(trackId);
      if (existing) {
        newMetrics.set(trackId, {
          ...existing,
          lastPlayLatency: latencyMs,
        });
      }
      return { trackMetrics: newMetrics };
    });
  },

  clearMetrics: () => {
    set({ trackMetrics: new Map() });
  },

  getTrackMetrics: (trackId: string) => {
    return get().trackMetrics.get(trackId) || null;
  },

  getAllMetrics: () => {
    return Array.from(get().trackMetrics.values());
  },
}));

/**
 * Check if diagnostics should be enabled (dev mode)
 */
export const isDiagnosticsEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Enable via query param: ?dev=true
  const urlParams = new URLSearchParams(window.location.search);
  const devParam = urlParams.get('dev');
  
  // Enable via localStorage: choptube-dev-diagnostics
  const localStorageEnabled = localStorage.getItem('choptube-dev-diagnostics') === 'true';
  
  return devParam === 'true' || localStorageEnabled;
};
